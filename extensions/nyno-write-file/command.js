import fs from "fs";

export function nyno_write_file(args, context) {
    // Determine output key (dynamic set_context)
    const setName = context.set_context ?? "nyno_write_file";

    // Validate arguments
    if (!args || args.length < 2) {
        context[`${setName}.error`] = {
            error: "Insufficient arguments. Expected: file_path, content"
        };
        return 1; // error code
    }

    const [filePath, content] = args;

    try {
        // Write to file
        fs.writeFileSync(filePath, content, { encoding: "utf-8" });

        // Store success result
        context[setName] = {
            file: filePath,
            bytes_written: Buffer.byteLength(content, "utf-8")
        };

        return 0; // success
    } catch (err) {
        // Store error dynamically
        context[`${setName}.error`] = { error: err.message };
        return 1; // file write failure
    }
}

