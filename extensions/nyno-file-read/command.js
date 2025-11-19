// extensions/nyno_read_file/command.js
import fs from "fs";

export function nyno_file_read(args, context) {
    const setName = ("set_context" in context) ? context["set_context"] : "nyno_file_read";

    if (!args || args.length === 0) {
        context[setName + ".error"] = { message: "No file path provided." };
        return 1;
    }

    const filePath = args[0];

    try {
        const content = fs.readFileSync(filePath, "utf8");
        context[setName] = content;
        return 0;

    } catch (err) {
        context[setName + ".error"] = { message: err.message };
        return 1;
    }
}

