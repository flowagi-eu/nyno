// nyno-client.js
import net from 'net';

export class NynoClient {
  constructor({ host = '127.0.0.1', port = 6001, credentials = { apiKey: 'changeme' } }) {
    this.host = host;
    this.port = port;
    this.credentials = credentials;
    this.socket = null;
    this.buffer = '';
  }

  connect() {
    return new Promise((resolve, reject) => {
      this.socket = net.createConnection({ host: this.host, port: this.port }, () => {
        this.socket.setEncoding('utf8');
        // Send credentials
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
            else reject(new Error(`Auth failed: ${line}`));
          } catch (e) {
            reject(e);
          }
        }
      });

      this.socket.on('error', reject);
    });
  }

  runWorkflow(path, data = {}) {
    return new Promise((resolve, reject) => {
      const payload = { path, ...data };
      const msg = 'q' + JSON.stringify(payload) + '\n';
      this.socket.write(msg);

      const onData = (chunk) => {
        this.buffer += chunk;
        if (this.buffer.includes('\n')) {
          const line = this.buffer.split('\n')[0];
          this.buffer = this.buffer.slice(line.length + 1);
          this.socket.removeListener('data', onData);
          try {
            resolve(JSON.parse(line));
          } catch (e) {
            reject(e);
          }
        }
      };

      this.socket.on('data', onData);
      this.socket.on('error', reject);
    });
  }

  close() {
    if (this.socket) this.socket.end();
  }
}

// Example usage:
// (async () => {
//   const nyno = new NynoClient({ credentials: { apiKey: 'changeme' } });
//   await nyno.connect();
//   console.log('Connected');
//   const res = await nyno.runWorkflow('/sync/users', { userId: 42, action: 'sync' });
//   console.log('Response:', res);
//   nyno.close();
// })();

