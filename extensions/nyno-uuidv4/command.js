// extensions/uuidv4-js/command.js

import crypto from "crypto";

export function nyno_uuidv4(args, context) {
  try {
    // Determine where to store the output
    const setName = context?.set_context ?? "prev";

    // Generate UUID v4
    const uuid =
      typeof crypto.randomUUID === "function"
        ? crypto.randomUUID()
        : "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, c => {
            const r = (Math.random() * 16) | 0;
            const v = c === "x" ? r : (r & 0x3) | 0x8;
            return v.toString(16);
          });

    // Store result in context
    context[setName] = uuid;

    return 0; // success
  } catch (error) {
    const setName = context?.set_context ?? "prev";
    context[setName + ".error"] = {
      errorMessage: error.message
    };
    return 1; // failure path
  }
}

