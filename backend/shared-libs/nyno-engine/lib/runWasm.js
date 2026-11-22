
import net from 'node:net';
import { encode, decode } from '@msgpack/msgpack';

// ============================================================
// Singleton client (reset on failure so next call retries)
// ============================================================

let clientPromise = null;

async function getClient() {
  if (!clientPromise) {
    const config = {
      host: process.env.WASM_HOST ?? process.env.HOST ?? '127.0.0.1',
      port: Number(
        process.env.NYNO_WASM_PORT ??
        9097
      ),
      secret: process.env.SECRET_NYNO_API_KEY ?? 'changeme',
    };

    console.log('js wasmrunner config', {
      host: config.host,
      port: config.port,
    });

    clientPromise = WasmRunnerClient.create(config).catch(err => {
      clientPromise = null;
      throw err;
    });
  }

  return clientPromise;
}

// ============================================================
// Public helpers — same signatures as Python client
// ============================================================

// Returns the instance function (not the result)
export async function loadWasm(fnName) {
  return async (args, context = {}) => {
    const client = await getClient();

    // Preserve original Python runner behavior
    if (context.SYSTEM) {
      delete context.SYSTEM;
    }

    console.log('wasm client run', fnName, args, context);

    const ret = await client.run(fnName, args, context);

    console.log('wasm client ret', ret);

    return ret;
  };
}

// Runs instance(args, context) and returns [result, context]
export async function runWasm(instance, args, context) {
  try {
    const res = await instance(args, context);

    console.log('runWasm res', res);

    return [res.r, res.c];

  } catch (err) {
    console.error('error in runWasm dynamic func:', err);

    return [null, null];
  }
}

// ============================================================
// Client class
// ============================================================

const INIT = Symbol('init');

export default class WasmRunnerClient {
  constructor(opts = {}, token) {
    if (token !== INIT) {
      throw new Error('Use WasmRunnerClient.create()');
    }

    this.host = opts.host;
    this.port = Number(opts.port);
    this.secret = opts.secret;

    this.maxRetries = opts.maxRetries ?? 3;
    this.retryDelay = opts.retryDelay ?? 1000;
    this.timeoutMs = opts.timeoutMs ?? 120000;

    this.socket = null;
    this.buffer = Buffer.alloc(0);

    this.nextId = 1;
    this.pending = new Map();

    this.authenticated = false;
    this.connected = false;
  }

  get queueCount() {
    return this.pending.size;
  }

  static async create(opts = {}) {
    const client = new WasmRunnerClient(opts, INIT);

    await client._connectWithRetry();

    return client;
  }

  // ==========================================================
  // Public API
  // ==========================================================

  async run(functionName, args = [], context = {}) {
    const res = await this._sendWithRetry('r', {
      functionName,
      args,
      context,
    });

    if (res.status === 'ERR') {
      throw new Error(res.error || 'WASM runner error');
    }

    if (res.fnError) {
      throw new Error(
        `WASM function '${functionName}' does not exist`
      );
    }

    return res;
  }

  async remoteQueueCount() {
    const res = await this._sendWithRetry('q', {});

    return res.count ?? 0;
  }

  async ping(data = {}) {
    return this._sendWithRetry('ping', data);
  }

  async info() {
    return this._sendWithRetry('info', {});
  }

  async echo(data = {}) {
    return this._sendWithRetry('echo', data);
  }

  close() {
    this._disconnect();
  }

  // ==========================================================
  // Retry wrappers
  // ==========================================================

  async _connectWithRetry() {
    let lastErr;

    for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
      try {
        await this._connect();
        return;

      } catch (err) {
        lastErr = err;

        this._disconnect();

        if (attempt < this.maxRetries) {
          await this._sleep(this.retryDelay * attempt);
        }
      }
    }

    throw lastErr;
  }

  async _sendWithRetry(type, data) {
    let lastErr;

    for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
      try {
        if (!this.authenticated || !this.connected) {
          await this._connect();
        }

        return await this._send(type, data);

      } catch (err) {
        lastErr = err;

        const isConnErr =
          err.isConnectionError ||
          /closed|not connected|ECONNRESET|EPIPE|ECONNREFUSED|timed out/i
            .test(err.message);

        if (isConnErr && attempt < this.maxRetries) {
          this._disconnect();

          await this._sleep(this.retryDelay * attempt);
          continue;
        }

        throw err;
      }
    }

    throw lastErr;
  }

  _sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // ==========================================================
  // Connection
  // ==========================================================

  async _connect() {
    if (
      this.connected &&
      this.authenticated &&
      this.socket &&
      !this.socket.destroyed
    ) {
      return;
    }

    await new Promise((resolve, reject) => {
      const sock = net.createConnection({
        host: this.host,
        port: this.port,
      });

      sock.setNoDelay(true);

      let settled = false;

      sock.once('error', err => {
        if (!settled) {
          settled = true;

          reject(
            Object.assign(err, {
              isConnectionError: true,
            })
          );
        }
      });

      sock.once('connect', () => {
        this.socket = sock;
        this.connected = true;
        this.buffer = Buffer.alloc(0);

        sock.on('data', chunk => this._onData(chunk));

        sock.on('error', err => this._onDead(err));

        sock.on('close', () => this._onDead());

        settled = true;
        resolve();
      });
    });

    // Authentication: type "c" with { secret }
    const res = await this._send('c', {
      secret: this.secret,
    });

    if (res?.ok) {
      this.authenticated = true;
    } else {
      const err = new Error(
        'WASM auth failed: ' +
        (res?.error || JSON.stringify(res))
      );

      err.retryable = false;

      throw err;
    }
  }

  // ==========================================================
  // Disconnect / cleanup
  // ==========================================================

  _disconnect() {
    this.connected = false;
    this.authenticated = false;

    if (this.socket) {
      this.socket.destroy();
      this.socket = null;
    }

    for (const [, p] of this.pending) {
      clearTimeout(p.timer);

      p.reject(
        Object.assign(
          new Error('disconnected'),
          { isConnectionError: true }
        )
      );
    }

    this.pending.clear();
    this.buffer = Buffer.alloc(0);
  }

  _onDead(err) {
    if (this.socket) {
      this.socket.destroy();
      this.socket = null;
    }

    this.connected = false;
    this.authenticated = false;

    const e = err || new Error('connection lost');

    e.isConnectionError = true;

    for (const [, p] of this.pending) {
      clearTimeout(p.timer);
      p.reject(e);
    }

    this.pending.clear();
  }

  // ==========================================================
  // TCP framing:
  // 4-byte BE length + MessagePack
  // ==========================================================

  _onData(chunk) {
    this.buffer = Buffer.concat([
      this.buffer,
      chunk,
    ]);

    while (this.buffer.length >= 4) {
      const length = this.buffer.readUInt32BE(0);

      if (this.buffer.length < 4 + length) {
        break;
      }

      const msgBuf = this.buffer.subarray(4, 4 + length);

      this.buffer = this.buffer.subarray(4 + length);

      try {
        this._handleMessage(decode(msgBuf));

      } catch (err) {
        console.error('WASM decode error:', err);
      }
    }
  }

  _handleMessage(msg) {

      console.log('[WasmRunnerClient] _handleMessage',JSON.stringify(msg));

    // Rust server sends [msgId, result]
    if (!Array.isArray(msg) || msg.length !== 2) {
      return;
    }

    const [id, result] = msg;

    const entry = this.pending.get(id);

    if (entry) {
      this.pending.delete(id);

      clearTimeout(entry.timer);

      entry.resolve(result);
    }
  }

  // ==========================================================
  // Send [msgId, [type, data]]
  // Receive [msgId, result]
  // ==========================================================

  _send(type, data) {
    return new Promise((resolve, reject) => {
      const sock = this.socket;

      if (
        !sock ||
        sock.destroyed ||
        !this.connected
      ) {
        const err = new Error('not connected');

        err.isConnectionError = true;

        return reject(err);
      }

      const id = this.nextId++;

      const dataToSend = [
        id,
        [type, data],
      ];
      console.log('[WasmRunnerClient] preparing data to send',JSON.stringify(dataToSend));

      const body = encode(dataToSend);

      const header = Buffer.alloc(4);

      header.writeUInt32BE(body.length, 0);

      const frame = Buffer.concat([
        header,
        body,
      ]);

      const timer = setTimeout(() => {
        this.pending.delete(id);

        const err = new Error('request timed out');

        err.isConnectionError = true;

        reject(err);

      }, this.timeoutMs);

      this.pending.set(id, {
        resolve,
        reject,
        timer,
      });

      sock.write(frame, err => {
        if (err) {
          this.pending.delete(id);

          clearTimeout(timer);

          err.isConnectionError = true;

          reject(err);
        }
      });
    });
  }
}
