#!/bin/bash
# Usage: ./run.sh docker   OR   ./run.sh podman

if [ -z "$1" ]; then
    echo "Error: You must specify 'docker' or 'podman'"
    exit 1
fi

CONTAINER_TOOL=$1
IMAGE_NAME="nyno:latest"

# --- Run the container ---
$CONTAINER_TOOL run -it \
-v $(pwd)/workflows-enabled:/app/workflows-enabled \
-v $(pwd)/extensions:/app/extensions \
-p 6001:6001 -p 4173:4173 -p 5173:5173 $IMAGE_NAME bash

