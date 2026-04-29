// extensions/array_item_or_null/command.js

export function nyno_array_to_item(args, context) {
  const setName = context.set_context || "prev";

  let value = null;

  if (args && args.length > 0) {
    const firstArg = args[0];

    if (Array.isArray(firstArg)) {
      value = firstArg.length > 0 ? firstArg[firstArg.length - 1] : null;
    } else {
      value = firstArg;
    }
  }

  context[setName] = value;

  return value === null ? 1 : 0;
}