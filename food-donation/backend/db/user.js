// db/user.js
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const pgPool = require("./index");

const JWT_SECRET = process.env.JWT_SECRET || "supersecret";


async function registerUser(payload) {
  const { name, email, password, role } = payload;   // drop extra donee fields here
  const password_hash = await bcrypt.hash(password, 10);

  const result = await pgPool.query(
    "SELECT * FROM register_user($1,$2,$3,$4)",
    [name, email, password_hash, role]
  );
  return result.rows[0];
}


async function loginUser(email, password) {
  const result = await pgPool.query("SELECT * FROM login_user($1)", [email]);
  if (result.rowCount === 0) throw new Error("Invalid credentials");

  const user = result.rows[0];
  const match = await bcrypt.compare(password, user.password_hash);
  if (!match) throw new Error("Invalid credentials");

  const token = jwt.sign({ id: user.user_id, role: user.role }, JWT_SECRET, { expiresIn: "1h" });
  return { user_id: user.user_id, email: user.email, role: user.role, token };
}

module.exports = { registerUser, loginUser };
