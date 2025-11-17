import { readFile } from "fs/promises";
import path from "path";
import { runQuery, normalizeQuery } from "./lib/jsonl-util.js"; // keep runQuery generic

// Cache for loaded files: absPath -> array of objects
const loadedFiles = new Map();

/**
 * Load JSONL or JSON file into memory if not already loaded
 * Supports:
 *  - JSONL: one JSON object per line
 *  - JSON: array of objects
 */
async function getData(filePath) {
    const absPath = path.resolve(filePath);

    if (!loadedFiles.has(absPath)) {
        try {
            const data = await readFile(absPath, "utf-8");
            let jsonArray = [];

            if (absPath.endsWith(".jsonl")) {
                jsonArray = data
                    .split("\n")
                    .filter(Boolean)
                    .map(line => JSON.parse(line));
            } else if (absPath.endsWith(".json")) {
                const parsed = JSON.parse(data);
                if (Array.isArray(parsed)) jsonArray = parsed;
                else console.warn(`File ${absPath} is not an array, wrapping it in an array`);
            } else {
                console.warn(`File ${absPath} has unknown extension, attempting JSON parse`);
                const parsed = JSON.parse(data);
                jsonArray = Array.isArray(parsed) ? parsed : [parsed];
            }

            loadedFiles.set(absPath, jsonArray);
        } catch (err) {
            console.error(`Error loading file "${absPath}":`, err);
            loadedFiles.set(absPath, []); // fallback empty
        }
    }

    return loadedFiles.get(absPath);
}

/**
 * Nyno extension entry-point
 * args[0] = absolute file path
 * args[1] = SQL string or object query
 */
export async function nyno_json_sql(args, context) {
    const filePath = args[0];
    const queryInput = args[1];

    let setName = 'nyno_json_sql';
    if('set_context' in context) {
	setName = context['set_context'];
    }

    if (!filePath) {
        context[setName] = [];
        context.nyno_json_sql_query = null;
        return 1; // failure
    }

    const data = await getData(filePath);

    context.city_query = queryInput;
    const result = runQuery(data, args, context);

    context[setName] = result;
    context.nyno_json_sql_query = normalizeQuery(queryInput);

    return result.length > 0 ? 0 : 1; // 0 = success, 1 = failure/no data
}



async function demo() {
    const context = {};
    const tests = [
        { file: "./test/cities.jsonl", query: "SELECT * LIMIT 5" },
    ];

    for (const test of tests) {
        const code = await nyno_json_sql([test.file, test.query], context);
        console.log("Return code:", code); // 0 or 1
        console.log("Context:", context);  // full results stored here
    }
}



// Run demo if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
    demo();
}

