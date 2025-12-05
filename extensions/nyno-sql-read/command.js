import fs from 'fs';
import path from 'path';
import { Client } from 'pg';

import App from '../../src/App.js'; // import your singleton

// ------------------- Postgres setup -------------------
let pgClient = App.get('db_nyno_log');
if (!pgClient) {
    const envFilePath = path.resolve('./envs/.nyno_log_db.env');
    const {
        NYNO_DB_NAME: dbName,
        NYNO_DB_USER: dbUser,
        NYNO_DB_PASS: dbPass,
        NYNO_DB_HOST: dbHost = 'localhost',
        NYNO_DB_PORT: dbPort = '5432'
    } = App.loadEnvVars(envFilePath);

    const dbClient = new Client({
        user: dbUser,
        host: dbHost,
        password: dbPass,
        port: parseInt(dbPort),
        database: dbName
    });

    await dbClient.connect();
    App.set('db_nyno_log', dbClient);
    pgClient = App.get('db_nyno_log');
    console.log('[+TCP] Postgres client db_nyno_log connected');
}

if (!pgClient) throw new Error('Postgres client failed to initialize');

// ------------------- Nyno JSONB Read Extension -------------------
/**
 * Nyno workflow extension to query json_storage with keys, match, nested, order, limit, and offset.
 * Follows Nyno Extension Rules: receives args and context, stores output in context, returns integer.
 */
export async function nyno_sql_read(args, context) {
    const extensionName = "prev";
    let setName = context.set_context || extensionName;

    try {
        const {
            keys = [],
            match = null,
            nested = [],
            limit = null,
            offset = null,
            order = 'id',
            orderDirection = 'ASC'
        } = args[0] || {};

	console.log('offset in sql-read ext');

        let query = 'SELECT * FROM json_storage';
        const conditions = [];
        const values = [];

        if (keys.length > 0) {
            const keyConditions = keys.map((key) => {
                values.push(key);
                return `data ? $${values.length}`;
            });
            conditions.push(`(${keyConditions.join(' OR ')})`);
        }

        if (match && typeof match === 'object') {
            values.push(JSON.stringify(match));
            conditions.push(`data @> $${values.length}::jsonb`);
        }

        nested.forEach((item) => {
            const { path, value } = item;
            if (Array.isArray(path) && path.length > 0) {
                const pgPath = path.map(p => `'${p}'`).join(',');
                values.push(String(value));
                conditions.push(`data #>> ARRAY[${pgPath}] = $${values.length}`);
            }
        });

        if (conditions.length > 0) query += ' WHERE ' + conditions.join(' AND ');

        if (order) {
            const dir = (orderDirection || 'ASC').toUpperCase();
            if (dir !== 'ASC' && dir !== 'DESC') throw new Error("orderDirection must be ASC or DESC");
            query += ` ORDER BY ${order} ${dir}`;
        }

        if (typeof limit === 'number' && limit > 0) query += ` LIMIT ${limit}`;
        if (typeof offset === 'number' && offset >= 0) query += ` OFFSET ${offset}`;

        const res = await pgClient.query(query, values);
        context[setName] = res.rows;
        return 0;

    } catch (error) {
        context[setName + '.error'] = { errorMessage: error.message };
        return 1; // failure path
    }
}

// ------------------- Demo (standalone) -------------------
if (process.argv[1] === new URL(import.meta.url).pathname) {
    const context = {};
    await nyno_sql_read([{ keys: ["maps"], limit: 10, offset: 20 }], context);
    console.log(context);
    await pgClient.end();
}

