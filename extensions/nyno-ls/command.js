import { readdir } from "fs/promises";
import { glob } from "glob";

export async function nyno_ls(args, context) {
  try {
    const setName = context?.set_context ?? "prev";
    const input = args?.[0] ?? ".";

    // CASE 1: no glob → fast native ls
    if (!input.includes("*")) {
      const files = await readdir(input);
      context[setName] = files;
      return 0;
    }

    // CASE 2: glob → use glob engine
    const files = await glob(input, {
      dot: true,
      nodir: false,
    });

    context[setName] = files;

    return 0;
  } catch (err) {
    const setName = context?.set_context ?? "prev";

    context[setName + "_error"] = {
      errorMessage: err.message || "nyno_ls failed",
    };

    return -1;
  }
}
