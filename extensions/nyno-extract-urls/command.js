// extensions/extract-urls/command.js
export function nyno_extract_urls(args, context) {
	try {
        // Determine output key
        const setName =
            ("set_context" in context) ? context["set_context"] : "prev";

        // ---- INPUT HANDLING ----
        let inputs = args[0];
        if (!Array.isArray(inputs)) inputs = [inputs];

        const include = args.length > 1 ? args[1] : null;

        // ---- SAFE URL REGEXES ----
        const markdownLinkRegex = /\[[^\]]*?\]\(([^)\]]+)\)/g;
        const parenthesisRegex =
            /\((https?:\/\/[^)\]]+|\.{0,2}\/[^)\]]+|[A-Za-z0-9_\-./]+)\)/g;
        const absoluteUrlRegex = /\bhttps?:\/\/[^\s\])'"]+/g;
        const relativeUrlRegex =
            /\b(?:\.{1,2}\/[A-Za-z0-9_\-./]+|[A-Za-z0-9_\-]+(?:\/[A-Za-z0-9_\-./]+)*\.(?:php|html?|svg|gif|jpg|png|css|js))(?=[^\]])/g;

        const found = new Set();

        // ---- ONLY CLEANING RULE: split on space ----
        function clean(url) {
            if (!url) return null;
            url = url.trim();

            // If URL contains space → take first token
            if (url.includes(" ")) {
                url = url.split(" ")[0];
            }

            return url;
        }

        // ---- PROCESS EACH INPUT ----
        for (const raw of inputs) {
            const text = String(raw);
            let m;

            while ((m = markdownLinkRegex.exec(text)) !== null) {
                const cleaned = clean(m[1]);
                if (cleaned) found.add(cleaned);
            }

            while ((m = parenthesisRegex.exec(text)) !== null) {
                const cleaned = clean(m[1]);
                if (cleaned) found.add(cleaned);
            }

            while ((m = absoluteUrlRegex.exec(text)) !== null) {
                const cleaned = clean(m[0]);
                if (cleaned) found.add(cleaned);
            }

            while ((m = relativeUrlRegex.exec(text)) !== null) {
                const cleaned = clean(m[0]);
                if (cleaned) found.add(cleaned);
            }
        }

        // Turn Set → array
        let result = Array.from(found);

        // Optional include filter
        if (include) {
            result = result.filter(url => url.includes(include));
        }

        context[setName] = result;
        return 0;
    } catch (error) {
        const setName =
            "set_context" in context ? context["set_context"] : "prev";
        context[setName + ".error"] = { errorMessage: error.message };
        return 1; // failure
    }
}

