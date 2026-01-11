

import App from '../../src/App.js'; // import the singleton

// Setup Postgres client
let pgClient = App.get('db_nyno_log');

export async function nyno_sql_insert_embedding(args, context) {
    const embedding = args[0];
    const meta = args[1] ?? {};

    if (!Array.isArray(embedding)) {
        throw new Error('args[0] must be an embedding array');
    }

    if (typeof meta !== 'object') {
        throw new Error('args[1] must be an object if provided');
    }

    // Convert JS array → pgvector literal
    const vectorLiteral = `[${embedding.join(',')}]`;

    const res = await pgClient.query(
        `
        INSERT INTO embeddings (embedding, meta)
        VALUES ($1::vector, $2::jsonb)
        RETURNING id
        `,
        [vectorLiteral, meta]
    );

    context.prev = res.rows[0];
    return 0;
}

