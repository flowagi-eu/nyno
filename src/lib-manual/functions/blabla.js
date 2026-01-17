

// generate dynamic function both for production & testing
export function generateDF(isTesting=false) {
  return async function(step,rawArgs,prevContext={}) {


    const [error, args, context] = replaceNynoVariables({ step, args: rawArgs }, prevContext);
	//  if(error) console.log("ERRROR!!!!",error,args,context);

    context.LAST_STEP = step;

    if (error) return { c: context, r: -1 };

    // Simulate function outputs
    const returnCode = 0;

    // Store prev values
    // replace this with actual call based on step name (step)
    if(isTesting) {
	 // for testing
    	context.prev = args[0];
    	context.prev_ret = returnCode;
    } else {
	// todo
    }

    // Any new keys added dynamically are automatically added to renderedKeys
    Object.keys(context).forEach(k => {
      if (k !== '__renderedKeys' && !context.__renderedKeys.includes(k)) {
        context.__renderedKeys.push(k);
      }
    });

    return {
      c: context,
      r: returnCode,
      args
    };
  }
}
		

/** ---------------- Render-once helpers ---------------- */

/**
 * Single-pass rendering: replaces ${key} with ctx[key]
 * - leaves unknown keys intact
 */
export function renderOnce(str, ctx, missing) {
  if (typeof str !== 'string') return str;

  return str.replace(/\$\{(\w+)\}/g, (_, key) => {
    if (!(key in ctx)) {
      missing.add(key);
      return `\${${key}}`;
    }

    return typeof ctx[key] === 'string'
  ? ctx[key]
  : JSON.stringify(ctx[key]);


  });
}


/**
 * Safely get a context value:
 * - render only once
 * - mark rendered keys inside ctx.__renderedKeys
 */
export function getContextValue(key, ctx, missing) {
  if (!(key in ctx)) {
    missing.add(key);
    return `\${${key}}`;
  }

  if (!ctx.__renderedKeys) ctx.__renderedKeys = [];

  if (ctx.__renderedKeys.includes(key)) {
    return ctx[key];
  }

  const rendered = renderOnce(ctx[key], ctx, missing);
  ctx[key] = rendered;
  ctx.__renderedKeys.push(key);

  return rendered;
}



export function renderArgs(args, ctx, missing) {
  return args.map(arg => {
    if (typeof arg !== 'string') return arg;

    // FULL replacement: "${key}" → raw value (object-safe)
    const fullMatch = arg.match(/^\$\{(\w+)\}$/);
    if (fullMatch) {
      const key = fullMatch[1];
      if (!(key in ctx)) {
        missing.add(key);
        return arg;
      }
      return ctx[key];
    }

    // PARTIAL replacement → string
    return arg.replace(/\$\{(\w+)\}/g, (_, key) => {
      if (!(key in ctx)) {
        missing.add(key);
        return `\${${key}}`;
      }
      return String(getContextValue(key, ctx, missing));
    });
  });
}


/** ---------------- replaceNynoVariables ---------------- */

export function replaceNynoVariables(node, prevContext = {}) {
 const missing = new Set();
  const context = { ...prevContext };
  if (!context.__renderedKeys) context.__renderedKeys = [];



  // Step-specific context additions
  const nodeContext = node.set_context || {};
  for (const k in nodeContext) {
    if (!context.__renderedKeys.includes(k)) {
      context[k] = renderOnce(nodeContext[k], context,missing);
      context.__renderedKeys.push(k);
    }
  }

  // Render args
  const args = renderArgs(node.args || [], context, missing);

if (missing.size > 0) {
    return [true, [], { missing: [...missing] }];
  }

  return [ false, args, context ]; // error false
}
