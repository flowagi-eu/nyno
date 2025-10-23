#!/usr/bin/env python3
import socket
import threading
import multiprocessing
import os
import json
import time
import importlib.util
import glob
from datetime import datetime

HOST = "127.0.0.1"
PORT = 5000
NUM_WORKERS = (os.cpu_count() or 1) * 3
VALID_API_KEY = "changeme"

# ===========================================================
#  Base State (built-in functions)
# ===========================================================
STATE = {
    "say_hello": lambda: f"Hello from Python worker {os.getpid()}",
    "current_time": lambda: datetime.utcnow().isoformat(),
    "add": lambda a, b: a + b,
    "heavy_task": lambda: (time.sleep(0.5) or "Heavy task done"),
}

# ===========================================================
#  Extension Loader (same as before)
# ===========================================================
def load_extensions():
    base = os.path.join(os.path.dirname(__file__), "../../../extensions")
    for cmd_file in glob.glob(f"{base}/*/command.py"):
        mod_name = os.path.basename(os.path.dirname(cmd_file))
        spec = importlib.util.spec_from_file_location(mod_name, cmd_file)
        module = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(module)



        func_name = mod_name.lower().replace("-", "_")


        if hasattr(module, func_name):
            STATE[mod_name] = getattr(module, func_name)
            print(f"[Python Runner] Loaded extension {mod_name}")
        else:
            print(f"[Python Runner] Failed Loaded extension {mod_name} with name {func_name}")

load_extensions()

# ===========================================================
#  Handle one client connection (persistent threads)
# ===========================================================
def handle_client(conn, addr):
    authenticated = False
    buffer = ""
    try:
        while True:
            data = conn.recv(4096)
            if not data:
                break
            buffer += data.decode()

            while "\n" in buffer:
                line, buffer = buffer.split("\n", 1)
                if not line.strip():
                    continue

                type_char = line[0]
                raw_json = line[1:]

                try:
                    payload = json.loads(raw_json)
                except Exception as e:
                    print("[Python Runner] JSON parse error:", e, raw_json)
                    continue

                # ---- handle connect/auth ----
                if type_char == "c":
                    if payload.get("apiKey") == VALID_API_KEY:
                        authenticated = True
                        conn.sendall(b'{"status":"OK"}\n')
                    else:
                        conn.sendall(b'{"status":"ERR","error":"Invalid apiKey"}\n')
                        conn.close()
                        return

                elif not authenticated:
                    conn.sendall(b'{"status":"ERR","error":"Not authenticated"}\n')
                    conn.close()
                    return

                # ---- function run ----
                elif type_char == "r":
                    fn_name = payload.get("functionName")
                    args = payload.get("args", [])
                    context = payload.get("context", [])
                    fn = STATE.get(fn_name)
                    if callable(fn):
                        try:
                            result = fn(args,context)
                            conn.sendall((json.dumps({"status": "OK", "r": result,"c":context}) + "\n").encode())
                        except Exception as e:
                            conn.sendall((json.dumps({"status": "ERR", "error": str(e)}) + "\n").encode())
                    else:
                        conn.sendall(b'{"fnError":"not exist"}\n')

                # ---- function exists ----
                elif type_char == "e":
                    fn_name = payload.get("functionName")
                    exists = callable(STATE.get(fn_name))
                    conn.sendall((json.dumps({"exists": exists}) + "\n").encode())

    except Exception as e:
        print(f"[Python Worker {os.getpid()}] Client error {addr}: {e}")
    finally:
        conn.close()


# ===========================================================
#  Worker process: persistent threaded socket server
# ===========================================================
def worker_main(listener_fd):
    listener = socket.socket(fileno=listener_fd)
    while True:
        conn, addr = listener.accept()
        t = threading.Thread(target=handle_client, args=(conn, addr), daemon=True)
        t.start()


# ===========================================================
#  Master process: spawn multiple workers
# ===========================================================
def master_main():
    listener = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
    listener.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
    listener.bind((HOST, PORT))
    listener.listen()
    print(f"[Python Master {os.getpid()}] Listening on {HOST}:{PORT}")

    for _ in range(NUM_WORKERS):
        p = multiprocessing.Process(target=worker_main, args=(listener.fileno(),))
        p.daemon = False
        p.start()
        print(f"[Python Master] Started worker PID={p.pid}")

    # keep master alive
    while True:
        time.sleep(10)


if __name__ == "__main__":
    master_main()

