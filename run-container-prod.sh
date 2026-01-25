#!/bin/bash
# Usage: ./run.sh docker   OR   ./run.sh podman

if [ -z "$1" ]; then
    echo "Error: You must specify 'docker' or 'podman'"
    exit 1
fi

CONTAINER_TOOL=$1
IMAGE_NAME="nyno:latest"

mkdir -p envs
mkdir -p output


source "$(pwd)/envs/ports.env"

# Possibly override with custom .local.env
if [ -f envs/ports.local.env ]; then
  source envs/ports.local.env
fi

echo "WF:$WF"
echo "GU:$GU"
echo "RB:$RB"


# --- Run the container ---
$CONTAINER_TOOL run -it \
-e APP_ENV=prod \
-v $(pwd)/workflows-enabled:/nyno/workflows-enabled \
-v $(pwd)/envs:/nyno/envs \
-v $(pwd)/output:/nyno/output \
-v $(pwd)/extensions:/nyno/extensions \
-p "$PY:$PY" -p "$JS:$JS" -p "$PE:$PE" \
-p "$RB:$RB" \
-p "$WF:$WF" -p "$GU:$GU" $IMAGE_NAME bash

