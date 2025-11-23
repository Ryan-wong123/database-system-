// routes/booking_history.js
const express = require('express');
const router = express.Router();
const { getBookingHistoryByUser } = require('../db/booking');
const { upsertUserBookingHistory, listUserBookingHistory } = require("../db/booking_history_upsert");
const { rGet, rSet } = require('../redis');  // <-- add
const TTL_HISTORY_SEC = 180;                      // 3 minutes (tune this)
const keyHistory = (uid) => `booking:history:user:${uid}`;

// same auth helper you had
function requireAuth(req, res, next) {
  const uidFromJwt = req.user?.id ?? req.user?.user_id;
  const uidFromHeader = Number(req.header('x-user-id'));
  const uid = Number.isInteger(uidFromJwt) ? uidFromJwt : uidFromHeader;

  if (!Number.isInteger(uid)) {
    return res.status(401).json({ ok: false, message: 'Unauthorized' });
  }
  req.user = { user_id: uid };
  next();
}

// "My" booking history (uses auth user id)
router.get("/", requireAuth, async (req, res) => {
  try {
    const userId = Number(req.user.user_id);
    const k = keyHistory(userId);

    // 1) Try Redis
    const hit = await rGet(k);
    if (hit) {
      res.set('X-Cache', 'HIT');
      return res.json(JSON.parse(hit));
    }

    // 2) Miss -> PG then Mongo upsert, then read
    const rows = await getBookingHistoryByUser(userId);
    await upsertUserBookingHistory(userId, rows);
    const docs = await listUserBookingHistory(userId);

    const payload = { ok: true, items: docs };

    // 3) Write-through to Redis
    try { await rSet(k, JSON.stringify(payload), TTL_HISTORY_SEC); } catch {}

    res.set('X-Cache', 'MISS');
    res.json(payload);
  } catch (e) {
    console.error("GET /bookings/history error:", e);
    res.status(500).json({ ok: false, message: e.message || "Failed to load history" });
  }
});

// (Optional) /mine mirror (cached the same way)
router.get('/mine', requireAuth, async (req, res) => {
  try {
    const userId = Number(req.user.user_id);
    const k = keyHistory(userId);
    const hit = await rGet(k);
    if (hit) {
      res.set('X-Cache', 'HIT');
      return res.json(JSON.parse(hit));
    }
    const rows = await getBookingHistoryByUser(userId);
    await upsertUserBookingHistory(userId, rows);
    const docs = await listUserBookingHistory(userId);
    const payload = { ok: true, items: docs };
    try { await rSet(k, JSON.stringify(payload), TTL_HISTORY_SEC); } catch {}
    res.set('X-Cache', 'MISS');
    res.json(payload);
  } catch (e) {
    console.error('GET /bookings/history error:', e);
    res.status(500).json({ ok: false, message: e.message });
  }
});

// Admin: history for arbitrary user_id (also cache per target user)
router.get('/user/:user_id', async (req, res) => {
  try {
    const uid = Number(req.params.user_id);
    if (!Number.isInteger(uid)) return res.status(400).json({ ok: false, message: 'Invalid user_id' });

    const k = keyHistory(uid);
    const hit = await rGet(k);
    if (hit) {
      res.set('X-Cache', 'HIT');
      return res.json(JSON.parse(hit));
    }

    const rows = await getBookingHistoryByUser(uid);
    await upsertUserBookingHistory(uid, rows);
    const docs = await listUserBookingHistory(uid);

    const payload = { ok: true, items: docs };
    try { await rSet(k, JSON.stringify(payload), TTL_HISTORY_SEC); } catch {}
    res.set('X-Cache', 'MISS');
    res.json(payload);
  } catch (e) {
    console.error('GET /bookings/history/user/:user_id error:', e);
    res.status(500).json({ ok: false, message: e.message });
  }
});

module.exports = router;
