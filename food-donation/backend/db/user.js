// db/user.js
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const pgPool = require("./index");

const JWT_SECRET = process.env.JWT_SECRET || "supersecret";

// small helper to keep token creation consistent
function signToken(user) {
  return jwt.sign({ id: user.user_id, role: user.role }, JWT_SECRET, { expiresIn: "1h" });
}

async function registerUser(payload) {
  const { name, email, password, role } = payload;
  const password_hash = await bcrypt.hash(password, 10);

  // Expect register_user(name, email, pw_hash, role) to insert and return at least user_id, email, role
  const { rows, rowCount } = await pgPool.query(
    "SELECT * FROM register_user($1,$2,$3,$4)",
    [name, email, password_hash, role]
  );

  if (rowCount === 0) {
    throw new Error("Registration failed");
  }

  // If your register_user() returns different column names, map them here
  const user = rows[0];

  // Fallback in case your SQL function doesn’t return user_id/role/email:
  // const { rows: r2 } = await pgPool.query(
  //   "SELECT user_id, email, role FROM Users WHERE email = $1",
  //   [email]
  // );
  // const user = r2[0];

  const token = signToken(user);
  return { id: user.user_id, name: user.name, email: user.email, role: user.role, token };
}

async function loginUser(email, password) {
  const result = await pgPool.query(
    `SELECT user_id, name, email, password_hash, role, account_status
    FROM Users
    WHERE LOWER(email) = LOWER($1)
    AND account_status = 'active'`,
    [email]
  );

  if (result.rowCount === 0) throw new Error("Invalid credentials");

  const user = result.rows[0];
  const match = await bcrypt.compare(password, user.password_hash);
  if (!match) throw new Error("Invalid credentials");

  const token = signToken(user);
  return { id: user.user_id, name: user.name, email: user.email, role: user.role, token };
}

module.exports = { registerUser, loginUser };
