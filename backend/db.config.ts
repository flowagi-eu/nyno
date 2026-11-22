import { Client } from 'pg';

// Setup SYSTEM Postgres client
export let pgClient;
try {
    pgClient = new Client({
        user: process.env.NYNO_DB_USER,
        host: process.env.NYNO_DB_HOST,
        password: process.env.NYNO_DB_PASS,
        port: parseInt(process.env.NYNO_DB_PORT),
        database: process.env.NYNO_DB_NAME
    });

    await pgClient.connect();
    console.log('[+TCP] Postgres client db_nyno_log connected');
    if (!pgClient) throw new Error('Postgres client failed to initialize');
} catch(err) {
   console.log('pgclient err 27', err);
   process.exit(0);
}
