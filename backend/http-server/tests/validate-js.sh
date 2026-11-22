#!/usr/bin/env bash

for file in ../*.js; do
    [ -f "$file" ] || continue

    echo "Testing: $file"

    tmp=$(mktemp)

    setsid node "$file" >"$tmp" 2>&1 &
    pid=$!

    # Give Node one event-loop turn to catch immediate startup errors.
    sleep 0.1

    if ! kill -0 "$pid" 2>/dev/null; then
        wait "$pid"
        status=$?

        if [ "$status" -ne 0 ] || grep -qi 'error' "$tmp"; then
            echo "FAIL: $file"
            cat "$tmp"
            rm -f "$tmp"
            exit 1
        fi
    else
        # Still running => assume it's a valid long-running process.
        if grep -qi 'error' "$tmp"; then
            echo "FAIL: $file"
            cat "$tmp"
            kill -TERM -- "-$pid" 2>/dev/null || true
            kill -KILL -- "-$pid" 2>/dev/null || true
            rm -f "$tmp"
            exit 1
        fi

        echo "OK: $file (still running)"

        # Clean up the process tree.
        kill -TERM -- "-$pid" 2>/dev/null || true
        sleep 0.1
        kill -KILL -- "-$pid" 2>/dev/null || true
        wait "$pid" 2>/dev/null || true
    fi

    rm -f "$tmp"
done

echo "All JS files passed."
