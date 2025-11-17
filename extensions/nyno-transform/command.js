// Nyno-compatible generic transformer (eval-free, %.key% syntax)
export function nyno_transform(args, context) {
  const list = args[0];
  const transformations = args.slice(1);
  const setName = 'nyno_transform';

  if (!Array.isArray(list)) {
    context[setName + '.error'] = { error: "args[0] must be an array" };
    return 0;
  }

  if (!transformations.length) {
    context[setName + '.error'] = { error: "At least one transformation (args[1]) is required" };
    return 0;
  }

  // Compile a transformation spec
  const compile = spec => {
    if (typeof spec !== 'string') {
      throw new Error('Transformation must be a string');
    }

    const template = spec.trim();

    return obj => {
      let result = template;

      // Replace all %.key% placeholders
      let start = result.indexOf('%.');
      while (start !== -1) {
        const end = result.indexOf('%', start + 2);
        if (end === -1) break; // unmatched %

        const key = result.slice(start + 2, end).trim();
        let value;
        if (key === '.') {
          // whole object
          value = typeof obj === 'object' ? JSON.stringify(obj) : obj ?? '';
        } else {
          value = obj[key] != null ? obj[key] : '';
        }

        result = result.slice(0, start) + value + result.slice(end + 1);
        start = result.indexOf('%.');
      }

      return result;
    };
  };

  // Compile all transformations
  let fns;
  try {
    fns = transformations.map(compile);
  } catch (err) {
    context[setName + '.error'] = { error: err.message };
    return 0;
  }

  // Apply transformations
  const output = list.map(item => {
    try {
      const result = fns.map(fn => fn(item));
      return result.length === 1 ? result[0] : result; // flatten if only one transformation
    } catch (err) {
      return { error: `Transformation failed: ${err.message}` };
    }
  });

  context[setName] = output;
  return 0;
}

