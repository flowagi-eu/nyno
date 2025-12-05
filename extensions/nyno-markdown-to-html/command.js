// extensions/markdown-to-html/command.js
import matter from 'gray-matter';
import MarkdownIt from 'markdown-it';

export function nyno_markdown_to_html(args, context) {
    const input = args[0];
    if (!input) {
        const errMsg = "No Markdown content provided in args[0]";
        console.error(errMsg);
        const setName = "set_context" in context ? context["set_context"] : "prev";
        context[setName + ".error"] = { errorMessage: errMsg };
        return 1;
    }

    const md = new MarkdownIt();
    const setName = "set_context" in context ? context["set_context"] : "prev";

    try {
        if (Array.isArray(input)) {
            // Handle list of Markdown strings
            context[setName] = input.map(item => {
                const { data: frontMatter, content } = matter(item);
                const html = md.render(content);
                return { frontMatter, html };
            });
        } else {
            // Handle single Markdown string
            const { data: frontMatter, content } = matter(input);
            const html = md.render(content);
            context[setName] = { frontMatter, html };
        }

        return 0; // success
    } catch (err) {
        console.error(err);
        context[setName + ".error"] = { errorMessage: err.message };
        return 1; // failure
    }
}

