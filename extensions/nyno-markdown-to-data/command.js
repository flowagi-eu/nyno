// extensions/markdown-to-data/command.js
import matter from 'gray-matter';

export function nyno_markdown_to_data(args, context) {
    const input = args[0];
    const setName = "set_context" in context ? context["set_context"] : "prev";
    if (!input) {
        const errMsg = "No Markdown content provided in args[0]";
        console.error(errMsg);
        context[setName + ".error"] = { errorMessage: errMsg };
        return 1;
    }


    try {
        if (Array.isArray(input)) {
            // Handle list of Markdown strings
            context[setName] = input.map(item => {
                const { data: frontMatter, content } = matter(item);
                return { frontMatter, content };
            });
        } else {
            // Handle single Markdown string
            const { data: frontMatter, content } = matter(input);
            context[setName] = { frontMatter, content };
        }

        return 0; // success
    } catch (err) {
        console.error(err);
        context[setName + ".error"] = { errorMessage: err.message };
        return 2; // failure
    }
}

