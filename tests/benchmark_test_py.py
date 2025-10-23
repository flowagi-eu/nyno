import socket
import threading
import time
import json
from queue import Queue

HOST = 'localhost'
PORT = 6001
API_KEY = "changeme"
TEST_JSON = {"test": "log 1"}
NUM_THREADS = 10
DURATION = 10

# Queues to store q responses
q_responses_queue = Queue()
sample_q_responses = []
send_lock = threading.Lock()

def receiver(sock):
    """Continuously read from socket and put data into queue."""
    while True:
        try:
            data = sock.recv(4096)
            if not data:
                break
            q_responses_queue.put(data.decode().strip())
        except Exception:
            break

def worker(sock):
    """Send q requests continuously for DURATION seconds."""
    messages_sent = 0
    q_received = 0
    bytes_received = 0
    start_time = time.time()
    while time.time() - start_time < DURATION:
        q_payload = {"path": "/test_runners", "i": 2,"name":"Alice"} # 0=js, 1=php 2=py
        with send_lock:
            sock.sendall(f'q{json.dumps(q_payload)}\n'.encode())
            messages_sent += 1

        # Read response (blocking up to 1s)
        try:
            resp = q_responses_queue.get(timeout=1)
            q_received += 1
            bytes_received += len(resp)
            if len(sample_q_responses) < 10:
                sample_q_responses.append(resp)
        except:
            pass

    return messages_sent, q_received, bytes_received

# --- Open single TCP connection ---
sock = socket.create_connection((HOST, PORT))

# --- Send initial c command once ---
c_payload = {"apiKey": API_KEY}
sock.sendall(f'c{json.dumps(c_payload)}\n'.encode())
# Wait for c response
data = sock.recv(4096)
print("Authentication response:", data.decode().strip())

# --- Start receiver thread ---
recv_thread = threading.Thread(target=receiver, args=(sock,), daemon=True)
recv_thread.start()

# --- Start worker threads for parallel q requests ---
results = []
threads = []
for _ in range(NUM_THREADS):
    t = threading.Thread(target=lambda: results.append(worker(sock)))
    t.start()
    threads.append(t)

for t in threads:
    t.join()

# Close socket
sock.close()

# --- Aggregate results ---
total_sent = sum(r[0] for r in results)
total_q_received = sum(r[1] for r in results)
total_bytes = sum(r[2] for r in results)
total_mb = total_bytes / (1024*1024)

print(f"\nTotal 'q' messages sent: {total_sent}")
print(f"Total 'q' responses received: {total_q_received}")
print(f"Total MB received: {total_mb:.2f} MB")
print(f"Messages per second (sent): {total_sent/DURATION:.2f}")
print(f"Messages per second (received): {total_q_received/DURATION:.2f}")
print(f"Throughput: {total_mb/DURATION:.2f} MB/s")

print("\nSample 'q' responses:")
for r in sample_q_responses:
    print(r)

