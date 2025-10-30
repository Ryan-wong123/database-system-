// routes/booking_history.js
const express = require('express');
const router = express.Router();
const { getBookingHistoryByUser } = require('../db/booking');

function requireAuth(req, res, next) {
  const uidFromJwt = req.user?.id ?? req.user?.user_id;     // from your global auth (if any)
  const uidFromHeader = Number(req.header('x-user-id'));    // from axios interceptor
  const uid = Number.isInteger(uidFromJwt) ? uidFromJwt : uidFromHeader;

  if (!Number.isInteger(uid)) {
    return res.status(401).json({ ok: false, message: 'Unauthorized' });
  }
  req.user = { user_id: uid };
  next();
}

// "My" booking history (uses auth user id)
router.get('/', requireAuth, async (req, res) => {
  try {
    const rows = await getBookingHistoryByUser(req.user.user_id);
    res.json({ ok: true, items: rows });
  } catch (e) {
    console.error('GET /bookings/history error:', e);
    res.status(500).json({ ok: false, message: e.message });
  }
});
router.get('/mine', requireAuth, async (req, res) => {
  try {
    const rows = await getBookingHistoryByUser(req.user.user_id);
    res.json({ ok: true, items: rows });
  } catch (e) {
    console.error('GET /bookings/history error:', e);
    res.status(500).json({ ok: false, message: e.message });
  }
});

// Also allow explicit user id (admin tools etc.)
router.get('/user/:user_id', async (req, res) => {
  try {
    const uid = Number(req.params.user_id);
    if (!Number.isInteger(uid)) return res.status(400).json({ ok: false, message: 'Invalid user_id' });
    const rows = await getBookingHistoryByUser(uid);
    res.json({ ok: true, items: rows });
  } catch (e) {
    console.error('GET /bookings/history/user/:user_id error:', e);
    res.status(500).json({ ok: false, message: e.message });
  }
});

module.exports = router;
