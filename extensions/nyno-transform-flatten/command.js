export function nyno_transform_flatten(args, context) {
  let input = args[0]; // original input
  const wasArray = Array.isArray(input); // remember if input was array

  let list = wasArray ? input : [input]; // wrap non-array temporarily

  console.log('EXTENSION DEBUG! transform flatten list or JSON sr?', list);

  const path = args[1]; // e.g., "data" or "items.children"
  const setName = context["set_context"] ?? "prev";

  if (!path || typeof path !== "string") {
    context[setName + ".error"] = { error: "args[1] must be a path string" };
    return 0;
  }

  // Helper to get nested value by dot-path
  const getPath = (obj, path) =>
    path.split(".").reduce((acc, key) => (acc ? acc[key] : undefined), obj);

  // Extract and flatten one level
  const output = [];
  for (const item of list) {
    const arr = getPath(item, path);
    if (Array.isArray(arr)) {
      output.push(...arr); // flatten one level
    } else if (arr != null) {
      output.push(arr);
    }
  }

  // Respect original input type
  context[setName] = wasArray ? output : (output.length === 1 ? output[0] : output);

  return 0;
}

