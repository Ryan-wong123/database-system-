// backend/routes/donation.js
const express = require("express");
const router = express.Router();
const pgPool = require("../db/index");
const jwt = require("jsonwebtoken");

const JWT_SECRET = process.env.JWT_SECRET || "supersecret";
// How long the refreshed token should last (you can set JWT_EXPIRES_IN in .env)
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || "365d";

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
  // ---- 1) JWT auth (inline) ----
  const authHeader = req.headers.authorization || "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null;
  if (!token) return res.status(401).json({ ok: false, error: "Missing token" });

  let payload;
  try {
    payload = jwt.verify(token, JWT_SECRET);
  } catch (err) {
    if (err.name === "TokenExpiredError") {
      return res.status(401).json({ ok: false, error: "Token expired — please log in again" });
    }
    return res.status(401).json({ ok: false, error: "Invalid token" });
  }

  const donorId = payload?.id ?? payload?.user_id; // support either key
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

      const hasId = isInt(it.food_item_id);
      const hasDetails = it.name && isInt(it.category_id) && isInt(it.unit_id) && it.ingredients;
      if (!hasId && !hasDetails) {
        throw new Error(
          `items[${i}] must have either food_item_id OR (name, category_id, unit_id, ingredients)`
        );
      }
      return { ...it, qty: Number(it.qty), expiry_date: iso };
    });
  } catch (e) {
    return res.status(400).json({ ok: false, error: e.message });
  }

  // ---- 3) Transaction ----
  let client;
  try {
    client = await pgPool.connect();
    await client.query("BEGIN");

    // 3a) Insert donation (pending)
    const donateRes = await client.query(
      `INSERT INTO donations(donor_id, location_id, approve_status)
       VALUES ($1, $2, 'pending')
       RETURNING donation_id`,
      [Number(donorId), Number(location_id)]
    );
    const donation_id = donateRes.rows[0].donation_id;

    const createdItems = [];

    // 3b) For each item: resolve/create food item → donationitems → inventory
    for (const it of prepared) {
      let food_item_id;

      if (isInt(it.food_item_id)) {
        // verify existence
        const existsRes = await client.query(
          `SELECT food_item_id FROM fooditems WHERE food_item_id = $1`,
          [Number(it.food_item_id)]
        );
        if (existsRes.rows.length === 0) {
          throw Object.assign(new Error(`Food item ${it.food_item_id} not found`), { status: 400 });
        }
        food_item_id = Number(it.food_item_id);
      } else {
        // try match by name (case-insensitive)
        const checkRes = await client.query(
          `SELECT food_item_id FROM fooditems WHERE LOWER(name) = LOWER($1)`,
          [it.name]
        );
        if (checkRes.rows.length > 0) {
          food_item_id = checkRes.rows[0].food_item_id;
        } else {
          // create new item
          const newItemRes = await client.query(
            `INSERT INTO fooditems(name, category_id, unit_id, ingredients)
             VALUES ($1, $2, $3, $4)
             RETURNING food_item_id`,
            [it.name, Number(it.category_id), Number(it.unit_id), it.ingredients || ""]
          );
          food_item_id = newItemRes.rows[0].food_item_id;

          // optional diet links
          if (Array.isArray(it.diet_ids) && it.diet_ids.length > 0) {
            for (const diet_id of it.diet_ids) {
              await client.query(
                `INSERT INTO fooditemdiet(food_item_id, diet_id)
                 VALUES ($1, $2)
                 ON CONFLICT DO NOTHING`,
                [food_item_id, Number(diet_id)]
              );
            }
          }
        }
      }

      // donation item — include expiry_date (matches your table)
      const diRes = await client.query(
        `INSERT INTO donationitems(donation_id, food_item_id, quantity, expiry_date)
         VALUES ($1, $2, $3, $4)
         RETURNING donation_items_id`,
        [donation_id, food_item_id, it.qty, it.expiry_date]
      );
      const donation_items_id = diRes.rows[0].donation_items_id;

      // inventory entry
      await client.query(
        `INSERT INTO inventory(donation_items_id, food_item_id, location_id, qty, expiry_date)
         VALUES ($1, $2, $3, $4, $5)`,
        [donation_items_id, food_item_id, Number(location_id), it.qty, it.expiry_date]
      );

      createdItems.push({
        donation_items_id,
        food_item_id,
        qty: it.qty,
        expiry_date: it.expiry_date
      });
    }

    await client.query("COMMIT");

    // ---- 4) Sliding renewal: issue a fresh long-lived token in the response ----
    // (Frontend should replace its stored token with this to avoid future logins)
    const refreshedToken = jwt.sign(
      { id: Number(donorId), role: payload.role },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN }
    );

    return res.status(201).json({
      ok: true,
      donation_id,
      items: createdItems,
      token: refreshedToken, // <— store this on the client to stay logged in
      message: "Donation recorded successfully"
    });

  } catch (err) {
    if (client) await client.query("ROLLBACK").catch(() => {});
    if (err.status) return res.status(400).json({ ok: false, error: err.message });
    if (err.code === "23503") return res.status(400).json({ ok: false, error: "Invalid reference: " + err.detail });
    if (err.code === "23505") return res.status(409).json({ ok: false, error: "Duplicate record." });
    console.error("POST /donation/create error:", err);
    return res.status(500).json({ ok: false, error: "Internal Server Error" });
  } finally {
    if (client) client.release();
  }
});

module.exports = router;
