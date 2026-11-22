// client.mjs
// npm install @msgpack/msgpack

import net from 'net';
import { encode, decode } from '@msgpack/msgpack';
import { fileURLToPath } from 'url';

class TCPClient {
  constructor(host = 'localhost', port = 6001, secret = 'change_me', options = {}) {
    this.host = host;
    this.port = port;
    this.secret = secret;
    this.timeout = options.timeout || 5000;      // per-request timeout
    this.maxRetries = options.maxRetries ?? 3;    // retry 3x on disconnect
    this.retryDelay = options.retryDelay ?? 1000;  // 1s between retries

    this.socket = null;
    this.buffer = Buffer.alloc(0);
    this.msgId = 0;
    this.pending = new Map();
    this.authenticated = false;
    this.connected = false;
    this._connecting = null; // in-flight connection promise
  }

  _sleep(ms) {
    return new Promise(r => setTimeout(r, ms));
  }

  /** Connect + authenticate. Safe to call when already connected. */
  async connect() {
    if (this.connected && this.authenticated) return;
    if (this._connecting) return this._connecting; // dedupe concurrent connects

    this._connecting = new Promise((resolve, reject) => {
      if (this.socket) this.socket.destroy();
      this.socket = new net.Socket();
      let settled = false;

      this.socket.on('connect', async () => {
        this.connected = true;
        console.log(`🔌 Connected to ${this.host}:${this.port}`);
        try {
          await this._authenticate();
          if (!settled) { settled = true; resolve(); }
        } catch (err) {
          if (!settled) { settled = true; reject(err); }
          this._hardReset();
        }
      });

      this.socket.on('data', (data) => this._handleData(data));

      this.socket.on('error', (err) => {
        err.isConnectionError = true;
        console.error('❌ Socket error:', err.message);
        this._failAll(err);
        if (!settled) { settled = true; reject(err); }
      });

      this.socket.on('close', () => {
        console.log('🔌 Connection closed');
        this.connected = false;
        this.authenticated = false;
        const err = new Error('Connection closed');
        err.isConnectionError = true;
        this._failAll(err);
        if (!settled) { settled = true; reject(err); }
      });

      this.socket.connect(this.port, this.host);
    });

    try {
      await this._connecting;
    } finally {
      this._connecting = null;
    }
  }

  _handleData(data) {
    this.buffer = Buffer.concat([this.buffer, data]);
    while (this.buffer.length >= 4) {
      const length = this.buffer.readUInt32BE(0);
      if (this.buffer.length < 4 + length) break;
      const msgBuf = this.buffer.subarray(4, 4 + length);
      this.buffer = this.buffer.subarray(4 + length);
      try {
        this._handleMessage(decode(msgBuf));
      } catch (err) {
        console.error('❌ Decode error:', err);
      }
    }
  }

  _handleMessage(msg) {
    if (!Array.isArray(msg) || msg.length !== 2) return;
    const [msgId, data] = msg;
    const pending = this.pending.get(msgId);
    if (pending) {
      clearTimeout(pending.timer);
      this.pending.delete(msgId);
      pending.resolve(data);
    } else {
      console.log('📨 Server push:', data);
      if (this.onMessage) this.onMessage(data);
    }
  }

  _sendRaw(type, data) {
    return new Promise((resolve, reject) => {
      if (!this.socket || this.socket.destroyed || !this.connected) {
        const err = new Error('Not connected');
        err.isConnectionError = true;
        return reject(err);
      }

      const msgId = ++this.msgId;
      const packet = [msgId, [type, data]];
      const body = encode(packet);
      const header = Buffer.alloc(4);
      header.writeUInt32BE(body.length, 0);

      const timer = setTimeout(() => {
        this.pending.delete(msgId);
        reject(new Error(`Timeout (id=${msgId})`));
      }, this.timeout);

      this.pending.set(msgId, { resolve, reject, timer });
      this.socket.write(Buffer.concat([header, body]));
    });
  }

  async _authenticate() {
    console.log('🔐 Authenticating...');
    const res = await this._sendRaw('c', { secret: this.secret });
    if (res && res.ok) {
      this.authenticated = true;
      console.log('✅ Authenticated');
    } else {
      throw new Error(`Auth failed: ${res?.error || 'unknown'}`);
    }
  }

  /**
   * Send request with auto-retry on disconnect.
   * If connection drops, waits `retryDelay`, reconnects, and retries
   * up to `maxRetries` times.
   */
  async request(type, data = {}) {
    let lastErr;
    for (let attempt = 0; attempt <= this.maxRetries; attempt++) {
      try {
        if (!this.authenticated || !this.connected) {
          await this.connect();
        }
        return await this._sendRaw(type, data);
      } catch (err) {
        lastErr = err;
        const isConnErr =
          err.isConnectionError ||
          /closed|Not connected|ECONNRESET|EPIPE|ECONNREFUSED/i.test(err.message);

        if (isConnErr && attempt < this.maxRetries) {
          console.log(`🔄 Disconnected (attempt ${attempt + 1}/${this.maxRetries + 1}), retrying in ${this.retryDelay}ms...`);
          this._hardReset();
          await this._sleep(this.retryDelay);
          continue;
        }
        throw err;
      }
    }
    throw lastErr;
  }

  _hardReset() {
    this.connected = false;
    this.authenticated = false;
    if (this.socket) {
      this.socket.destroy();
      this.socket = null;
    }
  }

  _failAll(err) {
    for (const { reject, timer } of this.pending.values()) {
      clearTimeout(timer);
      reject(err);
    }
    this.pending.clear();
  }

  disconnect() {
    this._hardReset();
    this._failAll(Object.assign(new Error('Client disconnected'), { isConnectionError: true }));
  }
}

// ==================== DEMO ====================

async function demo() {
  console.log('🚀 TCP Client Demo (auto-retry 3x)\n');

  const client = new TCPClient('localhost', 9098, 'iusadhi8y42708yDSAYxx09352273ISAYDWJVEQ932477432', {
    timeout: 3000,
    maxRetries: 3,
    retryDelay: 1000,
  });

  client.onMessage = (data) => console.log('📬 Push:', data);

  try {
    await client.connect();

    console.log('\n--- Ping ---');
    console.log(await client.request('ping', { ts: Date.now() }));

    console.log('\n--- Echo ---');
    console.log(await client.request('echo', { msg: 'hello', arr: [1, 2, 3] }));

    // Simulate a network drop to prove auto-retry works
    console.log('\n--- Simulating disconnect (destroying socket) ---');
    client.socket.destroy();

    console.log('\n--- Request after drop (should auto-reconnect & retry) ---');
    const res = await client.request('ping', { recovered: true });
    console.log('✅ Success after retry:', res);

    console.log('\n--- Concurrent requests ---');
    const results = await Promise.all([
      client.request('ping', { id: 1 }),
      client.request('echo', { id: 2 }),
      client.request('info', {}),
    ]);
    console.log('Results:', results);

    console.log('\n✅ Demo complete');
  } catch (err) {
    console.error('\n❌ Failed after all retries:', err.message);
  } finally {
    client.disconnect();
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  demo();
}

export default TCPClient;
