

import App from '../../src/App.js'; // import the singleton

// Setup Postgres client
let pgClient = App.get('db_nyno_log');

export async function nyno_sql_search_embedding(args, context) {
    const embedding = args[0];
    const limit = args[1] ?? 10;

    if (!Array.isArray(embedding)) {
        throw new Error('args[0] must be an embedding array');
    }

    if (!Number.isInteger(limit) || limit <= 0) {
        throw new Error('args[1] must be a positive integer');
    }

    // JS array → pgvector literal
    const vectorLiteral = `[${embedding.join(',')}]`;

    const res = await pgClient.query(
        `
        SELECT
            id,
            meta,
            embedding <=> $1::vector AS distance
        FROM embeddings
        ORDER BY embedding <=> $1::vector
        LIMIT $2
        `,
        [vectorLiteral, limit]
    );

    context.prev = res.rows;
    return 0;
}

