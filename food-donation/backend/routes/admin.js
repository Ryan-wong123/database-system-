const express = require("express");
const router = express.Router();

// DB functions
const {
  listInventoryAdmin,
  listBookingsAdmin,
  updateBookingStatus,
  updateFoodItemTx,
  getAllFoodCategories
} = require("../db/admin");

// NEW: Redis helpers
const { rGet, rSet, rDel } = require("../redis");

// ───────────────────────── Cache keys & TTLs ─────────────────────────
const KEY_ADMIN_INVENTORY = "admin:inventory:v1";
const KEY_ADMIN_BOOKINGS  = "admin:bookings:v1";
const KEY_MISC_CATEGORIES = "misc:categories:v1"; // shared key with misc routes
const TTL_INV_SEC   = 60;       // Admin inventory short cache
const TTL_BOOK_SEC  = 30;       // Bookings must be fresh
const TTL_CAT_SEC   = 60 * 30;  // Categories change rarely

// Slots cache (from booking dropdown caching)
const slotsKey = (locId, ymd) => `slots:loc:${locId}:date:${ymd}`;
function toYMD(v) {
  const d = new Date(v);
  if (Number.isNaN(d)) return null;
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  const day = String(d.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

// Optional helper for items-by-category cache (Donation dropdown)
const keyItemsByCat = (cid) => `food:items:bycat:${cid}:v1`;

// ───────────────────────── GET /admin (Inventory) ─────────────────────────
router.get("/", async (req, res) => {
  try {
    const refresh = String(req.query.refresh || "") === "1";
    if (!refresh) {
      const hit = await rGet(KEY_ADMIN_INVENTORY);
      if (hit) {
        res.set("X-Cache", "HIT");
        return res.json(JSON.parse(hit));
      }
    }

    const rows = await listInventoryAdmin();
    const payload = { data: rows };

    try { await rSet(KEY_ADMIN_INVENTORY, JSON.stringify(payload), TTL_INV_SEC); } catch {}
    res.set("X-Cache", refresh ? "BYPASS" : "MISS");
    res.json(payload);
  } catch (err) {
    console.error("GET /admin failed:", err);
    res.status(500).json({ error: "Failed to fetch admin inventory" });
  }
});

// ───────────────────────── GET /admin/bookings ─────────────────────────
router.get("/bookings", async (req, res) => {
  try {
    const refresh = String(req.query.refresh || "") === "1";
    if (!refresh) {
      const hit = await rGet(KEY_ADMIN_BOOKINGS);
      if (hit) {
        res.set("X-Cache", "HIT");
        return res.json(JSON.parse(hit));
      }
    }

    const rows = await listBookingsAdmin();
    const payload = { data: rows };

    try { await rSet(KEY_ADMIN_BOOKINGS, JSON.stringify(payload), TTL_BOOK_SEC); } catch {}
    res.set("X-Cache", refresh ? "BYPASS" : "MISS");
    res.json(payload);
  } catch (err) {
    console.error("GET /admin/bookings failed:", err);
    res.status(500).json({ error: "Failed to fetch bookings" });
  }
});

// ───────────────────────── PATCH /admin/bookings/:bookingId/status ─────────────────────────
router.patch("/bookings/:bookingId/status", async (req, res) => {
  try {
    const bookingId = Number(req.params.bookingId);
    const { status } = req.body || {};
    if (!Number.isInteger(bookingId)) return res.status(400).json({ error: "Invalid bookingId" });
    if (typeof status !== "string" || !status.trim()) return res.status(400).json({ error: "status is required" });

    const row = await updateBookingStatus({ booking_id: bookingId, status: status.trim() });

    // Invalidate admin bookings cache
    try { await rDel(KEY_ADMIN_BOOKINGS); } catch {}

    // If row includes location_id & slot_start_time, invalidate slots cache for that day
    try {
      const locId = row?.location_id ?? row?.locationId ?? row?.location;
      const start = row?.slot_start_time ?? row?.slotStart ?? row?.slot_start;
      const ymd = toYMD(start);
      if (Number.isInteger(Number(locId)) && ymd) {
        await rDel(slotsKey(Number(locId), ymd));
      }
    } catch {}

    res.json({ data: row });
  } catch (err) {
    console.error("PATCH /admin/bookings/:bookingId/status failed:", err);
    if (err.statusCode === 404) return res.status(404).json({ error: "Booking not found" });
    if (err.message?.startsWith("Invalid status")) return res.status(400).json({ error: err.message });
    res.status(500).json({ error: "Failed to update booking status" });
  }
});

// ───────────────────────── PATCH /admin/food/:itemId ─────────────────────────
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

    // Invalidate admin inventory cache (list)
    try { await rDel(KEY_ADMIN_INVENTORY); } catch {}
    // Also clear per-category items cache to keep Donation page fast
    try { await rDel(keyItemsByCat(Number(category_id))); } catch {}

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

// ───────────────────────── GET /admin/categories ─────────────────────────
router.get("/categories", async (req, res) => {
  try {
    const refresh = String(req.query.refresh || "") === "1";
    if (!refresh) {
      const hit = await rGet(KEY_MISC_CATEGORIES);
      if (hit) {
        res.set("X-Cache", "HIT");
        return res.json(JSON.parse(hit));
      }
    }

    const categories = await getAllFoodCategories();
    const payload = { data: categories };

    try { await rSet(KEY_MISC_CATEGORIES, JSON.stringify(payload), TTL_CAT_SEC); } catch {}
    res.set("X-Cache", refresh ? "BYPASS" : "MISS");
    res.json(payload);
  } catch (err) {
    console.error("GET /admin/categories failed:", err);
    res.status(500).json({ error: "Failed to fetch categories" });
  }
});

module.exports = router;
