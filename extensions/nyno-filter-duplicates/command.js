// extensions/filter-duplicates/command.js

export function nyno_filter_duplicates(args, context) {
  const setName = context.set_context || "prev";

  try {
    const items = args && args.length > 0 ? args[0] : [];

    if (!Array.isArray(items)) {
      throw new Error("Input must be a list");
    }

    const seen = new Set();
    const result = [];

    for (const item of items) {
      if (!seen.has(item)) {
        seen.add(item);
        result.push(item);
      }
    }

    context[setName] = result;

    return 0; // success

  } catch (e) {
    context[setName + ".error"] = {
      errorMessage: e.message || String(e)
    };
    return 1; // failure
  }
}