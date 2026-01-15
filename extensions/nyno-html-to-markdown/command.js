import TurndownService from 'turndown';
import { JSDOM } from 'jsdom';

export function nyno_html_to_markdown(args, context) {
    const input = args[0];
    if (!input) {
        const errMsg = "No HTML content provided in args[0]";
        console.error(errMsg);
        const setName = "set_context" in context ? context["set_context"] : "prev";
        context[setName + ".error"] = { errorMessage: errMsg };
        return 1;
    }

    const turndown = new TurndownService();
    const setName = "set_context" in context ? context["set_context"] : "prev";

    try {
        const processHtml = (html) => {
    const dom = new JSDOM(html);
    const document = dom.window.document;

    // ---- Extract front matter ----
    const frontMatter = {};

    const title = document.querySelector("title");
    if (title) frontMatter.title = title.textContent.trim();

    document.querySelectorAll("meta").forEach(meta => {
        const name =
            meta.getAttribute("name") ||
            meta.getAttribute("property");
        const content = meta.getAttribute("content");
        if (name && content) frontMatter[name] = content;
    });

    // ---- HARD FILTERING ----
    document.querySelectorAll(
        "script, style, noscript, template"
    ).forEach(el => el.remove());

    document.querySelectorAll("footer").forEach(el => el.remove());

    // ---- Pick real content ----
    const contentRoot =
        document.querySelector("main") ||
        document.querySelector("article") ||
        document.querySelector("[role='main']") ||
        document.body;

    const markdown = turndown.turndown(contentRoot.innerHTML);

    return { frontMatter, markdown };
};


        if (Array.isArray(input)) {
            context[setName] = input.map(processHtml);
        } else {
            context[setName] = processHtml(input);
        }

        return 0; // success
    } catch (err) {
        console.error(err);
        context[setName + ".error"] = { errorMessage: err.message };
        return 1; // failure
    }
}

