import net from 'net';

export class NynoClient {
  constructor(
    credentials,
    host = '127.0.0.1',
    port = 9024,
    maxRetries = 3,
    retryDelay = 200
  ) {
    this.credentials = { apiKey: credentials };
    this.host = host;
    this.port = port;
    this.socket = null;
    this.buffer = '';
    this.lineResolvers = [];
    this.maxRetries = maxRetries;
    this.retryDelay = retryDelay;
    this.connect();
  }

  static async create(
    credentials,
    host = '127.0.0.1',
    port = 9024,
    maxRetries = 3,
    retryDelay = 200
  ) {
    const client = new NynoClient(credentials, host, port, maxRetries, retryDelay);
    await client.connect();
    return client;
  }

  connect() {
    return new Promise((resolve, reject) => {
      this.close();
      this.socket = net.createConnection({ host: this.host, port: this.port }, () => {
        this.socket.setEncoding("utf8");
        const msg = "c" + JSON.stringify(this.credentials) + "\n";
        this.socket.write(msg);
      });

      this.socket.on("data", (chunk) => {
        this.buffer += chunk;

        while (this.buffer.includes("\n")) {
          const idx = this.buffer.indexOf("\n");
          const line = this.buffer.slice(0, idx);
          this.buffer = this.buffer.slice(idx + 1);

          if (this.lineResolvers.length > 0) {
            const resolveFn = this.lineResolvers.shift();
            resolveFn(line);
          } else {
            try {
              const res = JSON.parse(line);
              if (res.status) resolve(res);
              else reject(new Error(`Nyno authentication failed: ${line}`));
            } catch (e) {
              reject(e);
            }
          }
        }
      });

      this.socket.on("error", (err) => {
        this.rejectAllPending(err);
        reject(err);
      });

      this.socket.on("end", () => {
        const err = new Error("Socket ended");
        this.rejectAllPending(err);
        reject(err);
      });
    });
  }

  rejectAllPending(err) {
    while (this.lineResolvers.length) {
      const r = this.lineResolvers.shift();
      r(Promise.reject(err));
    }
  }

  async sendRequest(prefix, payload) {
    let attempts = 0;

    while (true) {
      try {
        await this.ensureConnected();
        const msg = prefix + JSON.stringify(payload) + "\n";
        await this._write(msg);
        const line = await this._readLine();
        return JSON.parse(line);
      } catch (err) {
        attempts++;
        if (attempts > this.maxRetries) {
          throw new Error(`Nyno request failed after ${this.maxRetries} retries: ${err.message}`);
        }

        console.error(`Nyno connection lost, retrying (#${attempts})...`);
        await this._sleep(this.retryDelay);
        this.retryDelay *= 2;

        try {
          await this.connect();
        } catch (ce) {
          console.error(`Reconnect attempt failed: ${ce.message}`);
        }
      }
    }
  }

  async runWorkflow(path, data = {}) {
    return this.sendRequest('q', { path, ...data });
  }

  async runNyno(yamlContent, context = {}) {
    return this.sendRequest('q', { path:"/run-nyno", yamlContent, context });
  }

  async ensureConnected() {
    if (!this.socket || this.socket.destroyed) {
      await this.connect();
    }
  }

  _write(msg) {
    return new Promise((resolve, reject) => {
      this.socket.write(msg, "utf8", (err) => (err ? reject(err) : resolve()));
    });
  }

  _readLine() {
    return new Promise((resolve, reject) => {
      this.lineResolvers.push(resolve);
    });
  }

  _sleep(ms) {
    return new Promise((r) => setTimeout(r, ms));
  }

  close() {
    if (this.socket) {
      try {
        this.socket.destroy();
      } catch (_) {}
      this.socket = null;
    }
  }
}

