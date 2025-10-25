import socket
import json
import time


class NynoClient:
    def __init__(self, credentials, host='127.0.0.1', port=6001, timeout=2.0, max_retries=3, retry_delay=0.2):
        self.credentials = credentials
        self.host = host
        self.port = port
        self.timeout = timeout
        self.sock = None
        self.max_retries = max_retries
        self.retry_delay = retry_delay
        self.connect()

    def connect(self):
        self.close()

        self.sock = socket.create_connection((self.host, self.port), timeout=self.timeout)
        self.sock.settimeout(self.timeout)

        # Authenticate
        msg = 'c' + json.dumps(self.credentials) + '\n'
        self.send_raw(msg)

        resp = self.read_line()
        result = json.loads(resp)

        if not result or not result.get('status'):
            self.close()
            raise Exception(f"Nyno authentication failed: {result.get('error') if isinstance(result, dict) else result}")

    def run_workflow(self, path, data=None):
        attempts = 0

        while True:
            try:
                self.ensure_connected()

                payload = {"path": path}
                if data:
                    payload.update(data)

                msg = 'q' + json.dumps(payload) + '\n'
                self.send_raw(msg)

                resp = self.read_line()
                if not resp:
                    raise Exception("Empty response from server")

                result = json.loads(resp)
                return result
            except Exception as e:
                attempts += 1
                if attempts > self.max_retries:
                    raise Exception(f"Nyno request failed after {self.max_retries} retries: {e}")
                print(f"Nyno connection lost, retrying (#{attempts})...")
                time.sleep(self.retry_delay)
                self.retry_delay *= 2
                try:
                    self.connect()
                except Exception as ce:
                    print(f"Reconnect attempt failed: {ce}")

    def ensure_connected(self):
        if self.sock is None:
            self.connect()

    def send_raw(self, msg):
        if not self.sock:
            raise Exception("Socket not connected")
        self.sock.sendall(msg.encode('utf-8'))

    def read_line(self):
        buf = b''
        while True:
            chunk = self.sock.recv(2048)
            if not chunk:
                raise ConnectionError("Socket closed")
            buf += chunk
            if b'\n' in buf:
                line, _, _ = buf.partition(b'\n')
                return line.decode('utf-8').strip()

    def close(self):
        if self.sock:
            try:
                self.sock.close()
            except Exception:
                pass
            self.sock = None

