// db/booking.js
const db = require('./index'); // your pg Pool or client

async function createBooking({ user_id, location_id, slot_start, slot_end, household_id, items }) {
  const itemsJson = Array.isArray(items) ? JSON.stringify(items) : '[]';
  const { rows } = await db.query(
    `SELECT booking_id, status, slot_start, slot_end
     FROM sp_create_booking($1, $2, $3, $4, $5, $6::jsonb);`,
    [user_id, location_id, slot_start, slot_end, (household_id ?? null), itemsJson]
  );
  return rows[0];
}

async function updateBookingStatus(booking_id, status) {
  const { rows } = await db.query(
    `SELECT booking_id, status
     FROM sp_update_booking_status($1, $2);`,
    [booking_id, status]
  );
  return rows[0];
}

async function getBookingHistoryByUser(user_id) {
  const { rows } = await db.query(
    `SELECT booking_id, location_id, location_name, slot_start, slot_end, status, created_at, items_count
     FROM sp_booking_history_by_user($1)
     ORDER BY slot_start DESC;`,
    [user_id]
  );
  return rows;
}

// Optional: by household (if you ever need it)
async function getBookingHistoryByHousehold(household_id) {
  const { rows } = await db.query(
    `SELECT booking_id, location_id, location_name, slot_start, slot_end, status, created_at, items_count
     FROM sp_booking_history_by_household($1)
     ORDER BY slot_start DESC;`,
    [household_id]
  );
  return rows;
}
async function requireHousehold(req, res, next) {
  try {
    const { rows } = await db.query(
      `SELECT 1
       FROM HouseholdMembers
       WHERE user_id = $1
       LIMIT 1`,
      [req.user.user_id]
    );
    if (rows.length === 0) {
      return res.status(403).json({
        ok: false,
        message: 'Join or create a household before booking.',
        redirect: '/profile?reason=no-household'
      });
    }
    next();
  } catch (e) {
    next(e);
  }
}
module.exports = {
  createBooking,
  updateBookingStatus,
  getBookingHistoryByUser,
  getBookingHistoryByHousehold,
  requireHousehold,
};
