const express = require("express");
const router = express.Router();
const pgPool = require("../db/index");
const jwt = require("jsonwebtoken");
const { addDonation, getDonations } = require("../db/donation");

const JWT_SECRET = process.env.JWT_SECRET || "supersecret";

// ---------- helpers ----------
const isInt = (n) => Number.isInteger(Number(n));

// Accept ISO (YYYY-MM-DD) OR UI (DD/MM/YYYY) → return ISO
function normaliseDateToISO(s) {
  if (!s || typeof s !== "string") return null;
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s; // ISO already
  const m = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(s); // DD/MM/YYYY
  return m ? `${m[3]}-${m[2]}-${m[1]}` : null;
}

function isFutureOrTodayISO(isoDate) {
  if (!isoDate) return false;
  const d = new Date(`${isoDate}T00:00:00`);
  if (Number.isNaN(d.getTime())) return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return d >= today;
}

// ====================
// POST /donation/create
// ====================

router.post("/create", async (req, res) => {
  try {
    // ---- 1) Inline JWT authentication ----
    const authHeader = req.headers.authorization || "";
    const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null;
    
    if (!token) {
      return res.status(401).json({ ok: false, error: "Missing token" });
    }

    let decoded;
    try {
      decoded = jwt.verify(token, JWT_SECRET);
    } catch (err) {
      if (err.name === "TokenExpiredError") {
        return res.status(401).json({ ok: false, error: "Token expired — please log in again" });
      }
      return res.status(401).json({ ok: false, error: "Invalid token" });
    }

    // Get user ID from decoded token
    const donorId = decoded?.id ?? decoded?.user_id;
    if (!isInt(donorId)) {
      return res.status(401).json({ ok: false, error: "Token missing valid user id" });
    }

    // ---- 2) Validate payload ----
    const { location_id, items } = req.body || {};
    if (!isInt(location_id)) {
      return res.status(400).json({ ok: false, error: "location_id is required and must be an integer" });
    }
    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ ok: false, error: "items must be a non-empty array" });
    }

    // Normalize + validate each item
    let prepared;
    try {
      prepared = items.map((it, i) => {
        const iso = normaliseDateToISO(it.expiry_date);
        if (!iso) throw new Error(`items[${i}].expiry_date must be YYYY-MM-DD or DD/MM/YYYY`);
        if (!isFutureOrTodayISO(iso)) throw new Error(`items[${i}].expiry_date must be today or later`);
        if (!isInt(it.qty) || Number(it.qty) < 1) throw new Error(`items[${i}].qty must be >= 1`);

        const hasDetails = it.name && isInt(it.category_id) && isInt(it.unit_id) && it.ingredients;
        if (!hasDetails) {
          throw new Error(
            `items[${i}] must have name, category_id, unit_id, and ingredients`
          );
        }
        return { ...it, qty: Number(it.qty), expiry_date: iso };
      });
    } catch (e) {
      return res.status(400).json({ ok: false, error: e.message });
    }

    // ---- 3) Call addDonation from db/donation.js (like foodcategory does) ----
    const payload = {
      donor_id: Number(donorId),
      location_id: Number(location_id),
      items: prepared
    };

    const result = await addDonation(payload);

    if (result) {
      return res.status(201).json({
        ok: true,
        donation_id: result.summary.donation_id,
        donation: result.donation,
        message: "Donation recorded successfully"
      });
    }

    return res.status(500).json({ ok: false, error: "Insert failed" });

  } catch (err) {
    // Map common Postgres error codes (same as foodcategory)
    if (err.code === "23503") {
      return res.status(400).json({ ok: false, error: "Invalid reference: " + err.detail });
    }
    if (err.code === "23505") {
      return res.status(409).json({ ok: false, error: "Duplicate record." });
    }

    // Generic error
    console.error("POST /donation/create error:", err);
    return res.status(500).json({ ok: false, error: err.message });
  }
});

// ====================
// GET /donation/list
// ====================

router.get("/list", async (req, res) => {
  try {
    const rows = await getDonations();
    res.json({ ok: true, items: rows, count: rows.length });
  } catch (err) {
    console.error(err);
    res.status(500).json({ ok: false, error: err.message });
  }
});

module.exports = router;