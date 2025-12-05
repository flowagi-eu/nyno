import fs from "fs";
import path from "path";

/**
 * Nyno Extension: grep-like file search in a directory
 * - Skips ZIP, ISO, image, and video files
 *
 * args:
 *   args[0] = search pattern (string or regex)
 *   args[1] = directory path
 *   args[2] = recursive ("true" / "false")
 */
export function nyno_search_grep(args, context) {
    const pattern = args[0];
    const dir = args[1] || ".";
    const recursive = (args[2] === "true");

    const setName = context.set_context ? context.set_context : "prev";

    if (!pattern) {
        context[setName + ".error"] = { error: "Missing search pattern." };
        return 1;
    }

    let regex;
    try {
        regex = new RegExp(pattern, "i");
    } catch (err) {
        context[setName + ".error"] = { error: "Invalid regex: " + err.message };
        return 2;
    }

    const skipExtensions = new Set([
        // archives / disk images
        ".zip", ".rar", ".7z", ".tar", ".gz", ".bz2", ".iso",

        // images
        ".png", ".jpg", ".jpeg", ".gif", ".bmp", ".webp", ".tiff", ".svg",

        // video
        ".mp4", ".mkv", ".avi", ".mov", ".wmv", ".flv", ".webm"
    ]);

    function shouldSkip(filePath) {
        const ext = path.extname(filePath).toLowerCase();
        return skipExtensions.has(ext);
    }

    let results = [];

    function scanDir(targetDir) {
        const entries = fs.readdirSync(targetDir, { withFileTypes: true });

        for (const entry of entries) {
            const fullPath = path.join(targetDir, entry.name);

            if (entry.isDirectory()) {
                if (recursive) scanDir(fullPath);
                continue;
            }

            if (shouldSkip(fullPath)) {
                continue;
            }

            try {
                const fileContent = fs.readFileSync(fullPath, "utf8");
                const lines = fileContent.split("\n");

                lines.forEach((line, idx) => {
                    if (regex.test(line)) {
                        results.push({
                            file: fullPath,
                            lineNumber: idx + 1,
                            text: line.trim()
                        });
                    }
                });
            } catch (err) {
                results.push({
                    file: fullPath,
                    error: "Unable to read file: " + err.message
                });
            }
        }
    }

    try {
        scanDir(dir);
    } catch (err) {
        context[setName + ".error"] = { error: err.message };
        return 3;
    }

    context[setName] = results;
    return 0;
}

