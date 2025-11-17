#!/bin/bash

for file in *.nyno; do
    [ -e "$file" ] || continue  # skip if no .nyno files exist
    echo "Running: $file"
    nyno "$file"
done

