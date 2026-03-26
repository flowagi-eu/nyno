import { promises as fs } from "fs";

/**
 * Nyno Directory Create Extension
 * args[0] = directory path to create
 */
export async function nyno_dir_create(args, context) {
  const dirPath = args?.[0];

  const setName = context?.set_context ?? "prev";

  if (!dirPath || typeof dirPath !== "string") {
    context[setName + "_error"] = {
      errorMessage: "Invalid or missing directory path in args[0]"
    };
    return -1;
  }

  try {
    // Create directory recursively
    await fs.mkdir(dirPath, { recursive: true });

    context[setName] = {
      success: true,
      path: dirPath,
      message: `Directory created successfully at ${dirPath}`
    };

    return 0;
  } catch (error) {
    context[setName + "_error"] = {
      errorMessage: error.message,
      path: dirPath
    };
    return -1;
  }
}
