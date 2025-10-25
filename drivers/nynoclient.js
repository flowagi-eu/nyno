import net from 'net';

export class NynoClient {
  constructor({
    credentials,
    host = '127.0.0.1',
    port = 6001,
    maxRetries = 3,
    retryDelay = 200
  }) {
    this.credentials = credentials;
    this.host = host;
    this.port = port;
    this.socket = null;
    this.buffer = '';
    this.maxRetries = maxRetries;
    this.retryDelay = retryDelay;
    this.connect();
  }

  connect() {
    return new Promise((resolve, reject) => {
      this.close();
      this.socket = net.createConnection({ host: this.host, port: this.port }, () => {
        this.socket.setEncoding('utf8');
        const msg = 'c' + JSON.stringify(this.credentials) + '\n';
        this.socket.write(msg);
      });

      this.socket.on('data', (chunk) => {
        this.buffer += chunk;
        if (this.buffer.includes('\n')) {
          const line = this.buffer.split('\n')[0];
          this.buffer = this.buffer.slice(line.length + 1);
          try {
            const res = JSON.parse(line);
            if (res.status) resolve(res);
            else reject(new Error(`Nyno authentication failed: ${line}`));
          } catch (e) {
            reject(e);
          }
        }
      });

      this.socket.on('error', reject);
      this.socket.on('end', () => reject(new Error('Socket ended')));
    });
  }

  async runWorkflow(path, data = {}) {
    let attempts = 0;

    while (true) {
      try {
        await this.ensureConnected();

        const payload = { path, ...data };
        const msg = 'q' + JSON.stringify(payload) + '\n';
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

  async ensureConnected() {
    if (!this.socket || this.socket.destroyed) {
      await this.connect();
    }
  }

  _write(msg) {
    return new Promise((resolve, reject) => {
      this.socket.write(msg, 'utf8', (err) => (err ? reject(err) : resolve()));
    });
  }

  _readLine() {
    return new Promise((resolve, reject) => {
      const onData = (chunk) => {
        this.buffer += chunk;
        if (this.buffer.includes('\n')) {
          const line = this.buffer.split('\n')[0];
          this.buffer = this.buffer.slice(line.length + 1);
          this.socket.removeListener('data', onData);
          resolve(line);
        }
      };
      this.socket.on('data', onData);
      this.socket.once('error', reject);
      this.socket.once('end', () => reject(new Error('Socket ended')));
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

