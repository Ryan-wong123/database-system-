const express = require("express");
const mongoose = require("mongoose");
const { Pool } = require("pg");
const redis = require("redis");
const cors = require("cors");
const authRoutes = require("./routes/auth");
const foodItemRoutes = require("./routes/fooditem");
const foodCategoryRoutes = require("./routes/foodcategory");
require("dotenv").config();
const Queries = require("./db/queries");
const app = express();
const PORT = process.env.PORT || 5000;

// -----------------------
// Middleware
// -----------------------
app.use(cors());
app.use(express.json());
app.use("/auth", authRoutes);
app.use("/fooditem", foodItemRoutes);
app.use("/foodcategory", foodCategoryRoutes);
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
    // Query params: ?inStockOnly=true&q=rice&location_id=3
    const items = await Queries.listInventory(req.query);
    res.json({ items });
  } catch (err) {
    console.error("Inventory query failed:", err);
    res.status(500).json({ error: "Failed to load inventory" });
  }
});

app.get("/admin/bookings", async (req, res) => {
  try {
    const rows = await Queries.listBookingsAdmin();
    // normalize as { data: [...] } to be consistent with your other endpoints
    res.json({ data: rows });
  } catch (err) {
    console.error("GET /api/admin/bookings failed:", err);
    res.status(500).json({ error: "Failed to fetch bookings" });
  }
});

app.get('/admin', async (req, res) => {
  const items = await Queries.listInventoryAdmin();
  res.json({ items });
});

// GET /api/locations -> returns an ARRAY (not {data: ...})
app.get("/locations", async (req, res) => {
  try {
    const rows = await Queries.listLocations();
    res.json(rows); // array so UseFetchData -> locations.data is an array
  } catch (err) {
    console.error("GET /api/locations failed:", err);
    res.status(500).json({ error: "Failed to fetch locations" });
  }
});

// server.js
app.patch('/api/admin/food/:itemId', async (req, res) => {
  try {
    const item_id = Number(req.params.itemId);
    let { name, category_id, category, qty, expiry_date, location_id, lot_id } = req.body || {};

    if (!item_id) return res.status(400).json({ error: 'Invalid item_id' });

    if (!name || typeof name !== 'string') {
      return res.status(400).json({ error: 'name is required' });
    }

    // resolve category name -> id if needed
    if (category_id == null && typeof category === 'string' && category.trim()) {
      const { rows } = await pgPool.query(
        `SELECT category_id FROM FoodCategory WHERE name ILIKE $1 LIMIT 1`,
        [category.trim()]
      );
      if (!rows[0]) return res.status(400).json({ error: `Unknown category: ${category}` });
      category_id = rows[0].category_id;
    }

    if (category_id == null || isNaN(Number(category_id))) {
      return res.status(400).json({ error: 'category_id is required (or pass category name)' });
    }

    qty = Number(qty);
    if (!Number.isInteger(qty) || qty < 0) {
      return res.status(400).json({ error: 'qty must be a non-negative integer' });
    }

    // accept only YYYY-MM-DD for safety
    if (!/^\d{4}-\d{2}-\d{2}$/.test(String(expiry_date))) {
      return res.status(400).json({ error: 'expiry_date must be YYYY-MM-DD' });
    }

    location_id = Number(location_id);
    if (!Number.isInteger(location_id)) {
      return res.status(400).json({ error: 'location_id must be an integer' });
    }

    const rows = await Queries.updateFoodItemTx({
      item_id,
      name: name.trim(),
      category_id: Number(category_id),
      qty,
      expiry_date,
      location_id,
      lot_id: lot_id ? Number(lot_id) : null,
    });

    res.json({ data: rows });
  } catch (err) {
    console.error('PATCH /api/admin/food/:itemId failed:', err);
    // expose useful PG errors for uniqueness / constraint violations
    if (err?.code === '23505') {
      return res.status(409).json({ error: 'Name already exists (unique constraint)' });
    }
    if (err?.code === '23514') {
      return res.status(400).json({ error: 'Constraint failed (e.g., expiry must be today or later)' });
    }
    res.status(500).json({ error: 'Failed to update food item' });
  }
});

app.get('/categories', async (req, res) => {
  try {
    const categories = await Queries.getAllFoodCategories();
    res.json(categories);
  } catch (err) {
    console.error('Failed to fetch categories:', err);
    res.status(500).json({ error: 'Failed to fetch categories' });
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
