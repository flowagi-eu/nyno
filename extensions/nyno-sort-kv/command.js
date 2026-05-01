export function nyno_sort_kv(args, context) {
    const setName = context?.set_context || "prev";

    try {
        const obj = args?.[0] ?? null;

        if (typeof obj !== "object" || obj === null || Array.isArray(obj)) {
            context[`${setName}.error`] = {
                error: "args[0] must be an object"
            };
            return 1;
        }

        const order = String(args?.[1] ?? "asc").toLowerCase();

        // Convert object → [key, value] pairs
        const entries = Object.entries(obj);

        // Sort entries
        entries.sort((a, b) => {
            const av = Number(a[1]);
            const bv = Number(b[1]);

            if (order === "desc") {
                return bv - av;
            }

            return av - bv;
        });

        context[setName] = entries;

        return 0;

    } catch (err) {
        context[`${setName}.error`] = {
            error: err?.message || String(err)
        };
        return 2;
    }
}