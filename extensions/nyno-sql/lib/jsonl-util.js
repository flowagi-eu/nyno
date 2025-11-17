import { readFile } from "fs/promises";

/**
 * Load a JSONL file into memory
 */
export async function load(filename) {
    try {
        const data = await readFile(filename, "utf-8");
        return data
            .split("\n")
            .filter(Boolean)
            .map(line => JSON.parse(line));
    } catch (err) {
        console.error("Error loading JSONL file:", err);
        return [];
    }
}

/**
 * Parse simple SQL-like string into object style
 */
export function parseSQL(sql) {
    const result = {
        select: "*",
        where: {},
        orderBy: null,
        limit: null
    };

    if (!sql) return result;

    sql = sql.trim().replace(/\s+/g, " ");

    // SELECT
    const selectMatch = sql.match(/SELECT\s+(.+?)\s+(WHERE|ORDER BY|LIMIT|$)/i);
    if (selectMatch) {
        const sel = selectMatch[1].trim();
        result.select = sel === "*" ? "*" : sel.split(/\s*,\s*/);
    }

    // WHERE
    const whereMatch = sql.match(/WHERE\s+(.+?)(ORDER BY|LIMIT|$)/i);
    if (whereMatch) {
        const conditions = whereMatch[1].split(/\s+AND\s+/i);
        for (const cond of conditions) {
            const m = cond.match(/(\w+)\s*(=|!=|>=|<=|>|<)\s*(.+)/);
            if (m) {
                const [, field, op, val] = m;
                const parsedVal = isNaN(val) ? val.replace(/^["']|["']$/g, "") : Number(val);
                result.where[field] = { op, value: parsedVal };
            }
        }
    }

    // ORDER BY
    const orderMatch = sql.match(/ORDER BY\s+(\w+)(?:\s+(ASC|DESC))?/i);
    if (orderMatch) {
        result.orderBy = { field: orderMatch[1], dir: (orderMatch[2] || "ASC").toLowerCase() };
    }

    // LIMIT
    const limitMatch = sql.match(/LIMIT\s+(\d+)/i);
    if (limitMatch) result.limit = Number(limitMatch[1]);

    return result;
}

/**
 * Accepts either SQL string or object, returns safe object
 */
export function normalizeQuery(city_query) {
    if (!city_query) return {};
    return typeof city_query === "string" ? parseSQL(city_query) : city_query;
}

/**
 * Run query on in-memory cityData
 */
export function runQuery(cityData, args = [], context = {}) {
    if (!cityData || !context.city_query) return [];

    const query = normalizeQuery(context.city_query);

    let result = [...cityData];

    // WHERE
    if (query.where) {
        for (const field in query.where) {
            const { op, value } = query.where[field];
            result = result.filter(r => {
                const val = r[field];
                switch (op) {
                    case "=": return val === value;
                    case "!=": return val !== value;
                    case ">": return val > value;
                    case "<": return val < value;
                    case ">=": return val >= value;
                    case "<=": return val <= value;
                    default: return true;
                }
            });
        }
    }

    // ORDER BY
    if (query.orderBy) {
        const { field, dir } = query.orderBy;
        result.sort((a, b) => dir === "asc" ? a[field] - b[field] : b[field] - a[field]);
    }

    // LIMIT
    if (query.limit !== null && query.limit !== undefined) {
        result = result.slice(0, query.limit);
    }

    // SELECT
    if (query.select !== "*" && Array.isArray(query.select)) {
        result = result.map(r => {
            const obj = {};
            for (const f of query.select) obj[f] = r[f];
            return obj;
        });
    }

    return result;
}

