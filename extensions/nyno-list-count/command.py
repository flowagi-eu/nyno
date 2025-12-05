# extensions/list-counter/command.py
import sys
import json

def nyno_list_count(args, context):
    set_name = context.get("set_context", "prev")
    try:
        # Extract list from args
        items = args[0] if args else []

        if not isinstance(items, list):
            raise ValueError("Input must be a list")

        # Count items
        count = len(items)

        # Determine output key (dynamic or default)
        context[set_name] = count

        return 0
    except Exception as e:
        context[set_name + ".error"] = {"errorMessage": str(e)}
        return 1

# ----------------------------
# CLI Support
# ----------------------------
if __name__ == "__main__":
    """
    Allows usage like:
        python command.py '[1,2,3,4]'
    or:
        python command.py '["a","b","b"]'
    """

    if len(sys.argv) < 2:
        print("Usage: python command.py '[1,2,3]'")
        sys.exit(1)

    try:
        # Parse first CLI argument as JSON list
        items = json.loads(sys.argv[1])

        # Run the extension directly
        context = {}
        exit_code = nyno_list_count([items], context)

        # Print the result to STDOUT
        print(json.dumps({
            "exit": exit_code,
            "context": context
        }, indent=2))

        sys.exit(exit_code)

    except Exception as e:
        print(json.dumps({
            "exit": 1,
            "error": str(e)
        }, indent=2))
        sys.exit(1)

