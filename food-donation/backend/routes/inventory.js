// backend/routes/inventory.js
const express = require("express");
const router = express.Router();
const pgPool = require("../db"); // uses backend/db/index.js (pg Pool)

router.get("/", async (req, res) => {
  const { inStockOnly, q, location_id } = req.query;

  // Base SQL that joins the tables from your schema
  // FoodItems + FoodCategory + FoodUnit + Inventory + Locations
  // Schema refs:
  // - FoodItems(name, category_id, unit_id) L31-L36
  // - Inventory(qty, expiry_date, location_id, food_item_id) L72-L79
  // - Locations(name) L8-L13
  // - FoodCategory(name) & FoodUnit(unit) L18-L26
  const clauses = [];
  const params = [];
  let idx = 1;

  if (inStockOnly === "true") {
    clauses.push(`i.qty > 0`);
  }
  if (location_id) {
    clauses.push(`i.location_id = $${idx++}`);
    params.push(Number(location_id));
  }
  if (q) {
    // match against item name, category name, location name
    clauses.push(`(
      fi.name ILIKE $${idx} OR
      fc.name ILIKE $${idx} OR
      l.name  ILIKE $${idx}
    )`);
    params.push(`%${q}%`);
    idx++;
  }

  const where = clauses.length ? `WHERE ${clauses.join(" AND ")}` : "";

  const sql = `
    SELECT
      i.lot_id,
      i.food_item_id,
      fi.name AS name,
      fc.name AS category,
      fu.unit AS unit,
      i.qty,
      i.expiry_date,
      i.location_id,
      l.name AS location_name
    FROM Inventory i
    JOIN FoodItems   fi ON i.food_item_id = fi.food_item_id
    JOIN FoodCategory fc ON fi.category_id = fc.category_id
    JOIN FoodUnit     fu ON fi.unit_id = fu.unit_id
    JOIN Locations     l ON i.location_id = l.location_id
    ${where}
    ORDER BY l.name ASC, fi.name ASC, i.expiry_date ASC;
  `;

  try {
    const { rows } = await pgPool.query(sql, params);
    // Frontend expects { items: [...] }
    return res.json({ items: rows });
  } catch (err) {
    console.error("Inventory query failed:", err);
    return res.status(500).json({ error: "Failed to load inventory" });
  }
});

module.exports = router;
