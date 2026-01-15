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
import codecs
decoder = codecs.getincrementaldecoder('utf-8')()

# Load Nyno Ports/main config
def load_nyno_ports(path="envs/ports.env"):
    env = {}
    with open(path) as f:
        for line in f:
            line = line.strip()
            if not line or line.startswith("#"):
                continue
            if "#" in line:
                line = line.split("#", 1)[0].strip()
            if "=" in line:
                key, value = line.split("=", 1)
                key = key.strip()
                value = value.strip()

                # Remove surrounding quotes if any
                if (value.startswith('"') and value.endswith('"')) or (value.startswith("'") and value.endswith("'")):
                    value = value[1:-1]

                # Convert numeric strings to int
                if value.isdigit():
                    value = int(value)

                env[key] = value
    return env

# Example usage
ports = load_nyno_ports()
#print(ports)

HOST = ports.get('HOST','localhost')
PORT = ports.get('PY',5000)

is_prod = os.getenv('NODE_ENV') == 'production'
NUM_WORKERS=2
if is_prod:
    NUM_WORKERS = (os.cpu_count() or 1) * 3

VALID_API_KEY = ports.get('SECRET','changeme')

# ===========================================================
#  Base State (built-in functions)
# ===========================================================
STATE = {
}

# ===========================================================
#  Extension Loader (from manifest)
# ===========================================================

EXTENSION_MANIFEST_PATH = os.path.abspath(
    os.path.join(os.path.dirname(__file__), "../../extension-data.json")
)

def load_extensions():
    if not os.path.exists(EXTENSION_MANIFEST_PATH):
        print("[Python Runner] No extension manifest found:", EXTENSION_MANIFEST_PATH)
        return

    try:
        with open(EXTENSION_MANIFEST_PATH, "r") as f:
            manifest = json.load(f)
    except Exception as e:
        print("[Python Runner] Failed to read extension manifest:", e)
        return

    for ext_name, meta in manifest.items():
        source_dir = meta.get("sourceDir")
        if not source_dir:
            print(f"[Python Runner] No sourceDir for extension {ext_name}")
            continue

        cmd_file = os.path.join(source_dir, "command.py")
        if not os.path.exists(cmd_file):
            print(f"[Python Runner] Missing command.py for {ext_name}")
            continue

        try:
            spec = importlib.util.spec_from_file_location(ext_name, cmd_file)
            module = importlib.util.module_from_spec(spec)
            spec.loader.exec_module(module)

            func_name = ext_name.lower().replace("-", "_")
            if not hasattr(module, func_name):
                print(f"[Python Runner] {ext_name} missing function {func_name}")
                continue

            STATE[ext_name] = getattr(module, func_name)
            print(f"[Python Runner] Loaded extension {ext_name}")

        except Exception as e:
            print(f"[Python Runner] Failed loading {ext_name}: {e}")


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
            # buffer += data.decode()
            buffer += decoder.decode(data) # prevent utf8 related errors

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
                        #conn.sendall(b'{"fnError":"not exist"}\n')
                        conn.sendall((json.dumps({"fnError": "not exist", "c":context}) + "\n").encode())

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

