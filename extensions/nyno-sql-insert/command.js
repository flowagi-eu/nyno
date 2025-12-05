import fs from 'fs';
import path from 'path';
import { Client } from 'pg';

import App from '../../src/App.js'; // import the singleton

// Setup Postgres client
let pgClient = App.get('db_nyno_log');
if (!pgClient) {
    const envFilePath = path.resolve('./envs/.nyno_log_db.env'); // from setup.sh
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

export async function nyno_sql_insert(args, context) {
	let payload = args[0]; // could be string or object
    console.log({ payload });

    // If it's already an object, stringify it
    if (typeof payload === "object") {
        payload = JSON.stringify(payload);
    }

    // Insert into json_storage
    const res = await pgClient.query(
        'INSERT INTO json_storage(data) VALUES ($1::jsonb)',
        [payload]
    );

    // Store output in the context
    context['prev'] = res;

    return 0;
}

