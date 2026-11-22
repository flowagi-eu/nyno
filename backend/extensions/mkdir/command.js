/**
 * Nyno Directory Create Extension
 * args[0] = directory path to create
 */
export async function nyno_mkdir(args, context) {
  const fs_write = context.SYSTEM.context.fs_write;
  const dirPath = args?.[0];

  const setName = context?.set_context ?? "prev";

  if (!dirPath || typeof dirPath !== "string") {
    context[setName + "_error"] = {
      errorMessage: "Invalid or missing directory path in args[0]"
    };
    return -1;
  }

  try {
    // Create directory using sandbox fs
    const result = await fs_write.mkdir(dirPath);

    if (result[0] !== 0) {
      context[setName + "_error"] = {
        errorMessage: result[1].message,
        path: dirPath
      };
      return -1;
    }

    context[setName] = {
      success: true,
      path: dirPath,
      message: `Directory created successfully at ${dirPath}`
    };

    return 0;
  } catch (error) {
    const errObj = {
      errorMessage: error.message,
      path: dirPath,
    };
    console.log('errObj',errObj);
    context[setName + "_error"] = errObj;
    return -1;
  }
}
