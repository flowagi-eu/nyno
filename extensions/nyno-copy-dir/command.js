// extensions/copy-dir/command.js
import fs from 'fs';
import path from 'path';

export function nyno_copy_dir(args, context) {
    // 1. Validate args
    if (args.length < 2) {
        const setName = context?.set_context ?? "prev";
        context[setName + "_error"] = { errorMessage: "Source and destination paths are required." };
        return -1;
    }

    const [source, destination] = args;
    const setName = context?.set_context ?? "prev";

    // 2. Resolve paths (prevent path traversal)
    const resolvedSource = path.resolve(source);
    const resolvedDest = path.resolve(destination);

    // 3. Check if source exists and is a directory
    if (!fs.existsSync(resolvedSource) || !fs.statSync(resolvedSource).isDirectory()) {
        context[setName + "_error"] = { errorMessage: "Source directory does not exist or is not a directory." };
        return -1;
    }

    // 4. Create destination directory if it doesn't exist
    if (!fs.existsSync(resolvedDest)) {
        fs.mkdirSync(resolvedDest, { recursive: true });
    }

    // 5. Copy directory recursively
    try {
        copyDirRecursive(resolvedSource, resolvedDest);
        context[setName] = { success: true, message: `Copied ${source} to ${destination}` };
        return 0;
    } catch (error) {
        context[setName + "_error"] = { errorMessage: error.message };
        return -1;
    }
}

// Helper function: Recursively copy directory
function copyDirRecursive(src, dest) {
    const entries = fs.readdirSync(src, { withFileTypes: true });

    for (const entry of entries) {
        const srcPath = path.join(src, entry.name);
        const destPath = path.join(dest, entry.name);

        if (entry.isDirectory()) {
            fs.mkdirSync(destPath, { recursive: true });
            copyDirRecursive(srcPath, destPath);
        } else {
            fs.copyFileSync(srcPath, destPath);
        }
    }
}

