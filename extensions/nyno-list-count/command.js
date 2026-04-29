// extensions/list-counter/command.js

export function nyno_list_count(args, context) {
  const setName = context.set_context || "prev";

  try {
    const items = args && args.length > 0 ? args[0] : [];

    if (!Array.isArray(items)) {
      throw new Error("Input must be a list");
    }

    context[setName] = items.length;

    return 0;

  } catch (e) {
    context[setName + ".error"] = {
      errorMessage: e.message || String(e)
    };
    return 1;
  }
}