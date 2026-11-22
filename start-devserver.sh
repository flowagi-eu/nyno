#!/usr/bin/env bash

ENV_FILE="$(dirname "${BASH_SOURCE[0]}")/.env"
[ -f "$ENV_FILE" ] && source "$ENV_FILE"

set -Eeuo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# Comma-separated list of directories to watch (spaces after commas are OK)
WATCH_DIRS="${NYNO_WATCH_DIRS:-$ROOT/backend/extensions,$ROOT/my-extensions}"
DEBOUNCE=2

command -v inotifywait >/dev/null || {
    echo "Install: sudo apt install inotify-tools"
    exit 1
}

# ---------------------------------------------------------------------------
# systemd detection + fallback helpers
# Docker containers don't run systemd, so systemctl/systemd-run may not exist.
# On a normal host with a working user manager, behavior is unchanged.
# ---------------------------------------------------------------------------
HAS_SYSTEMD=0
if command -v systemctl >/dev/null 2>&1 && [ -d /run/systemd/system ]; then
    # this script uses *user* units, so also require a reachable user manager
    if systemctl --user show -p ActiveState --value >/dev/null 2>&1; then
        HAS_SYSTEMD=1
    fi
fi

LOG_DIR="$ROOT/logs"
PID_FILE="$LOG_DIR/nyno-v10.pid"
# set NYNO_LOG_FILE=/dev/stdout to stream the server into `docker logs` instead
LOG_FILE="${NYNO_LOG_FILE:-$LOG_DIR/nyno-v10.log}"
mkdir -p "$LOG_DIR"

DEVSERVER_PID=""

# kill_tree <signal> <pid> — signal a pid and all of its children
kill_tree() {
    local sig="$1" pid="$2" child
    if command -v pgrep >/dev/null 2>&1; then
        for child in $(pgrep -P "$pid" 2>/dev/null || true); do
            kill_tree "$sig" "$child"
        done
    fi
    kill -s "$sig" "$pid" 2>/dev/null || true
}

# svc_stop <unit> — stop a previously started devserver
svc_stop() {
    local unit="$1"
    if [ "$HAS_SYSTEMD" = "1" ]; then
        systemctl --user stop "$unit" || true
        return
    fi
    # no systemd: kill the process we started earlier (pid in $PID_FILE)
    if [ -f "$PID_FILE" ]; then
        local old_pid
        old_pid="$(cat "$PID_FILE" 2>/dev/null || true)"
        if [ -n "${old_pid:-}" ] && kill -0 "$old_pid" 2>/dev/null; then
            echo "[DEVSERVER] stopping previous runner (pid $old_pid)"
            kill_tree TERM "$old_pid"
            for _ in $(seq 1 25); do
                kill -0 "$old_pid" 2>/dev/null || break
                sleep 0.2
            done
            if kill -0 "$old_pid" 2>/dev/null; then
                kill_tree KILL "$old_pid"
            fi
        fi
        rm -f "$PID_FILE"
    fi
}

# svc_run <unit> <cmd...> — start devserver via systemd-run, or directly
svc_run() {
    local unit="$1"; shift
    if [ "$HAS_SYSTEMD" = "1" ]; then
        systemd-run --user \
            --unit="$unit" \
            --pty \
            --working-directory="$ROOT" \
            --setenv="PATH=$PATH" \
            --setenv="HOME=$HOME" \
            --setenv="RUST_LOG=${RUST_LOG:-debug}" \
            "$@" &
        DEVSERVER_PID=$!
    else
        echo "[DEVSERVER] no systemd -> running directly (log: $LOG_FILE)"
        (
            cd "$ROOT" || exit 1
            export RUST_LOG="${RUST_LOG:-debug}"
            exec "$@"
        ) </dev/null >>"$LOG_FILE" 2>&1 &
        DEVSERVER_PID=$!
        echo "$DEVSERVER_PID" > "$PID_FILE"
    fi
}

# Parse comma-separated dirs into array, trim whitespace, validate existence
IFS=',' read -ra _raw_dirs <<< "$WATCH_DIRS"
WATCH_ARRAY=()

for dir in "${_raw_dirs[@]}"; do
    # Trim leading/trailing whitespace
    dir="${dir#"${dir%%[![:space:]]*}"}"
    dir="${dir%"${dir##*[![:space:]]}"}"
    [[ -z "$dir" ]] && continue

    [[ -d "$dir" ]] || {
        echo "Missing directory: $dir"
        exit 1
    }

    WATCH_ARRAY+=("$dir")
    echo "[WATCH] $dir"
done

[[ ${#WATCH_ARRAY[@]} -gt 0 ]] || {
    echo "No valid watch directories provided"
    exit 1
}

# Returns true if $1's parent directory is one of the watch roots
is_watch_root() {
    local path="$1"
    local parent="${path%/*}"
    local d

    for d in "${WATCH_ARRAY[@]}"; do
        [[ "$parent" == "$d" ]] && return 0
    done

    return 1
}

restart_devserver() {
    echo ""
    echo "========== RESTARTING DEVSERVER =========="

    svc_stop "nyno-v10.service"

    svc_run "nyno-v10" /usr/bin/bash "$ROOT/scripts/start-devserver.sh"

    echo "[DEVSERVER] systemd unit: nyno-v10"
    echo "[DEVSERVER] Runner PID: $DEVSERVER_PID"
    echo "========== RESTART COMPLETE =========="
}

# stop the devserver when the watcher exits
trap 'svc_stop "nyno-v10.service"' EXIT

echo "[WATCH] Watching for directories, command.* and template.yml"

restart_devserver

# One persistent watcher for all directories (recursive, auto-watches new subdirs)
inotifywait -m -r -q \
    -e create,delete,close_write,moved_to,moved_from \
    --format '%e|%w%f' \
    "${WATCH_ARRAY[@]}" |
while IFS='|' read -r event path; do

    name="${path##*/}"

    # New directory created directly inside any watch root
    if is_watch_root "$path" && [[ "$event" == *ISDIR* ]]; then
        echo "[WATCH] Extension directory: $event $name"

    # command.* or template.yml file anywhere in the watched trees
    elif [[ "$name" == command.* || "$name" == template.yml ]]; then
        echo "[WATCH] Extension file: $event $path"

    else
        continue
    fi

    # Debounce: drain additional events within the timeout window
    while IFS='|' read -r -t "$DEBOUNCE" next_event next_path; do
        next_name="${next_path##*/}"

        if (is_watch_root "$next_path" && [[ "$next_event" == *ISDIR* ]]) ||
           [[ "$next_name" == command.* || "$next_name" == template.yml ]]; then
            echo "[WATCH] Additional: $next_event $next_path"
        fi
    done

    restart_devserver

done
