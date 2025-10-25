#!/bin/bash
# Usage: ./build.sh docker   OR   ./build.sh podman

if [ -z "$1" ]; then
    echo "Error: You must specify 'docker' or 'podman'"
    exit 1
fi

CONTAINER_TOOL=$1

# Build the image
$CONTAINER_TOOL build -t nyno:latest -f Dockerfile .


