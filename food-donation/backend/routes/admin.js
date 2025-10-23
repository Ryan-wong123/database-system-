// routes/admin.js
const express = require("express");
const router = express.Router();

// from routes/ -> db functions in project root's db/booking.js
const {listInventoryAdmin,listBookingsAdmin,updateBookingStatus,updateFoodItemTx,getAllFoodCategories} = require("../db/admin");

// GET /admin
router.get("/", async (_req, res) => {
  try {
    const rows = await listInventoryAdmin();
    res.json({ data: rows });
  } catch (err) {
    console.error("GET /admin failed:", err);
    res.status(500).json({ error: "Failed to fetch admin inventory" });
  }
});

// GET /admin/bookings
router.get("/bookings", async (_req, res) => {
  try {
    const rows = await listBookingsAdmin();
    res.json({ data: rows });
  } catch (err) {
    console.error("GET /admin/bookings failed:", err);
    res.status(500).json({ error: "Failed to fetch bookings" });
  }
});

// PATCH /admin/bookings/:bookingId/status
router.patch("/bookings/:bookingId/status", async (req, res) => {
  try {
    const bookingId = Number(req.params.bookingId);
    const { status } = req.body || {};
    if (!Number.isInteger(bookingId)) return res.status(400).json({ error: "Invalid bookingId" });
    if (typeof status !== "string" || !status.trim()) return res.status(400).json({ error: "status is required" });

    const row = await updateBookingStatus({ booking_id: bookingId, status: status.trim() });
    res.json({ data: row });
  } catch (err) {
    console.error("PATCH /admin/bookings/:bookingId/status failed:", err);
    if (err.statusCode === 404) return res.status(404).json({ error: "Booking not found" });
    if (err.message?.startsWith("Invalid status")) return res.status(400).json({ error: err.message });
    res.status(500).json({ error: "Failed to update booking status" });
  }
});

router.patch("/food/:itemId", async (req, res) => {
  try {
    const item_id = Number(req.params.itemId);
    let { name, category_id, category, qty, expiry_date, location_id, lot_id } = req.body || {};

    if (!Number.isInteger(item_id) || item_id <= 0) {
      return res.status(400).json({ error: "Invalid item_id" });
    }
    if (!name || typeof name !== "string") {
      return res.status(400).json({ error: "name is required" });
    }

    // resolve category name -> id if needed
    if (category_id == null && typeof category === "string" && category.trim()) {
      const { pgPool } = require("../index"); // if you expose pgPool here; otherwise query via your helper
      const { rows } = await pgPool.query(
        `SELECT category_id FROM FoodCategory WHERE name ILIKE $1 LIMIT 1`,
        [category.trim()]
      );
      if (!rows[0]) return res.status(400).json({ error: `Unknown category: ${category}` });
      category_id = rows[0].category_id;
    }

    if (category_id == null || Number.isNaN(Number(category_id))) {
      return res.status(400).json({ error: "category_id is required (or pass category name)" });
    }

    qty = Number(qty);
    if (!Number.isInteger(qty) || qty < 0) {
      return res.status(400).json({ error: "qty must be a non-negative integer" });
    }

    // accept only YYYY-MM-DD
    if (!/^\d{4}-\d{2}-\d{2}$/.test(String(expiry_date))) {
      return res.status(400).json({ error: "expiry_date must be YYYY-MM-DD" });
    }

    location_id = Number(location_id);
    if (!Number.isInteger(location_id)) {
      return res.status(400).json({ error: "location_id must be an integer" });
    }

    const rows = await updateFoodItemTx({
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
    console.error("PATCH /admin/food/:itemId failed:", err);
    if (err?.code === "23505") {
      return res.status(409).json({ error: "Name already exists (unique constraint)" });
    }
    if (err?.code === "23514") {
      return res.status(400).json({ error: "Constraint failed (e.g., expiry must be today or later)" });
    }
    res.status(500).json({ error: "Failed to update food item" });
  }
});

// GET /admin/categories
router.get("/categories", async (_req, res) => {
  try {
    const categories = await getAllFoodCategories();
    res.json({ data: categories });
  } catch (err) {
    console.error("GET /admin/categories failed:", err);
    res.status(500).json({ error: "Failed to fetch categories" });
  }
});

module.exports = router;
