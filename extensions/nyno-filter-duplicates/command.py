# extensions/filter-duplicates/command.py
def nyno_filter_duplicates(args, context):
    set_name = context.get("set_context", "prev")
    try:
        # Get the list from args[0]
        items = args[0] if args else []
        if not isinstance(items, list):
            raise ValueError("Input must be a list")
        
        # Filter duplicates while preserving order
        seen = set()
        result = []
        for item in items:
            if item not in seen:
                seen.add(item)
                result.append(item)
        
        # Determine where to store result in context
        context[set_name] = result
        
        return 0  # success
    except Exception as e:
        # Store error in context
        context[set_name + ".error"] = {"errorMessage": str(e)}
        return 1  # failure

