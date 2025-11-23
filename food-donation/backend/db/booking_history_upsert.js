// db/booking_history_upsert.js
const BookingHistory = require("./mongo_schema/booking_history");
const { pgPool } = require("./index");

const num = (v) => Number.isFinite(Number(v)) ? Number(v) : 0;
const parseArrayMaybe = (x) => {
  if (!x) return null;
  if (Array.isArray(x)) return x;
  if (typeof x === "string") {
    try { const v = JSON.parse(x); return Array.isArray(v) ? v : null; } catch { return null; }
  }
  return null;
};
const sumBy = (xs, pick) => Array.isArray(xs) ? xs.reduce((t, x) => t + num(pick(x)), 0) : 0;

async function fetchItemTotalsForBookings(bookingIds) {
  if (!bookingIds.length) return new Map();

  // Call the Postgres function instead of building an IN (...) list
  const { rows } = await pgPool.query(
    "SELECT * FROM booking_item_totals_for_bookings($1)",
    [bookingIds] // node-postgres sends this as int[]
  );

  const map = new Map(); // key `${booking_id}:${food_item_id}`
  for (const r of rows) {
    map.set(`${r.booking_id}:${r.food_item_id}`, {
      alloc: num(r.qty_allocated_sum),
      coll:  num(r.qty_collected_sum),
    });
  }
  return map;
}

function normalizeOneDoc(user_id, row, totalsByBookingItem) {
  const status = String(row.status || "pending").toLowerCase();

  const itemsParsed =
    parseArrayMaybe(row.items) ||
    parseArrayMaybe(row.items_json) ||
    (Array.isArray(row.items) ? row.items : []);

  const items = itemsParsed.map((it) => {
    const item_id = it.item_id ?? it.id ?? it.food_item_id ?? it.alloc_food_item_id ?? null;

    // exact totals from PG
    const t = item_id != null
      ? (totalsByBookingItem.get(`${row.booking_id}:${item_id}`) || { alloc: 0, coll: 0 })
      : { alloc: 0, coll: 0 };

    // last-resort derive from lots if present
    if (!t.alloc && !t.coll) {
      const lotsRaw = it?.lots ?? it?.lots_json ?? it?.alloc_lots_json ?? null;
      const lots = parseArrayMaybe(lotsRaw) || (Array.isArray(lotsRaw) ? lotsRaw : []);
      t.alloc = sumBy(lots, l => l.qty_allocated ?? l.allocated ?? l.qty ?? l.total_qty ?? 0);
      t.coll  = sumBy(lots, l => l.qty_collected ?? l.collected ?? 0);
    }

    return {
      item_id,
      name: it.name ?? it.food_name ?? it.alloc_food_name ?? (item_id ? `Item #${item_id}` : null),
      unit: it.unit ?? it.uom ?? null,
      qty_allocated: t.alloc,
      qty_collected: t.coll,
    };
  });

  return {
    user_id,
    booking_id: row.booking_id,
    booking_key: `${user_id}:${row.booking_id}`,
    location_id: row.location_id,
    location_name: row.location_name,
    slot_start: row.slot_start ? new Date(row.slot_start) : null,
    slot_end: row.slot_end ? new Date(row.slot_end) : null,
    status,
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

  const bookingIds = rows.map(r => r.booking_id).filter((v) => Number.isInteger(Number(v)));
  const totalsByBookingItem = await fetchItemTotalsForBookings(bookingIds);

  const ops = rows.map((r) => ({
    updateOne: {
      filter: { user_id, booking_id: r.booking_id },
      update: { $set: normalizeOneDoc(user_id, r, totalsByBookingItem) },
      upsert: true,
    },
  }));
  await BookingHistory.bulkWrite(ops, { ordered: false });
}

async function listUserBookingHistory(user_id) {
  return BookingHistory.find({ user_id }).sort({ slot_start: -1 }).lean();
}

module.exports = { upsertUserBookingHistory, listUserBookingHistory };
