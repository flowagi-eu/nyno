import multiprocessing as mp
import importlib.util
import json
import os
import asyncio
import itertools


# ===========================================================
# GLOBAL STATE
# ===========================================================

FUNCTIONS = {}
EXTENSION_MANIFEST_PATH = os.getenv(
    "EXTENSION_MANIFEST_PATH",
    "extensions-manifest.json"
)

_TASK_QUEUE = mp.Queue()
_RESULT_QUEUE = mp.Queue()
_PROCS = []
_ID_GEN = itertools.count(1)


# ===========================================================
# EXTENSION LOADER
# ===========================================================

def load_extensions():
    global FUNCTIONS
    FUNCTIONS = {}

    if not os.path.exists(EXTENSION_MANIFEST_PATH):
        return

    with open(EXTENSION_MANIFEST_PATH, "r") as f:
        manifest = json.load(f)

    for ext_name, meta in manifest.items():
        source_dir = meta.get("sourceDir")
        if not source_dir:
            continue

        cmd_file = os.path.join(source_dir, "command.py")
        if not os.path.exists(cmd_file):
            continue

        try:
            spec = importlib.util.spec_from_file_location(ext_name, cmd_file)
            module = importlib.util.module_from_spec(spec)
            spec.loader.exec_module(module)

            fn_name = ext_name.lower().replace("-", "_")

            if hasattr(module, fn_name):
                print("[Python] loaded extension: ",fn_name)
                FUNCTIONS[ext_name] = getattr(module, fn_name)

        except Exception as e:
            print(f"[Worker] Failed loading {ext_name}: {e}")


# ===========================================================
# WORKER PROCESS
# ===========================================================

def worker_loop(task_queue, result_queue, functions):
    """
    Each process gets a frozen copy of FUNCTIONS
    """
    while True:
        job = task_queue.get()
        if job is None:
            break

        job_id, fn_name, args, context = job

        try:
            fn = functions.get(fn_name)

            if not fn:
                result_queue.put((job_id, {"error": "unknown function"}))
                continue

            result = fn(args, context)
            result_queue.put((job_id, {"r":result,"c":context}))

        except Exception as e:
            result_queue.put((job_id, {"error": str(e)}))


# ===========================================================
# START WORKERS
# ===========================================================

def start(workers=4):
    load_extensions()

    for _ in range(workers):
        p = mp.Process(
            target=worker_loop,
            args=(_TASK_QUEUE, _RESULT_QUEUE, FUNCTIONS),
            daemon=True
        )
        p.start()
        _PROCS.append(p)


# ===========================================================
# INTERNAL QUEUE OPS
# ===========================================================

def _submit(fn_name, args, context):
    job_id = next(_ID_GEN)
    _TASK_QUEUE.put((job_id, fn_name, args, context))
    return job_id


def _poll(job_id):
    while True:
        jid, result = _RESULT_QUEUE.get()
        if jid == job_id:
            return result


# ===========================================================
# PUBLIC API
# ===========================================================

async def multiprocessExecutor(fn_name, args=None, context=None):
    loop = asyncio.get_running_loop()

    job_id = _submit(fn_name, args, context)

    return await loop.run_in_executor(None, _poll, job_id)


# ===========================================================
# STOP
# ===========================================================

def stop():
    for _ in _PROCS:
        _TASK_QUEUE.put(None)

    for p in _PROCS:
        p.join()
