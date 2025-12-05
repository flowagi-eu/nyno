import App from '../../src/App.js'; // import the singleton

export async function dbDelta() {
  const pgClient = App.get('db_nyno_log');

  await pgClient.query(`
    CREATE TABLE IF NOT EXISTS json_storage (
      id UUID PRIMARY KEY DEFAULT uuidv7(),
      data JSONB NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );
  `);

  console.log("✅ Table 'json_storage' is ready.");
  
  await pgClient.query(`
    CREATE TABLE IF NOT EXISTS trigger_loop_results (
      id UUID PRIMARY KEY DEFAULT uuidv7(),
      data JSONB NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );
  `);

  console.log("✅ Table 'trigger_loop_results' is ready.");
}

export async function save(data) {
  const pgClient = App.get('db_nyno_log');

  if (typeof data !== 'object' || data === null) {
    throw new Error('data must be a non-null object');
  }

  const { rows } = await pgClient.query(
    `INSERT INTO json_storage (data) VALUES ($1) RETURNING id;`,
    [data]
  );

  return rows[0].id;
}
