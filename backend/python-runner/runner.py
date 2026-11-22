import asyncio
import argparse
import os
import json
import sys
import importlib.util
from dotenv import load_dotenv

load_dotenv(dotenv_path=".env")

from lib.server import TCPServer

# ===========================================================
#  Config (same env vars as your old runner)
# ===========================================================
HOST = os.environ.get('HOST', '0.0.0.0')
PORT = int(os.environ.get('PY', os.environ.get('NYNO_PYTHON_PORT', '9098')))
VALID_API_KEY = os.environ.get('SECRET_NYNO_API_KEY', 'changeme')

# ===========================================================
#  State: extensions + in-flight counter (asyncio lock)
# ===========================================================
STATE = {}
IN_FLIGHT = 0
IN_FLIGHT_LOCK = asyncio.Lock()

# ===========================================================
#  Extension loader (same as your old runner)
# ===========================================================


def load_extensions(EXTENSIONS_DIR):
    if not os.path.isdir(EXTENSIONS_DIR):
        print("[Runner] No extensions folder found:", EXTENSIONS_DIR)
        return

    for entry in sorted(os.listdir(EXTENSIONS_DIR)):
        ext_dir = os.path.join(EXTENSIONS_DIR, entry)
        if not os.path.isdir(ext_dir):
            continue

        cmd_file = os.path.join(ext_dir, "command.py")
        if not os.path.exists(cmd_file):
            continue

        ext_name = entry.replace('-', '_')
        try:
            if ext_dir not in sys.path:
                sys.path.insert(0, ext_dir)

            spec = importlib.util.spec_from_file_location(f"extension_{ext_name}", cmd_file)
            module = importlib.util.module_from_spec(spec)
            sys.modules[spec.name] = module
            spec.loader.exec_module(module)

            if not hasattr(module, ext_name):
                print(f"[Runner] {ext_name} missing function {ext_name}")
                continue

            STATE[ext_name] = getattr(module, ext_name)
            print(f"[Runner] Loaded extension {ext_name}")
        except Exception as e:
            print(f"[Runner] Failed loading {ext_name}: {e}")



DEFAULT_EXTS = [
    os.path.abspath(os.path.join("backend", "extensions")),
    os.path.abspath("my-extensions"),
]

env_exts = os.environ.get("NYNO_CORE_PLUGINS_DIRS")
if env_exts:
    EXTENSIONS_DIRS = [os.path.abspath(p) for p in json.loads(env_exts)]
else:
    EXTENSIONS_DIRS = DEFAULT_EXTS

for d in EXTENSIONS_DIRS:
    load_extensions(d)

# ===========================================================
#  Message handler — called by TCPServer after auth ("c")
# ===========================================================
async def message_handler(type: str, data: dict, socket):
    """
    type:   message type string ("q", "r", "ping", ...)
    data:   payload dict
    socket: asyncio StreamWriter (can push unsolicited messages)
    Returns a dict sent back as [msg_id, result]
    """
    global IN_FLIGHT
    data = data or {}

    # --- generic / health (works with the JS client demo) ---
    if type == "ping":
        return {"pong": True, "echo": data}

    if type == "echo":
        return {"result": data}

    if type == "info":
        return {
            "status": "ok",
            "extensions": list(STATE.keys()),
            "in_flight": IN_FLIGHT,
        }

    # --- "q" : query in-flight request count ---
    if type == "q":
        async with IN_FLIGHT_LOCK:
            count = IN_FLIGHT
        return {"status": "OK", "count": count}

    # --- "r" : run an extension function ---
    if type == "r":
        fn_name = data.get("functionName")
        print("[Python Runner] got r", fn_name)
        args = data.get("args", [])
        context = data.get("context", {})
        fn = STATE.get(fn_name)

        if not callable(fn):
            return {"fnError": "not exist", "c": context}

        async with IN_FLIGHT_LOCK:
            IN_FLIGHT += 1
        try:
            # run the sync extension in a worker thread so the event loop stays free
            result = await asyncio.to_thread(fn, args, context)
            return {"status": "OK", "r": result, "c": context}
        except Exception as e:
            return {"status": "ERR", "error": str(e)}
        finally:
            async with IN_FLIGHT_LOCK:
                IN_FLIGHT -= 1

    return {"error": f"unknown type: {type}"}

# ===========================================================
#  Main
# ===========================================================
async def main():
    parser = argparse.ArgumentParser(description="Python Runner (msgpack TCP)")
    parser.add_argument("--host", default=HOST, help=f"Bind address (default: {HOST})")
    parser.add_argument("--port", type=int, default=PORT, help=f"Port (default: {PORT})")
    parser.add_argument("--secret", default=VALID_API_KEY, help="Auth secret / API key")
    args = parser.parse_args()

    server = TCPServer(
        host=args.host,
        port=args.port,
        secret=args.secret,
        handler=message_handler,
    )

    try:
        await server.start()
    except KeyboardInterrupt:
        print("\n👋 Server stopped")

if __name__ == "__main__":
    # Requires: pip install msgpack   (Python 3.9+ for asyncio.to_thread)
    asyncio.run(main())
