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

echo "Workflow Port:$WF"
echo "GUI Port:$GU"
echo "Engines:"
echo "PY:$PY"
echo "JS:$JS"
echo "PHP:$PE"


# --- Run the container ---
$CONTAINER_TOOL run -it \
-v $(pwd):/app \
-v $(pwd)/workflows-enabled:/app/workflows-enabled \
-v $(pwd)/envs:/app/envs \
-v $(pwd)/output:/app/output \
-v $(pwd)/extensions:/app/extensions \
-p "$PY:$PY" -p "$JS:$JS" -p "$PE:$PE" \
-p "$WF:$WF" -p "$GU:$GU" $IMAGE_NAME bash

