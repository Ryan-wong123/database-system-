// pgPool/booking.js
const { pgPool } = require('./index'); // your pg Pool or client

async function createBooking({ user_id, household_id, location_id, slot_start, slot_end, items }) {
  // ---- validations in code ----
  if (!slot_start || !slot_end) throw new Error("slot_start and slot_end are required");
  if (new Date(slot_end) <= new Date(slot_start)) throw new Error("slot_end must be after slot_start");

  // ensure location is active (short query)
  {
    const { rows } = await pgPool.query(
      "SELECT is_active FROM Locations WHERE location_id = $1",
      [location_id]
    );
    if (rows.length === 0 || !rows[0].is_active) {
      throw new Error(`Invalid or inactive location_id ${location_id}`);
    }
  }

  // resolve household in code if not provided
  if (!household_id) {
    const { rows } = await pgPool.query(
      `SELECT household_id FROM HouseholdMembers
       WHERE user_id = $1
       ORDER BY joined_at DESC LIMIT 1`,
      [user_id]
    );
    household_id = rows[0]?.household_id ?? null;
    if (!household_id) throw new Error(`User ${user_id} must join/create a household before booking`);
  }

  // normalize items in code
  const reqItems = Array.isArray(items) ? items : [];
  for (const it of reqItems) {
    it.food_item_id = Number(it.food_item_id ?? it.item_id ?? it.id);
    it.qty = Number(it.qty);
    if (!Number.isInteger(it.food_item_id) || it.food_item_id <= 0 || !Number.isInteger(it.qty) || it.qty <= 0) {
      throw new Error(`Invalid item: ${JSON.stringify(it)}`);
    }
  }

  const client = await pgPool.connect();
  try {
    await client.query("BEGIN");

    // 1) create booking (short SQL)
    const { rows: bRows } = await client.query(
      "SELECT * FROM booking_create_simple($1,$2,$3,$4,$5)",
      [household_id, location_id, slot_start, slot_end, user_id]
    );
    const booking = bRows[0];
    const booking_id = booking.booking_id;

    // 2) FEFO allocation in code, using simple read + simple writes
    for (const req of reqItems) {
      let remaining = req.qty;

      // fetch FEFO lots (short SQL)
      const { rows: lots } = await client.query(
        "SELECT * FROM inventory_fefo_lots($1,$2)",
        [location_id, req.food_item_id]
      );

      for (const lot of lots) {
        if (remaining <= 0) break;
        const take = Math.min(remaining, lot.qty);
        if (take <= 0) continue;

        // upsert booking transaction (short SQL)
        await client.query(
          "SELECT booking_tx_upsert($1,$2,$3,$4)",
          [booking_id, lot.lot_id, req.food_item_id, take]
        );

        // decrement inventory (short SQL)
        await client.query(
          "SELECT inventory_decrement($1,$2)",
          [lot.lot_id, take]
        );

        remaining -= take;
      }
      // (Optional) if remaining > 0, you can decide whether to error, allow partial, etc.—in code.
    }

    await client.query("COMMIT");

    // 3) return base summary (short SQL) — or return booking directly from step 1
    const { rows: sRows } = await pgPool.query(
      "SELECT * FROM booking_summary($1)",
      [booking_id]
    );
    return sRows[0]; // { booking_id, status, slot_start, slot_end }
  } catch (err) {
    await client.query("ROLLBACK");

    // NEW: nice message when the exclusion constraint fires
    if (err.code === '23P01' && err.constraint === 'no_overlap_booking') {
      const e = new Error("You already have a booking that overlaps this time window. Please pick a different slot.");
      e.status = 409; // Conflict
      throw e;
    }

    throw err;
  } finally {
    client.release();
  }
}

async function updateBookingStatus(booking_id, status) {
  const { rows } = await pgPool.query(
    `SELECT booking_id, status
     FROM sp_update_booking_status($1, $2);`,
    [booking_id, status]
  );
  return rows[0];
}

async function getBookingHistoryByUser(user_id) {
  const { rows } = await pgPool.query(
    "SELECT * FROM booking_history_by_user($1)",
    [user_id]
  );
  return rows; // each row already has items_count + items JSON
}

// Optional: by household (if you ever need it)
async function getBookingHistoryByHousehold(household_id) {
  const { rows } = await pgPool.query(
    `SELECT booking_id, location_id, location_name, slot_start, slot_end, status, created_at, items_count
     FROM sp_booking_history_by_household($1)
     ORDER BY slot_start DESC;`,
    [household_id]
  );
  return rows;
}
async function requireHousehold(req, res, next) {
  try {
    const { rows } = await pgPool.query(
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
