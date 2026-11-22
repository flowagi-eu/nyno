// =========================
// Postgres client setup
// =========================
import pkg from "pg";

// =========================
// getClientBySecret
// =========================
// returns user_id or null
export async function getClientBySecret(client,apiKey) {
  if (!apiKey) return null;

  try {
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

export async function getApiKeyByUserId(client,user_id) {
  if (!user_id) return null;

  try {
    const res = await client.query(
      `SELECT api_key
       FROM wlp_user_api_keys
       WHERE user_id = $1
       LIMIT 1`,
      [user_id]
    );

    if (res.rows.length === 0) {
      return null;
    }

    return res.rows[0].api_key;
  } catch (err) {
    console.error("DB error in getApiKeyByUserId:", err);
    return null;
  }
}


export async function getClientByPublicId(client,publicId) {
  if (!publicId) return null;

  try {
    const res = await client.query(
      `SELECT user_id
       FROM wlp_user_public_ids
       WHERE public_id = $1
       LIMIT 1`,
      [publicId]
    );

    if (res.rows.length === 0) {
      return null;
    }

    return 'tenant' + res.rows[0].user_id;
  } catch (err) {
    console.error("DB error in getClientByPublicId:", err);
    return null;
  }
}
