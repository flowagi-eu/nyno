// extensions/nyno-copy-context/command.js

export async function nyno_copy_context(args, context) {
  try {
    const key = args?.[0];
    const value = args?.[1];

    if (!key) {
      context["copy_context_error"] = { errorMessage: "Missing key in args[0]" };
      return [-1, context];
    }

    // Direct assignment (no set_context, no nesting)
    context[key] = value;

    return [0, context];
  } catch (err) {
    context["copy_context_error"] = { errorMessage: err.message };
    return [-1, context];
  }
}
