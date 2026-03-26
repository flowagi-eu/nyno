echo "=== PYTHON DEPS ==="
uv pip tree

echo "=== JAVASCRIPT DEPS ==="
npm ls --all --json
