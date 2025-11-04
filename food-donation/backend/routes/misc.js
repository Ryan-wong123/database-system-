// routes/misc.js
const express = require("express");
const router = express.Router();
const { listInventory, listLocations, listUnits } = require("../db/queries");
const { updateMongoInventory, getInventoryFromMongo } = require("../db/mongo_inventory");

router.get("/inventory", async (req, res) => {
  try {
    const items = await listInventory(req.query);
    res.json({ items });
  } catch (err) {
    res.status(500).json({ error: "Failed to load inventory" });
  }
});

router.get("/locations", async (req, res) => {
  try {
    const rows = await listLocations();
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch locations" });
  }
});

router.get("/unit/list", async (req, res) => {
  try {
    const rows = await listUnits();
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch units" });
  }
});

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
    res.status(500).json({ ok: false, error: "Failed to fetch from Mongo cache", details: err.message });
  }
});



module.exports = router;


