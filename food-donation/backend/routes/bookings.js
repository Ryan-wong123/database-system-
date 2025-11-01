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
    // Normalize & validate items
    const normalizedItems = (Array.isArray(items) ? items : []).map((it, idx) => {
      const idNum  = Number(it.food_item_id ?? it.item_id ?? it.id);
      const qtyNum = Number(it.qty);
      if (!Number.isInteger(idNum) || idNum <= 0) {
        const err = new Error(`Row ${idx + 1}: invalid food_item_id`);
        err.status = 400;
        throw err;
      }
      if (!Number.isInteger(qtyNum) || qtyNum <= 0) {
        const err = new Error(`Row ${idx + 1}: qty must be >= 1`);
        err.status = 400;
        throw err;
      }
      return { food_item_id: idNum, qty: qtyNum };
    });

    const row = await createBooking({
      user_id: req.user.user_id,
      location_id: Number(location_id),
      slot_start,
      slot_end,
      household_id: Number.isFinite(Number(household_id)) ? Number(household_id) : null,
      items: normalizedItems, // safe
    });

    res.status(201).json({ ok: true, booking: row });
  } catch (e) {
    console.error('POST /bookings error:', e);
    const msg = e?.message || 'Failed to create booking';
    if (e?.status) return res.status(e.status).json({ ok: false, message: msg });
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
