export async function file_move(args, context) {
  try {
    const writeFs = context.SYSTEM.fs_write;

    const setName = context?.set_context ?? "prev";

    const source = args?.[0];
    let dest = args?.[1];

    if (!source || !dest) {
      context[setName + "_error"] = {
        errorMessage: "usage: mv <src> <dest>",
      };
      return [-1, context];
    }

    // If destination is not absolute, place it in the source's directory.
    if (!dest.startsWith("/")) {
      const dir = source.slice(
        0,
        source.lastIndexOf("/") + 1
      );

      dest = dir + dest;
    }

    context[setName] = await writeFs.mv(source, dest);

    return [0, context];
  } catch (err) {
    const setName = context?.set_context ?? "prev";

    context[setName + "_error"] = {
      errorMessage: err.message,
    };

    return [-1,context];
  }
}
