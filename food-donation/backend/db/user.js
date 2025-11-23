// db/user.js  (drop-in)
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const { pgPool } = require("./index");

const JWT_SECRET = process.env.JWT_SECRET || "supersecret";
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || "1h";

function signToken(payload) {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
}

function safeUser(u) {
  return { id: u.user_id, name: u.name, email: u.email, role: u.role };
}

async function registerUser(payload) {
  const { name, email, password, role } = payload;

  if (!name || !email || !password || !role) {
    throw new Error("Missing required fields");
  }

  const password_hash = await bcrypt.hash(password, 10);

  try {
    // Minimal DB function: inserts and returns user_id, name, email, role
    const { rows, rowCount } = await pgPool.query(
      "SELECT * FROM register_user($1,$2,$3,$4)",
      [name, email, password_hash, role]
    );

    if (rowCount === 0) throw new Error("Registration failed");

    const user = rows[0];
    const token = signToken({ id: user.user_id, role: user.role });
    return { ...safeUser(user), token };
  } catch (err) {
    // Friendly duplicate email message (unique violation)
    if (err && err.code === "23505") {
      const e = new Error("Email is already registered");
      e.status = 409;
      throw e;
    }
    throw err;
  }
}

async function loginUser(email, password) {
  if (!email || !password) throw new Error("Missing credentials");

  // Fetch row via simple SQL function; compare hash in Node
  const { rows, rowCount } = await pgPool.query(
    "SELECT * FROM get_user_for_login($1)",
    [email]
  );

  // Uniform error to avoid leaking which field failed
  if (rowCount === 0) throw new Error("Invalid credentials");

  const user = rows[0];

  // Enforce active status in code
  if (user.account_status !== "active") {
    // Keep wording uniform
    throw new Error("Invalid credentials");
  }

  const match = await bcrypt.compare(password, user.password_hash);
  if (!match) throw new Error("Invalid credentials");

  const token = signToken({ id: user.user_id, role: user.role });
  return { ...safeUser(user), token };
}

module.exports = { registerUser, loginUser };
