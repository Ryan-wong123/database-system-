// routes/misc.js
const express = require("express");
const router = express.Router();
const { listInventory, listLocations, listUnits } = require("../db/queries");
const { updateMongoInventory, getInventoryFromMongo } = require("../db/mongo_inventory");

// 👇 add this
const { rGet, rSet } = require("../redis");

// cache keys + TTLs
const KEY_LOCATIONS = "misc:locations:v1";
const KEY_UNITS     = "misc:units:v1";
// locations/units change rarely, so 30 mins is ok
const TTL_SEC = 60 * 30;

// -------------------------------------------------------------------------
// INVENTORY (PG direct)
// -------------------------------------------------------------------------
router.get("/inventory", async (req, res) => {
  try {
    const items = await listInventory(req.query);
    res.json({ items });
  } catch (err) {
    res.status(500).json({ error: "Failed to load inventory" });
  }
});

// -------------------------------------------------------------------------
// LOCATIONS  -> cache-first
// GET /misc/locations
// -------------------------------------------------------------------------
router.get("/locations", async (_req, res) => {
  try {
    // 1) Redis
    const hit = await rGet(KEY_LOCATIONS);
    if (hit) {
      res.set("X-Cache", "HIT");
      return res.json(JSON.parse(hit));
    }

    // 2) DB
    const rows = await listLocations();

    // 3) cache it
    const payload = rows; // you were returning "rows" directly
    try { await rSet(KEY_LOCATIONS, JSON.stringify(payload), TTL_SEC); } catch {}

    res.set("X-Cache", "MISS");
    res.json(payload);
  } catch (err) {
    console.error("GET /misc/locations error:", err);
    res.status(500).json({ error: "Failed to fetch locations" });
  }
});

// -------------------------------------------------------------------------
// UNITS -> cache-first
// GET /misc/unit/list
// -------------------------------------------------------------------------
router.get("/unit/list", async (_req, res) => {
  try {
    // 1) Redis
    const hit = await rGet(KEY_UNITS);
    if (hit) {
      res.set("X-Cache", "HIT");
      return res.json(JSON.parse(hit));
    }

    // 2) DB
    const rows = await listUnits();

    // 3) cache it
    const payload = rows; // original shape
    try { await rSet(KEY_UNITS, JSON.stringify(payload), TTL_SEC); } catch {}

    res.set("X-Cache", "MISS");
    res.json(payload);
  } catch (err) {
    console.error("GET /misc/unit/list error:", err);
    res.status(500).json({ error: "Failed to fetch units" });
  }
});

// -------------------------------------------------------------------------
// INVENTORY SYNC TO MONGO
// -------------------------------------------------------------------------
router.post("/inventory/sync-mongo", async (req, res) => {
  try {
    const result = await updateMongoInventory({ reconcileDeletes: true });
    res.json({
      ok: true,
      message: `Synced ${result.count} items to Mongo inventory cache.`,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ ok: false, error: "Mongo sync failed", details: err.message });
  }
});

// -------------------------------------------------------------------------
// MONGO INVENTORY VIEW
// -------------------------------------------------------------------------
router.get("/inventory/mongo", async (req, res) => {
  try {
    const filters = {
      search: req.query.search,
      diet: req.query.diet,
      inStockOnly: req.query.inStockOnly === "true",
      category: req.query.category,
    };

    const result = await getInventoryFromMongo(filters);
    res.json({ ok: true, count: result.length, items: result });
  } catch (err) {
    console.error(err);
    res
      .status(500)
      .json({ ok: false, error: "Failed to fetch from Mongo cache", details: err.message });
  }
});

module.exports = router;
