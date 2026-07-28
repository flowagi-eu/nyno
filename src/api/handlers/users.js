import bcrypt from "bcrypt";

export async function users(ctx, req) {
//console.log('users ctx',ctx);
  const { email, password } = req.body;
  const db = ctx.db; 

  const exists = await db.query(
    "SELECT 1 FROM users WHERE user_email = $1",
    [email]
  );

  if (exists.rows.length) {
    return [409, { error: "Email already exists" }];
  }

  const hash = await bcrypt.hash(password, 12);

  const result = await db.query(
    `
    INSERT INTO users (
      user_login,
      user_pass,
      user_nicename,
      user_email,
      display_name
    )
    VALUES (\$1, \$2, \$1, \$1, \$1)
    ON CONFLICT (user_email) DO NOTHING
    RETURNING "ID"
    `,
    [email, hash]
  );

  if (result.rows.length === 0) {
    return [409, { error: "Email already exists" }];
  }

  return [201, { id: result.rows[0].ID }];
}
