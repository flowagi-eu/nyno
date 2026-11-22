import bcrypt from "bcrypt";

export async function login(ctx, email, password) {
  const db = ctx.db;

  const result = await db.query(
    `
    SELECT "ID", user_pass
    FROM users
    WHERE user_email = $1
    LIMIT 1
    `,
    [email]
  );

  if (result.rows.length === 0) {
    return null;
  }

  const user = result.rows[0];

  const ok = await bcrypt.compare(password, user.user_pass);
  if (!ok) {
    return null;
  }

  return user.ID;
}
