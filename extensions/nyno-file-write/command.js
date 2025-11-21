import fs from "fs";

export function nyno_file_write(args, context) {
    // Determine dynamic output key
    const setName = context.set_context ?? "nyno_file_write";

    // Validate arguments
    if (!args || args.length < 2) {
        context[`${setName}.error`] = {
            error: "Insufficient arguments. Expected: file_path, content"
        };
        return 1;
    }

    const [filePath, contentRaw] = args;

    // --- Support object input ---
    let content = contentRaw;
    if (typeof contentRaw === "object") {
        try {
            content = JSON.stringify(contentRaw, null, 2);
        } catch (err) {
            context[`${setName}.error`] = {
                error: "Failed to serialize object content: " + err.message,
            };
            return 1;
        }
    } else if (contentRaw === undefined || contentRaw === null) {
        content = ""; // treat nullish as empty content
    } else {
        content = String(contentRaw); // ensure it's a string
    }

    try {
        // Write to file
        fs.writeFileSync(filePath, content, { encoding: "utf-8" });

        // Store success result
        context[setName] = {
            file: filePath,
            bytes_written: Buffer.byteLength(content, "utf-8")
        };

        return 0;
    } catch (err) {
        context[`${setName}.error`] = { error: err.message };
        return 1;
    }
}

