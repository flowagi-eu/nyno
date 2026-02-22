// extensions/nyno_read_file/command.js
import fs from "fs";

export function nyno_file_read(args, context) {
    const setName = ("set_context" in context) ? context["set_context"] : "prev";

    if (!args || args.length === 0) {
        context[setName + ".error"] = { message: "No file path provided." };
        return 1;
    }

    const filePath = args[0];
    
    // ✅ Return 1 immediately if file does not exist
    if (!fs.existsSync(filePath)) {
        context[setName + ".error"] = { message: "File does not exist." };
        return 1;
    }

    try {
        const content = fs.readFileSync(filePath, "utf8");
	if(filePath.endsWith('json')) {
        	context[setName] = JSON.parse(content);

        } else {
        	context[setName] = content;
	}
        return 0;

    } catch (err) {
        context[setName + ".error"] = { message: err.message };
        return 1;
    }
}

