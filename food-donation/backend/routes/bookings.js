// routes/bookings.js
const express = require('express');
const router = express.Router();
const { createBooking, updateBookingStatus, requireHousehold } = require('../db/booking');

// Replace with your real auth (JWT); for demo we read a header.
function requireAuth(req, res, next) {
  const uid = Number(req.header('x-user-id'));
  if (!Number.isInteger(uid)) return res.status(401).json({ ok: false, message: 'Unauthorized' });
  req.user = { user_id: uid };
  next();
}

// Create a PENDING booking (no items allocated)
router.post('/', requireAuth, requireHousehold, async (req, res) => {
  const { location_id, slot_start, slot_end, household_id, items } = req.body || {};
  try {
    const row = await createBooking({
      user_id: req.user.user_id,
      location_id: Number(location_id),
      slot_start,
      slot_end,
      household_id: Number.isFinite(Number(household_id)) ? Number(household_id) : null,
      items: Array.isArray(items) ? items : [],    // [{ food_item_id, qty }]
    });
    res.status(201).json({ ok: true, booking: row });
  } catch (e) {
    const msg = e?.message || 'Failed to create booking';
    // overlap/constraint → 409, else 400
    if (e?.code === '23P01' || /overlap|full/i.test(msg)) {
      return res.status(409).json({ ok: false, message: msg });
    }
    res.status(400).json({ ok: false, message: msg });
  }
});

// Optional: update booking status
router.patch('/:booking_id/status', requireAuth, async (req, res) => {
  try {
    const id = Number(req.params.booking_id);
    const { status } = req.body || {};
    if (!Number.isInteger(id)) return res.status(400).json({ ok: false, message: 'Invalid booking_id' });
    if (typeof status !== 'string') return res.status(400).json({ ok: false, message: 'Invalid status' });

    const row = await updateBookingStatus(id, status);
    res.json({ ok: true, booking: row });
  } catch (e) {
    console.error('PATCH /bookings/:id/status error:', e);
    res.status(500).json({ ok: false, message: e.message });
  }
});

module.exports = router;
