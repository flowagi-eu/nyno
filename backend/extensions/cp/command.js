export async function nyno_cp(args, context) {
  const setName = context?.set_context ?? "prev";
  const writeFs = context.SYSTEM.fs_write;

  try {
    const source = args?.[0];
    let dest = args?.[1];

    if (!source || !dest) {
      context[setName + "_error"] = {
        errorMessage: "usage: cp <src> <dest>",
      };
      return -1;
    }

    // Relative destination → same directory as source.
    if (!dest.startsWith("/")) {
      const dir = source.slice(
        0,
        source.lastIndexOf("/") + 1
      );

      dest = dir + dest;
    }

    context[setName] = await writeFs.cp(source, dest);

    return 0;
  } catch (err) {
    context[setName + "_error"] = {
      errorMessage: err.message,
    };

    return -1;
  }
}
