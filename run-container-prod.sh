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


# --- Run the container ---
$CONTAINER_TOOL run -it \
-e APP_ENV=prod \
-v $(pwd)/workflows-enabled:/app/workflows-enabled \
-v $(pwd)/envs:/app/envs \
-v $(pwd)/output:/app/output \
-v $(pwd)/extensions:/app/extensions \
-p 6001:6001 -p 4173:4173 -p 5173:5173 $IMAGE_NAME bash

