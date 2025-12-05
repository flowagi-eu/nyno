export function nyno_sort_kv(args,context) {
    // Determine output variable name
    const setName = ("set_context" in context)
        ? context["set_context"]
        : "prev";

    try {
        // args[0] = object to sort
        const obj = args[0];
        if (!obj || typeof obj !== "object") {
            context[setName + ".error"] = { error: "args[0] must be an object" };
            return 1;
        }

        // args[1] = "asc" or "desc"
        const order = (args[1] || "asc").toLowerCase();

        // Convert dictionary → list of [key, value]
        const entries = Object.entries(obj);

        // Sort the array
        entries.sort((a, b) => {
            const av = Number(a[1]);
            const bv = Number(b[1]);

            if (order === "desc") return bv - av;
            return av - bv;
        });

        // Store sorted list in context
        context[setName] = entries;

        return 0;
    } catch (err) {
        context[setName + ".error"] = { error: err.message };
        return 2;
    }
}

