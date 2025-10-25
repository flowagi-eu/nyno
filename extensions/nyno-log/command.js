import fs from 'fs';
import path from 'path';
import { fileURLToPath, pathToFileURL } from 'url';
import { Client } from 'pg';

import App from '../../src/App.js'; // import the singleton

// Assume setup.sh has been run, directly connect using generated .env file
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

if(!pgClient) throw new Error('Postgres client failed to initialize');

export async function nyno_log(args, context) {
  const logJson = args[0]; // assume JSON string
	console.log({logJson});
  // Insert the JSON log into queue_logs
  await pgClient.query(
    'INSERT INTO queue_logs(line) VALUES ($1::jsonb)',
    [logJson]
  );

  // Flush log older than 5 seconds
  await pgClient.query('SELECT flush_queue()');

  // Store output in the context
  context.NYNO_LOG_OUTPUT = 'ok';

  return { output: 'ok' };
}
