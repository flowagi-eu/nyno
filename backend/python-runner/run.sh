SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
export PYTHONPATH="$SCRIPT_DIR"
uv run --project "$SCRIPT_DIR" "$SCRIPT_DIR/runner.py"

