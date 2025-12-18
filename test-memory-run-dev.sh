#!/usr/bin/env bash

# Start your dev script in the background
bash run-dev.sh &
PID=$!

echo "Tracking memory for PID $PID and its child processes..."

while kill -0 "$PID" 2>/dev/null; do
    TIMESTAMP=$(date '+%T')

    # Get all descendant PIDs of the root process
    PIDS=$(pstree -p "$PID" -A | grep -o '([0-9]\+)' | grep -o '[0-9]\+')

    # Initialize associative array
    declare -A MEM=()
    TOTAL=0

    for p in $PIDS; do
        if [[ -d /proc/$p ]]; then
            # Get the command name, fallback to PID if empty
            CMD=$(ps -o comm= -p $p | tr -d '[:space:]')
            [[ -z "$CMD" ]] && CMD="unknown"

            RSS=$(ps -o rss= -p $p)
            RSS=${RSS:-0}  # fallback if ps returns nothing

            MEM["$CMD"]=$(( ${MEM["$CMD"]:-0} + RSS ))
            TOTAL=$((TOTAL + RSS))
        fi
    done

    echo "=== $TIMESTAMP ==="
    for cmd in "${!MEM[@]}"; do
        MB=$(echo "scale=1; ${MEM[$cmd]}/1024" | bc)
        printf "%-12s %8s MB\n" "$cmd" "$MB"
    done

    TOTAL_MB=$(echo "scale=1; $TOTAL/1024" | bc)
    echo "Total RSS: $TOTAL_MB MB"
    echo "------------------------"

    sleep 1
done

