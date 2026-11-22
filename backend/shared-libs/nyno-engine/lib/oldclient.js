// =========================
// Postgres client setup
// =========================
import pkg from "pg";
const { Client } = pkg;

const client = new Client({
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  host: process.env.DB_HOST,
  port: 5432,
});

// connect once at startup
let isConnected = false;

async function ensureConnection() {
  if (!isConnected) {
    await client.connect();
    isConnected = true;
  }
}

// =========================
// getClientBySecret
// =========================
// returns user_id or null
export async function getClientBySecret(apiKey) {
  if (!apiKey) return null;

  try {
    await ensureConnection();

    const res = await client.query(
      `SELECT user_id
       FROM wlp_user_api_keys
       WHERE api_key = $1
       LIMIT 1`,
      [apiKey]
    );

    if (res.rows.length === 0) {
      return null;
    }

    return 'tenant' + res.rows[0].user_id;
  } catch (err) {
    console.error("DB error in getClientBySecret:", err);
    return null;
  }
}
