// db/booking.js
const { pgPool } = require("./index");

// Allowed statuses – ensure these match your DB enum/check
const ALLOWED_BOOKING_STATUSES = new Set([
  "pending",
  "confirmed",
  "cancelled",
  "completed",
]);

async function listBookingsAdmin() {
  const { rows } = await pgPool.query("SELECT * FROM admin_list_bookings()");
  return rows;
}

async function listInventoryAdmin() {
  const { rows } = await pgPool.query("SELECT * FROM admin_list_inventory()");
  return rows;
}

async function updateBookingStatus({ booking_id, status }) {
  const target = String(status).trim().toLowerCase();
  if (!ALLOWED_BOOKING_STATUSES.has(target)) {
    const allowed = Array.from(ALLOWED_BOOKING_STATUSES).join(", ");
    const err = new Error(`Invalid status "${status}". Allowed: ${allowed}`);
    err.statusCode = 400;
    throw err;
  }

  const bid = Number(booking_id);
  if (!Number.isInteger(bid)) {
    const err = new Error("Invalid booking_id");
    err.statusCode = 400;
    throw err;
  }

  const client = await pgPool.connect();
  try {
    await client.query("BEGIN");

    if (target === "cancelled") {
      // Put back (allocated - collected) per lot
      await client.query("SELECT admin_restock_booking($1)", [bid]);
    }

    const { rows } = await client.query(
    "SELECT * FROM admin_update_booking_status_raw($1,$2)",
      [bid, target] // <-- correct param array
    );

    if (!rows.length) {
     // Ask DB what happened
     const cur = await client.query("SELECT admin_get_booking_status($1) AS status", [bid]);
      if (cur.rowCount && String(cur.rows[0].status).toLowerCase() === 'cancelled') {
       const err = new Error('Booking is already cancelled and cannot be changed');
       err.statusCode = 409;
       throw err;
  }
  const err = new Error('Booking not found');
  err.statusCode = 404;
  throw err;
}

    await client.query("COMMIT");
    return rows[0];
  } catch (err) {
    try { await client.query("ROLLBACK"); } catch {}
    throw err;
  } finally {
    client.release();
  }
}

async function updateFoodItemTx({
  item_id,
  name,
  category_id,
  qty,
  expiry_date,
  location_id,
  lot_id = null,
}) {
  const { rows } = await pgPool.query(
    "SELECT * FROM admin_update_food_item_tx($1,$2,$3,$4,$5,$6,$7)",
    [item_id, name, category_id, qty, expiry_date, location_id, lot_id]
  );
  return rows; // array of updated lot rows
}

async function getAllFoodCategories() {
  const { rows } = await pgPool.query(
    "SELECT * FROM admin_get_all_food_categories()"
  );
  return rows;
}

// Optional direct helper if you want to call it elsewhere
async function adminRestockBooking(bookingId) {
  const bid = Number(bookingId);
  if (!Number.isInteger(bid)) throw new Error("Invalid bookingId");
  await pgPool.query("SELECT admin_restock_booking($1)", [bid]);
}

module.exports = {
  listBookingsAdmin,
  listInventoryAdmin,
  updateBookingStatus,
  updateFoodItemTx,
  getAllFoodCategories,
  adminRestockBooking,
};
