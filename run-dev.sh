#!/bin/bash
source envs/ports.env
source .venv/bin/activate

bash scripts/check_host.sh
if [ $? -eq 1 ]; then
    echo "missing dependencies."
    exit 1
fi

# --- Function: check if port is free ---
check_port() {
    local port=$1
    if lsof -i TCP:$port -sTCP:LISTEN >/dev/null 2>&1; then
        echo "ERROR: Port $port is already in use."
        exit 1
    else
        echo "Port $port is free."
    fi
}

# --- Check all required ports ---
check_port "$PY"
check_port "$JS"
check_port "$PE"
check_port "$RB"

# Typescript support
npm run build:node


/home/user/.nvm/versions/node/v22.17.1/bin/bestjsserver --tcp "$WF" --port "$GU" --host "$HOST"
#bestjsserver --tcp "$WF" --port "$GU" --host "$HOST"
