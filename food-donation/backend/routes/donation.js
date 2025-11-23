const express = require("express");
const router = express.Router();
const { pgPool } = require("../db/index");
const jwt = require("jsonwebtoken");
const {
  getDonations,
  getDonationsByAccount,
  addDonation,
  approveDonation,
  cancelDonation,
  getDonationHistory
} = require("../db/donation");
const { upsertDonationHistory, listDonationHistoryFromMongo } = require("../db/donation_history_upsert");

const ALLOWED_DONATION_STATUSES = new Set(["pending", "confirmed", "cancelled", "completed"]);
const JWT_SECRET = process.env.JWT_SECRET || "supersecret";

// ───────── Redis helpers & keys ─────────
const { rGet, rSet, rDel } = require("../redis");

// Lists
const TTL_LIST_SEC = 60; // short cache to keep admin/user views fresh
const KEY_DONATION_LIST_ALL = "donation:list:all";
const keyDonationListByAccount = (id) => `donation:list:account:${id}`;

// History
const TTL_DONATION_HISTORY_SEC = 180; // 3 minutes
const keyDonationHistory = (uid) => `donation:history:user:${uid}`;

// ───────── helpers ─────────
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

// Invalidation helpers
async function invalidateHistoryForDonor(donor_id) {
  try {
    if (Number.isInteger(Number(donor_id))) {
      await rDel(keyDonationHistory(Number(donor_id)));
    }
  } catch {}
}

async function invalidateListsForDonor(donor_id) {
  try {
    await rDel(KEY_DONATION_LIST_ALL);
    if (Number.isInteger(Number(donor_id))) {
      await rDel(keyDonationListByAccount(Number(donor_id)));
    }
  } catch {}
}

async function invalidateByDonationId(donation_id) {
  try {
    const q = `SELECT donor_id FROM donations WHERE donation_id = $1`;
    const { rows } = await pgPool.query(q, [donation_id]);
    const donor_id = rows?.[0]?.donor_id;
    await invalidateHistoryForDonor(donor_id);
    await invalidateListsForDonor(donor_id);
  } catch {}
}

router.post("/create", async (req, res) => {
  try {
    // ---- JWT auth ----
    const authHeader = req.headers.authorization || "";
    const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null;

    if (!token) return res.status(401).json({ ok: false, error: "Missing token" });

    let decoded;
    try {
      decoded = jwt.verify(token, JWT_SECRET);
    } catch (err) {
      if (err.name === "TokenExpiredError") {
        return res.status(401).json({ ok: false, error: "Token expired — please log in again" });
      }
      return res.status(401).json({ ok: false, error: "Invalid token" });
    }

    const donorId = decoded?.id ?? decoded?.user_id;
    if (!isInt(donorId)) {
      return res.status(401).json({ ok: false, error: "Token missing valid user id" });
    }

    // ---- Validate payload ----
    const { location_id, items } = req.body || {};
    if (!isInt(location_id)) {
      return res.status(400).json({ ok: false, error: "location_id is required and must be an integer" });
    }
    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ ok: false, error: "items must be a non-empty array" });
    }

    let prepared;
    try {
      prepared = items.map((it, i) => {
        const iso = normaliseDateToISO(it.expiry_date);
        if (!iso) throw new Error(`items[${i}].expiry_date must be YYYY-MM-DD or DD/MM/YYYY`);
        if (!isFutureOrTodayISO(iso)) throw new Error(`items[${i}].expiry_date must be today or later`);
        if (!isInt(it.qty) || Number(it.qty) < 1) throw new Error(`items[${i}].qty must be >= 1`);

        const hasDetails = it.name && isInt(it.category_id) && isInt(it.unit_id) && it.ingredients;
        if (!hasDetails) throw new Error(`items[${i}] must have name, category_id, unit_id, and ingredients`);

        return { ...it, qty: Number(it.qty), expiry_date: iso };
      });
    } catch (e) {
      return res.status(400).json({ ok: false, error: e.message });
    }

    // ---- DB write ----
    const payload = {
      donor_id: Number(donorId),
      location_id: Number(location_id),
      items: prepared
    };

    const result = await addDonation(payload);

    if (result) {
      // Invalidate caches for this donor & global list
      await invalidateHistoryForDonor(Number(donorId));
      await invalidateListsForDonor(Number(donorId));

      return res.status(201).json({
        ok: true,
        donation_id: result.summary.donation_id,
        donation: result.donation,
        message: "Donation recorded successfully"
      });
    }

    return res.status(500).json({ ok: false, error: "Insert failed" });
  } catch (err) {
    if (err.code === "23503") {
      return res.status(400).json({ ok: false, error: "Invalid reference: " + err.detail });
    }
    if (err.code === "23505") {
      return res.status(409).json({ ok: false, error: "Duplicate record." });
    }
    console.error("POST /donation/create error:", err);
    return res.status(500).json({ ok: false, error: err.message });
  }
});

router.get("/list", async (req, res) => {
  try {
    const refresh = String(req.query.refresh || "") === "1";

    if (!refresh) {
      const hit = await rGet(KEY_DONATION_LIST_ALL);
      if (hit) {
        res.set("X-Cache", "HIT");
        return res.json(JSON.parse(hit));
      }
    }

    const rows = await getDonations();
    const payload = { ok: true, items: rows, count: rows.length };

    try { await rSet(KEY_DONATION_LIST_ALL, JSON.stringify(payload), TTL_LIST_SEC); } catch {}
    res.set("X-Cache", refresh ? "BYPASS" : "MISS");
    res.json(payload);
  } catch (err) {
    console.error(err);
    res.status(500).json({ ok: false, error: err.message });
  }
});

router.post("/approve/:id", async (req, res) => {
  try {
    const { approve_status } = req.body;
    const id = Number(req.params.id);
    if (!Number.isInteger(id)) {
      const e = new Error(`Invalid id: ${id}`);
      e.status = 400;
      throw e;
    }
    if (!ALLOWED_DONATION_STATUSES.has(String(approve_status))) {
      return res.status(400).json({ ok: false, error: `Invalid approve_status: ${approve_status}` });
    }

    const result = approve_status === "confirmed"
      ? await approveDonation(id)
      : await cancelDonation(id);

    if (result.rowCount == 0) {
      return res
        .status(409)
        .json({ ok: false, error: "No rows updated (already processed or not found)" });
    }

    // Invalidate history and lists for affected donor
    await invalidateByDonationId(id);

    return res.status(201).json({ ok: true, result });
  } catch (err) {
    if (err.code === "23503") {
      return res.status(400).json({ ok: false, error: "Invalid reference: " + err.detail });
    }
    console.error("DB error:", err);
    return res.status(500).json({ ok: false, error: err.message });
  }
});

router.post("/cancel/:id", async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id)) {
      return res.status(400).json({ ok: false, error: `Invalid id: ${id}` });
    }

    // Use the DB function wrapper instead of inline SQL
    const { rowCount, rows } = await cancelDonation(id);

    if (rowCount === 0) {
      return res.status(409).json({
        ok: false,
        error: "Only pending donations can be cancelled or donation not found."
      });
    }

    // Invalidate history and lists for affected donor
    await invalidateByDonationId(id);

    return res.json({
      ok: true,
      donation: rows[0], // whatever donation_cancel($1) returns
      message: "Donation cancelled successfully."
    });
  } catch (err) {
    console.error("POST /donation/cancel error:", err);
    res.status(500).json({ ok: false, error: err.message });
  }
});


// ====================
// GET /donation/list/:id  (by account)  (CACHED)
// ====================
router.get("/list/:id", async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id)) {
      const e = new Error(`Invalid id: ${id}`);
      e.status = 400;
      throw e;
    }

    const refresh = String(req.query.refresh || "") === "1";
    const key = keyDonationListByAccount(id);

    if (!refresh) {
      const hit = await rGet(key);
      if (hit) {
        res.set("X-Cache", "HIT");
        return res.json(JSON.parse(hit));
      }
    }

    const rows = await getDonationsByAccount(id);
    if (rows.length === 0) {
      return res.status(404).json({ ok: false, error: "Not found" });
    }

    const payload = { ok: true, item: rows[0] };

    try { await rSet(key, JSON.stringify(payload), TTL_LIST_SEC); } catch {}
    res.set("X-Cache", refresh ? "BYPASS" : "MISS");
    res.json(payload);
  } catch (err) {
    console.error(err);
    res.status(500).json({ ok: false, error: err.message });
  }
});

// ====================
// GET /donation/history/:donor_id (CACHED)
// ====================
router.get("/history/:donor_id", async (req, res) => {
  try {
    const donor_id = Number(req.params.donor_id);
    if (!Number.isInteger(donor_id)) {
      const e = new Error(`Invalid donor_id: ${donor_id}`);
      e.status = 400;
      throw e;
    }

    const cacheKey = keyDonationHistory(donor_id);

    // 0) Try Redis first
    const hit = await rGet(cacheKey);
    if (hit) {
      res.set("X-Cache", "HIT");
      return res.json(JSON.parse(hit));
    }

    // 1) Source of truth: PG rows (item-per-row)
    const rows = await getDonationHistory(donor_id);

    // 2) Upsert into Mongo (one doc per donation)
    await upsertDonationHistory(donor_id, rows);

    // 3) Read from Mongo
    const docs = await listDonationHistoryFromMongo(donor_id);

    // 4) Flatten docs back to PG-like rows that your React expects
    const flat = [];
    for (const d of docs) {
      for (const it of d.items || []) {
        flat.push({
          donation_id: d.donation_id,
          food_name: it.food_name,
          category: it.category,
          qty: it.qty,
          unit: it.unit,
          expiry_date: it.expiry_date,
          location_name: d.location_name,
          donated_at: d.donated_at,
          approve_status: d.approve_status
        });
      }
    }

    if (flat.length === 0) {
      return res.status(404).json({ ok: false, error: "Not found" });
    }

    const payload = { ok: true, items: flat };

    // 5) Store in Redis (best-effort)
    try { await rSet(cacheKey, JSON.stringify(payload), TTL_DONATION_HISTORY_SEC); } catch {}

    res.set("X-Cache", "MISS");
    return res.json(payload);
  } catch (err) {
    console.error("GET /donation/history error:", err);
    const status = err.status || 500;
    res.status(status).json({ ok: false, error: err.message });
  }
});

module.exports = router;
