# extensions/glob_v/command.py
import glob
import os

def nyno_glob_v(args, context):
    """
    Nyno extension to find files matching a glob pattern but exclude files containing a specific string (-v style).

    args[0] = glob pattern (str)
    args[1] = string to exclude (str)
    """
    extension_name = "prev"

    if not args or len(args) < 2:
        context[f"{extension_name}.error"] = {"errorMessage": "Require 2 arguments: glob_pattern and exclude_string"}
        return 1  # error

    glob_pattern = args[0]
    exclude_string = args[1]

    # Step 1: Find all files matching the glob
    all_files = glob.glob(glob_pattern, recursive=True)

    # Step 2: Exclude files containing the exclusion string (-v)
    filtered_files = []
    for file_path in all_files:
        if os.path.isfile(file_path):
            try:
                exclude = False
                with open(file_path, "r", encoding="utf-8") as f:
                    for line in f:
                        if exclude_string in line:
                            exclude = True
                            break
                if not exclude:
                    filtered_files.append(file_path)
            except Exception as e:
                context[f"{extension_name}.error.{file_path}"] = {"errorMessage": str(e)}

    # Save results in context under the extension name
    context[extension_name] = filtered_files
    return 0  # success

