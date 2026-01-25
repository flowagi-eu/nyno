/**
 * Single-pass rendering: replaces ${key} with ctx[key]
 * - leaves unknown keys intact
 */
export function renderOnce(str, ctx, missing = null) {
  if (typeof str !== 'string') return str;

  //console.log('renderOnce str', JSON.stringify(str));
  //console.log('renderOnce ctx', JSON.stringify(ctx));

  // FULL replacement
  const fullMatch = str.match(/^\$\{([\w.]+)\}$/);
  if (fullMatch) {
    const path = fullMatch[1];
    const value = resolvePath(ctx, path);

    if (value === undefined) {
      missing?.add(path);
      return str;
    }

    // return raw value (not stringified)
    return value;
  }

  // PARTIAL replacement
  return str.replace(/\$\{([\w.]+)\}/g, (_, path) => {
    const value = resolvePath(ctx, path);

    if (value === undefined) {
      missing?.add(path);
      return `\${${path}}`;
    }

    return typeof value === 'string'
      ? value
      : JSON.stringify(value);
  });
}



function resolvePath(ctx, path) {
  // Fast path: exact key exists
  if (path in ctx) return ctx[path];

  // No dot and not found → missing
  if (!path.includes('.')) return undefined;

  // Deep path
  let current = ctx;
  for (const key of path.split('.')) {
    if (current && typeof current === 'object' && key in current) {
      current = current[key];
    } else {
      return undefined;
    }
  }
  return current;
}

export function renderArgs(args, ctx, missing) {
  //console.log('renderArgs args',args);
  return args.map(arg => {
    if (typeof arg !== 'string') return arg;

    // FULL replacement
    const fullMatch = arg.match(/^\$\{([\w.]+)\}$/);
    if (fullMatch) {
      const path = fullMatch[1];
      const value = resolvePath(ctx, path);

      if (value === undefined) {
        missing.add(path);
        return arg;
      }
      return value;
    }

    // PARTIAL replacement
    return arg.replace(/\$\{([\w.]+)\}/g, (_, path) => {
      const value = resolvePath(ctx, path);

      if (value === undefined) {
        missing.add(path);
        return `\${${path}}`;
      }

      return typeof value === 'string'
  ? value
  : JSON.stringify(value);
  
    });
  });
}

export function replaceNynoVariables(node, context = {}) {
 const missing = new Set();

  // 1. Rendered keys exists to prevent 
  if (!context.__renderedKeys) context.__renderedKeys = [];

  // Step-specific context additions
  const nodeContext = node.context || {};
  //console.log('nodeContext keys',Object.keys(nodeContext));
  //console.log('full context keys',Object.keys(context));
  const mergedContext = { ...context, ...nodeContext };
  //console.log('full mergedContext keys',Object.keys(mergedContext));
  for (const k of Object.keys(nodeContext)) {
    if (!context.__renderedKeys.includes(k)) {
      //console.log('PATH: renderOnce(k',k);
      context[k] = renderOnce(nodeContext[k], mergedContext);
      //console.log('PATH VAL',context[k]);
    } else {
      //console.log('PATH: nodeContext[k]',k);
      context[k] = nodeContext[k]; 
      //console.log('PATH VAL',context[k]);
    }
  }

  // add all keys to already rendered
  for (const k of Object.keys(context)) {
    if (!context.__renderedKeys.includes(k)) {
      context.__renderedKeys.push(k);
    }
  }


  // Render args
  //console.log('full Render args context keys',Object.keys(context));

  const args = renderArgs(node.args || [], context, missing);

if (missing.size > 0) {
    return [true, [], { missing: [...missing] }];
  }

  return [ false, args, context ]; // error false
}
