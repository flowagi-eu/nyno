// extensions/pwd/command.js

export function nyno_pwd(args, context) {
  try {
    const setName = context?.set_context ?? "prev";

    const cwd = process.cwd();

    context[setName] = cwd;

    return 0;
  } catch (err) {
    const setName = context?.set_context ?? "prev";

    context[setName + "_error"] = {
      errorMessage: err.message || "Failed to get current directory",
    };

    return -1;
  }
}
