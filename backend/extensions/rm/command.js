//
export async function nyno_rm(args, context) {
  try {

    const writeFs = context.SYSTEM.fs_write;

    const setName = context?.set_context ?? "prev";
    const input = args?.[0];

    if (!input) {
      context[setName + "_error"] = {
        errorMessage: "no path provided",
      };
      return -1;
    }

    context[setName] = await writeFs.rm(input);

    return 0;
  } catch (err) {
    const setName = context?.set_context ?? "prev";

    context[setName + "_error"] = {
      errorMessage: err.message || "rm failed",
    };

    return -1;
  }
}
