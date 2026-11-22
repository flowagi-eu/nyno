
#!/usr/bin/env bash
set -Eeuo pipefail

PID_FILE="/tmp/nyno-devserver.pid"

if [[ ! -f "$PID_FILE" ]]; then
    echo "[DEVSERVER] Not running."
    exit 0
fi

PID="$(cat "$PID_FILE")"

if ! kill -0 "$PID" 2>/dev/null; then
    rm -f "$PID_FILE"
    echo "[DEVSERVER] Stale PID file removed."
    exit 0
fi

echo "[DEVSERVER] Stopping PID $PID..."

kill -TERM "$PID"

for i in $(seq 1 100); do
    if ! kill -0 "$PID" 2>/dev/null; then
        echo "[DEVSERVER] Stopped."
        exit 0
    fi
    sleep 0.1
done

echo "[DEVSERVER] Force stopping..."

kill -KILL "$PID" 2>/dev/null || true
rm -f "$PID_FILE"

