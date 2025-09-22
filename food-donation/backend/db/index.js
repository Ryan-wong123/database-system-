const { Pool } = require("pg");
require("dotenv").config();

const pgPool = new Pool({
  host: process.env.PG_HOST || "127.0.0.1",
  port: process.env.PG_LOCAL_PORT || 5433,
  user: process.env.PG_USER,
  password: process.env.PG_PASSWORD,
  database: process.env.PG_DATABASE
});

pgPool.connect()
  .then(() => console.log("✅ Connected to PostgreSQL (via Pool)"))
  .catch(err => console.error("❌ PostgreSQL connection error:", err));

module.exports = pgPool;
