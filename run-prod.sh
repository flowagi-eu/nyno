#!/bin/bash
source envs/ports.env

# Possibly override with custom .local.env
if [ -f envs/ports.local.env ]; then
  source envs/ports.local.env
fi


source .venv/bin/activate

export RUN_PROD=1

bash scripts/check_host.sh
if [ $? -eq 1 ]; then
    echo "missing dependencies."
    exit 1
fi



node scripts/loadExtensions.js

# hotfix for cp after build

bestjsserver --prod --tcp "$WF" --port "$GU" --host "$HOST" &
SERVER_PID=$!

(sleep 9 && cp src/extension-data.json dist/client/) &

trap "kill $SERVER_PID 2>/dev/null" EXIT INT TERM

wait $SERVER_PID

