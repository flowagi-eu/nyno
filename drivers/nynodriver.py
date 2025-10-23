# nyno_client.py
import socket
import json

class NynoClient:
    def __init__(self, host='127.0.0.1', port=6001, credentials=None, timeout=2.0):
        self.host = host
        self.port = port
        self.credentials = credentials or {"apiKey": "changeme"}
        self.sock = None
        self.timeout = timeout

    def connect(self):
        self.sock = socket.create_connection((self.host, self.port), timeout=self.timeout)
        self.sock.settimeout(self.timeout)
        self.send_raw('c' + json.dumps(self.credentials) + '\n')
        resp = self.read_line()
        result = json.loads(resp)
        if not result.get('status'):
            raise Exception(f"Nyno authentication failed: {result}")
        return result

    def run_workflow(self, path, data=None):
        if not self.sock:
            raise Exception("Not connected")
        payload = {"path": path}
        if data:
            payload.update(data)
        self.send_raw('q' + json.dumps(payload) + '\n')
        resp = self.read_line()
        return json.loads(resp)

    def send_raw(self, msg: str):
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
            self.sock.close()
            self.sock = None


# Example usage:
# if __name__ == "__main__":
#     nyno = NynoClient(credentials={"apiKey": "changeme"})
#     print("Auth:", nyno.connect())
#     res = nyno.run_workflow("/sync/users", {"userId": 42, "action": "sync"})
#     print("Response:", res)
#     nyno.close()

