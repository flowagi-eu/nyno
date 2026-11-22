#!/bin/bash
if [ -z "$1" ]; then
    echo "Error: You must specify 'docker' or 'podman'"
    exit 1
fi

CONTAINER_TOOL=$1
IMAGE_NAME="localhost/nyno-v10:latest"

# --- Ensure docker.env exists (create empty if missing) ---
if [ ! -f docker.env ]; then
    echo "docker.env not found — creating empty file."
    touch docker.env
fi

# --- Run the container ---
$CONTAINER_TOOL run -it \
-v "$(pwd)/docker.env:/nyno/.env:ro" \
-e APP_ENV=prod \
-v $(pwd)/backend/extensions:/nyno/backend/extensions \
-v $(pwd)/my-extensions:/nyno/my-extensions \
-p "9099:9099" $IMAGE_NAME bash

