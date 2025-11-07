// db/booking_history_upsert.js
const BookingHistory = require("./mongo_schema/booking_history");

function normalize(user_id, row) {
  const items = Array.isArray(row.items) ? row.items : [];
  return {
    user_id,
    booking_id: row.booking_id,
    booking_key: `${user_id}:${row.booking_id}`,
    location_id: row.location_id,
    location_name: row.location_name,
    slot_start: row.slot_start ? new Date(row.slot_start) : null,
    slot_end: row.slot_end ? new Date(row.slot_end) : null,
    status: row.status || "pending",
    created_at: row.created_at ? new Date(row.created_at) : new Date(),
    items_count: typeof row.items_count === "number" ? row.items_count : items.length,
    items,
    source: "postgres",
    as_of: new Date(),
    cache_status: "fresh",
  };
}

async function upsertUserBookingHistory(user_id, rows = []) {
  if (!rows.length) return;
  const ops = rows.map(r => ({
    updateOne: {
      filter: { user_id, booking_id: r.booking_id },
      update: { $set: normalize(user_id, r) },
      upsert: true
    }
  }));
  await BookingHistory.bulkWrite(ops, { ordered: false });
}

async function listUserBookingHistory(user_id) {
  return BookingHistory.find({ user_id }).sort({ slot_start: -1 }).lean();
}

module.exports = { upsertUserBookingHistory, listUserBookingHistory };
