
#!/usr/bin/env bash
set -Eeuo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
PID_FILE="/tmp/nyno-devserver.pid"

cd "$ROOT"

# Build Rust runner
(
    cd backend/rust-runner
    bash build.sh
    cargo run --release --bin precompile-components # for wasmc
)

# Prevent duplicate instances
if [[ -f "$PID_FILE" ]]; then
    OLD_PID="$(cat "$PID_FILE")"
    if kill -0 "$OLD_PID" 2>/dev/null; then
        echo "[DEVSERVER] Already running (PID $OLD_PID)"
        exit 1
    fi
    rm -f "$PID_FILE"
fi

echo $$ > "$PID_FILE"

CHILD_PIDS=()

cleanup() {
    echo "[DEVSERVER] Stopping processes..."

    for pid in "${CHILD_PIDS[@]}"; do
        kill -TERM "$pid" 2>/dev/null || true
    done

    for pid in "${CHILD_PIDS[@]}"; do
        wait "$pid" 2>/dev/null || true
    done

    rm -f "$PID_FILE"

    echo "[DEVSERVER] Stopped."
}

trap cleanup EXIT
trap 'exit 0' INT TERM

export NODE_TLS_REJECT_UNAUTHORIZED=0

echo "[DEVSERVER] Starting processes..."

jt dev-server.js &
CHILD_PIDS+=("$!")

backend/rust-runner/target/release/nyno-wasm-runner &
CHILD_PIDS+=("$!")

backend/python-runner/run.sh &
CHILD_PIDS+=("$!")

echo "[DEVSERVER] Running (PID $$)"

wait

