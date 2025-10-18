const express = require("express");
const mongoose = require("mongoose");
const { Pool } = require("pg");
const redis = require("redis");
const cors = require("cors");
const authRoutes = require("./routes/auth");
require("dotenv").config();

const app = express();
const PORT = process.env.PORT || 5000;

// -----------------------
// Middleware
// -----------------------
app.use(cors());
app.use(express.json());
app.use("/auth", authRoutes);
// -----------------------
// MongoDB Connection
// -----------------------
mongoose
  .connect(process.env.MONGO_URI)
  .then(() => console.log("✅ Connected to MongoDB Atlas"))
  .catch((err) => console.error("❌ MongoDB connection error:", err));

// -----------------------
// Redis Connection
// -----------------------
const redisClient = redis.createClient({ url: process.env.REDIS_URL });

redisClient.connect()
  .then(() => console.log("✅ Connected to Redis Cloud"))
  .catch(err => console.error("❌ Redis connection error:", err));

// -----------------------
// PostgreSQL Connection via local SSH tunnel
// -----------------------
// Make sure you manually start the SSH tunnel before running the server:
// ssh -L 5433:localhost:5432 db-dev@35.212.169.134
// localPort 5433 → remote PostgreSQL 5432

const pgPool = new Pool({
  host: "127.0.0.1",                  // Local tunnel host
  port: process.env.PG_LOCAL_PORT,    // Local forwarded port (5433)
  user: process.env.PG_USER,
  password: process.env.PG_PASSWORD,
  database: process.env.PG_DATABASE
});

pgPool.connect()
  .then(() => console.log(`✅ Connected to PostgreSQL via local SSH tunnel on port ${process.env.PG_LOCAL_PORT}`))
  .catch(err => console.error("❌ PostgreSQL connection error:", err));

// -----------------------
// Example Routes
// -----------------------

// Test route
app.get("/", (req, res) => {
  res.send("Hello, MongoDB, PostgreSQL (via SSH), and Redis are connected!");
});

// -----------------------
// Inventory route
// -----------------------
app.get("/inventory", async (req, res) => {
  try {
    if (!pgPool) {
      return res.status(500).send("PostgreSQL not ready yet");
    }

    const cacheKey = "inventory:all";
    const cached = await redisClient.get(cacheKey);

    if (cached) {
      return res.json(JSON.parse(cached));
    }

    // Call the stored procedure
    const result = await pgPool.query("SELECT * FROM get_inventory();");

    await redisClient.setEx(cacheKey, 60, JSON.stringify({ items: result.rows }));
    res.json({ items: result.rows });
  } catch (err) {
    console.error(err);
    res.status(500).send("Error fetching inventory data");
  }
});


// MongoDB example
app.get("/mongo-households", async (req, res) => {
  try {
    const households = await mongoose.connection.db
      .collection("households")
      .find()
      .limit(10)
      .toArray();
    res.json(households);
  } catch (err) {
    console.error(err);
    res.status(500).send("Error fetching households from MongoDB");
  }
});

// Redis test
app.get("/cache-test", async (req, res) => {
  try {
    await redisClient.set("test-key", "Hello Redis!", { EX: 10 }); 
    const value = await redisClient.get("test-key");
    res.send(`Redis value: ${value}`);
  } catch (err) {
    console.error(err);
    res.status(500).send("Error using Redis");
  }
});

// -----------------------
// Start Express Server
// -----------------------
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
