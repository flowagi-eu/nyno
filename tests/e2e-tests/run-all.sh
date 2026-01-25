#!/bin/bash

# Note: You need to install nyno-lang for this: https://github.com/empowerd-cms/nyno-lang

for file in *.nyno; do
    [ -e "$file" ] || continue  # skip if no .nyno files exist
    echo "Running: $file"
    nyno "$file"
done

