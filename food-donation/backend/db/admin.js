// db/booking.js
const { pgPool } = require("./index");

// Allowed statuses – ensure these match your DB enum/check
const ALLOWED_BOOKING_STATUSES = new Set(['pending','confirmed','cancelled','completed']);

async function listBookingsAdmin() {
  const { rows } = await pgPool.query("SELECT * FROM admin_list_bookings()");
  return rows;
}
async function listInventoryAdmin() {
  const { rows } = await pgPool.query("SELECT * FROM admin_list_inventory()");
  return rows;
}
async function updateBookingStatus({ booking_id, status }) {
  if (!ALLOWED_BOOKING_STATUSES.has(status)) {
    const allowed = Array.from(ALLOWED_BOOKING_STATUSES).join(', ');
    throw new Error(`Invalid status "${status}". Allowed: ${allowed}`);
  }
  const { rows } = await pgPool.query(
    "SELECT * FROM admin_update_booking_status($1,$2)",
    [Number(booking_id), status]
  );
  if (rows.length === 0) {
    const e = new Error('Booking not found');
    e.statusCode = 404;
    throw e;
  }
  return rows[0];
}
async function updateFoodItemTx({ item_id, name, category_id, qty, expiry_date, location_id, lot_id = null }) {
  const { rows } = await pgPool.query(
    "SELECT * FROM admin_update_food_item_tx($1,$2,$3,$4,$5,$6,$7)",
    [item_id, name, category_id, qty, expiry_date, location_id, lot_id]
  );
  return rows; // array of updated lot rows
}
async function getAllFoodCategories() {
  const { rows } = await pgPool.query("SELECT * FROM admin_get_all_food_categories()");
  return rows;
}
module.exports = { listBookingsAdmin,listInventoryAdmin,updateBookingStatus,updateBookingStatus,updateFoodItemTx,getAllFoodCategories };
