import { readdir } from "fs/promises";
import { glob } from "glob";

export async function nyno_ls_objs(args, context) {
  try {
    const setName = context?.set_context ?? "prev";
    const input = args?.[0] ?? ".";

    let files;

    // CASE 1: no glob → native readdir
    if (!input.includes("*")) {
      const entries = await readdir(input, { withFileTypes: true });

      files = await Promise.all(
        entries.map(async (entry) => {
          const path = `${input}/${entry.name}`;
          const stat = await import("fs/promises").then((fs) => fs.stat(path));

          return {
            filename: entry.name,
            dir: entry.isDirectory(),
            mtime: stat.mtimeMs,
          };
        })
      );
    } else {
      // CASE 2: glob
      const matches = await glob(input, {
        dot: true,
        nodir: false,
        stat: true,
      });

      files = matches.map((match) => ({
        filename: match.fullpath() ?? match.toString(),
        dir: match.stat?.isDirectory() ?? false,
        mtime: match.stat?.mtimeMs ?? 0,
      }));
    }

    // newest first
    files.sort((a, b) => b.mtime - a.mtime);

    // remove mtime if you don't want it
    context[setName] = files.map(({ filename, dir }) => ({
      filename,
      dir,
    }));

    return 0;
  } catch (err) {
    const setName = context?.set_context ?? "prev";

    context[setName + "_error"] = {
      errorMessage: err.message || "nyno_ls failed",
    };

    return -1;
  }
}
