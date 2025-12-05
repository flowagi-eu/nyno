# extensions/html_to_markdown/command.py
from html_to_markdown import convert

# Nyno extension: Convert HTML to Markdown using the Rust-based html-to-markdown library

def nyno_html_to_markdown(args, context):
    # Determine input HTML
        # args[0] may be a string or a list of HTML strings
    first_arg = args[0] if args else ""
    if isinstance(first_arg, list):
        html_inputs = first_arg
    else:
        html_inputs = [first_arg]

    # Determine output context key
    if "set_context" in context:
        set_name = context["set_context"]
    else:
        set_name = "prev"

    try:
        # Convert HTML → Markdown
                        # Convert each HTML item to Markdown
        md_list = []
        for item in html_inputs:
            md_list.append(convert(item))

        # Preserve original type: single string in → single string out
        if isinstance(first_arg, list):
            md = md_list
        else:
            md = []
        for item in html_inputs:
            md.append(convert(item))

        # Store result
        context[set_name] = md

        return 0

    except Exception as e:
        # Store error
        context[f"{set_name}.error"] = {"error": str(e)}
        return 1

