// python-runner-client.mjs
// npm install @msgpack/msgpack

import net from 'node:net';
import { encode, decode } from '@msgpack/msgpack';

// ============================================================
//  Singleton client (reset on failure so next call retries)
// ============================================================
let clientPromise = null;

async function getClient() {
  if (!clientPromise) {
    const config = {
      host: process.env.HOST ?? '0.0.0.0',
      port: Number(process.env.NYNO_PYTHON_PORT ?? 9098),
      secret: process.env.SECRET_NYNO_API_KEY ?? 'changeme',
    };
    console.log('js pythonrunner config',JSON.stringify({config}));
    clientPromise = await PythonRunnerClient.create(config);
  }
  return clientPromise;
}

// ============================================================
//  Public helpers — same signatures as before
// ============================================================

// Returns the "instance" function (not the result)
export async function loadPython(fnName) {
  return async (args, context) => {
    const client = await getClient();
    if(context.SYSTEM) {
      delete context.SYSTEM;
    }
    console.log('client fnName args', client,fnName,args,context);
    const ret = await client.run(fnName, args, context); // → { status: 'OK', r, c }
    console.log('client ret', ret);
    return ret;

  };
}

// Runs instance(args, context) and returns [result, context]
export async function runPython(instance, args, context) {
  try {
  const res = await instance(args, context);
  console.log('runPython res',res);
  return [res.r, res.c];
  } catch(err) {
    console.log('error in runPython dynamic func',err);
    return [null,null];
  }
}

// ============================================================
//  Client class
// ============================================================
const INIT = Symbol('init');

export default class PythonRunnerClient {
  constructor(opts = {}, token) {
    if (token !== INIT) throw new Error('Use PythonRunnerClient.create()');
    this.host = opts.host;
    this.port = Number(opts.port);
    this.secret = opts.secret;
    this.maxRetries = opts.maxRetries ?? 3;
    this.retryDelay = opts.retryDelay ?? 1000; // ms, multiplied by attempt number
    this.timeoutMs = opts.timeoutMs ?? 30000;

    this.socket = null;
    this.buffer = Buffer.alloc(0);
    this.nextId = 1;
    this.pending = new Map(); // msgId → { resolve, reject, timer }
    this.authenticated = false;
    this.connected = false;
  }

  get queueCount() {
    return this.pending.size;
  }

  static async create(opts = {}) {
    const client = new PythonRunnerClient(opts, INIT);
    await client._connectWithRetry();
    return client;
  }

  // ---- public API ----

  async run(functionName, args = [], context = {}) {
    const res = await this._sendWithRetry('r', { functionName, args, context });
    if (res.status === 'ERR') throw new Error(res.error || 'remote error');
    if (res.fnError) throw new Error(`function '${functionName}' does not exist`);
    return res;
  }

  async remoteQueueCount() {
    const res = await this._sendWithRetry('q', {});
    return res.count ?? 0;
  }

  close() {
    this._disconnect();
  }

  // ---- retry wrappers ----

  async _connectWithRetry() {
    let lastErr;
    for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
      try {
        await this._connect();
        return;
      } catch (err) {
        lastErr = err;
        this._disconnect();
        if (attempt < this.maxRetries) await this._sleep(this.retryDelay * attempt);
      }
    }
    throw lastErr;
  }

  async _sendWithRetry(type, data) {
    let lastErr;
    for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
      try {
        if (!this.authenticated || !this.connected) await this._connect();
        return await this._send(type, data);
      } catch (err) {
        lastErr = err;
        const isConnErr =
          err.isConnectionError ||
          /closed|not connected|ECONNRESET|EPIPE|ECONNREFUSED|timed out/i.test(err.message);
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
    return new Promise((r) => setTimeout(r, ms));
  }

  // ---- connection ----

  async _connect() {
    if (this.connected && this.authenticated && this.socket && !this.socket.destroyed) return;

    await new Promise((resolve, reject) => {
      const sock = net.createConnection({ host: this.host, port: this.port });
      sock.setNoDelay(true);
      let settled = false;

      sock.once('error', (err) => {
        if (!settled) {
          settled = true;
          reject(Object.assign(err, { isConnectionError: true }));
        }
      });

      sock.once('connect', () => {
        this.socket = sock;
        this.connected = true;
        this.buffer = Buffer.alloc(0);

        sock.on('data', (chunk) => this._onData(chunk));
        sock.on('error', (err) => this._onDead(err));
        sock.on('close', () => this._onDead());

        settled = true;
        resolve();
      });
    });

    // Auth: type "c" with { secret }
    const res = await this._send('c', { secret: this.secret });
    if (res && res.ok) {
      this.authenticated = true;
    } else {
      const err = new Error('auth failed: ' + (res?.error || JSON.stringify(res)));
      err.retryable = false;
      throw err;
    }
  }

  _disconnect() {
    this.connected = false;
    this.authenticated = false;
    if (this.socket) {
      this.socket.destroy();
      this.socket = null;
    }
    for (const [, p] of this.pending) {
      clearTimeout(p.timer);
      p.reject(Object.assign(new Error('disconnected'), { isConnectionError: true }));
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

  // ---- framing: 4-byte BE length + msgpack ----

  _onData(chunk) {
    this.buffer = Buffer.concat([this.buffer, chunk]);

    while (this.buffer.length >= 4) {
      const length = this.buffer.readUInt32BE(0);
      if (this.buffer.length < 4 + length) break;

      const msgBuf = this.buffer.subarray(4, 4 + length);
      this.buffer = this.buffer.subarray(4 + length);

      try {
        this._handleMessage(decode(msgBuf));
      } catch (err) {
        console.error('decode error:', err);
      }
    }
  }

  _handleMessage(msg) {
    // server sends [msgId, result]
    if (!Array.isArray(msg) || msg.length !== 2) return;
    const [id, result] = msg;
    const entry = this.pending.get(id);
    if (entry) {
      this.pending.delete(id);
      clearTimeout(entry.timer);
      entry.resolve(result);
    }
  }

  // Send [msgId, [type, data]] → wait for [msgId, result]
  _send(type, data) {
    return new Promise((resolve, reject) => {
      const sock = this.socket;
      if (!sock || sock.destroyed || !this.connected) {
        const err = new Error('not connected');
        err.isConnectionError = true;
        return reject(err);
      }

      const id = this.nextId++;
      const body = encode([id, [type, data]]);
      console.log('sending body', JSON.stringify({body}));
      const header = Buffer.alloc(4);
      header.writeUInt32BE(body.length, 0);
      const frame = Buffer.concat([header, body]);

      const timer = setTimeout(() => {
        this.pending.delete(id);
        const err = new Error('request timed out');
        err.isConnectionError = true;
        reject(err);
      }, this.timeoutMs);

      this.pending.set(id, { resolve, reject, timer });

      sock.write(frame, (err) => {
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