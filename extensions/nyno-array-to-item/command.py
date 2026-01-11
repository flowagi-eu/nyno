# extensions/array_item_or_null/command.py

def nyno_array_to_item(args, context):
    # Determine output context key
    set_name = context.get('set_context', 'prev')

    # Check if args[0] exists
    if args and len(args) > 0:
        first_arg = args[0]
        # If it's a list, take the last item or None
        if isinstance(first_arg, list):
            value = first_arg[-1] if first_arg else None
        else:
            value = first_arg
    else:
        value = None

    context[set_name] = value

    # Return 1 if value is None, else 0
    return 1 if value is None else 0

