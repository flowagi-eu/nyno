import glob
import os

def nyno_search_files(args, context):
    """
    Args:
        args[0] = list of paths/globs, e.g. [".path/dir1/*.command", ".path/dir1/template.yml"]
        args[1] = optional: 'object' => return dict, otherwise return formatted text
    Context:
        Optional: context['set_context'] to define custom output key
    """
    if not args or not isinstance(args[0], list):
        context['nyno_read_files.error'] = "Usage: args[0]=list of file paths or globs, args[1]='object' optional"
        return 1

    paths = args[0]
    return_object = len(args) > 1 and isinstance(args[1], str) and args[1].lower() == 'object'
    set_name = context.get("set_context", 'prev')

    result = {}
    text_output = ""

    for path_pattern in paths:
        for filepath in glob.glob(path_pattern, recursive=True):
            if os.path.isfile(filepath):
                try:
                    with open(filepath, "r", encoding="utf-8") as f:
                        content = f.read()
                    filename = os.path.basename(filepath)
                    result[filename] = content
                    if not return_object:
                        text_output += f"cat {filename}:\n{content}\n\n"
                except Exception as e:
                    context[f"{set_name}.error"] = f"Error reading {filepath}: {str(e)}"
                    return 2

    context[set_name] = result if return_object else text_output.strip()
    return 0

