// routes/misc.js
const express = require("express");
const router = express.Router();
const { listInventory, listLocations} = require("../db/queries");

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
module.exports = router;
