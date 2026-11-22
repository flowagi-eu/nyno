// extensions/nyno-copy-context/command.js
import { renderOnce } from './index.js';

export async function nyno_render_context(args, context) {
  const newContext = {};
  try {
    let setName = context.set_context ?? 'prev';
    const key = args?.[0];

    if (!key) {
      newContext["copy_context_error"] = { errorMessage: "Missing key in args[0]" };
      return [-1, context];
    }

    const valueToReplace = context[key];

    // Direct assignment (no set_context, no nesting)
    newContext[setName] = renderOnce(valueToReplace, context);
    return [0, newContext];
  } catch (err) {
    newContext["copy_context_error"] = { errorMessage: err.message };
    return [-1, newContext];
  }
}
