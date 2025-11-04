// db/booking.js
const { pgPool } = require("./index");

// Allowed statuses – ensure these match your DB enum/check
const ALLOWED_BOOKING_STATUSES = new Set(['pending','confirmed','cancelled','completed']);

async function listBookingsAdmin() {
  const sql = `
    SELECT 
      b.booking_id,
      b.household_id,
      b.location_id,
      l.name       AS location_name,
      b.slot_start_time,
      b.slot_end_time,
      b.status,
      b.created_at
    FROM Bookings b
    JOIN Locations l ON l.location_id = b.location_id
    ORDER BY b.created_at DESC
  `;
  const { rows } = await pgPool.query(sql);
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

  const sql = `
    UPDATE Bookings
       SET status = $2
     WHERE booking_id = $1
     RETURNING booking_id, household_id, location_id, status, created_at
  `;
  const { rows } = await pgPool.query(sql, [Number(booking_id), status]);
  if (rows.length === 0) {
    const e = new Error('Booking not found');
    e.statusCode = 404;
    throw e;
  }
  return rows[0];
}
async function updateFoodItemTx({ item_id, name, category_id, qty, expiry_date, location_id, lot_id = null }) {
  const client = await pgPool.connect();
  try {
    await client.query('BEGIN');

    // 1) FoodItems: name + category
    await client.query(
      `
      UPDATE FoodItems
      SET name = $1,
          category_id = $2
      WHERE food_item_id = $3
      `,
      [name, category_id, item_id]
    );

    // 2) Inventory: qty + expiry + location
    //    If lot_id is provided, constrain by lot_id; else update all lots of this food item
    const params = [qty, expiry_date, location_id, item_id];
    const sqlInv = `
      UPDATE Inventory
      SET qty = $1,
          expiry_date = $2,
          location_id = $3
      WHERE food_item_id = $4
      ${lot_id ? 'AND lot_id = $5' : ''}
    `;
    if (lot_id) params.push(lot_id);
    await client.query(sqlInv, params);

    // Return the updated rows (matches your SELECT shape)
    const selParams = [item_id];
    const sel = `
      SELECT 
          fi.food_item_id,
          fi.name        AS food_name,
          fc.name        AS category,
          fu.unit        AS unit,
          i.lot_id,
          i.qty,
          i.expiry_date,
          l.name         AS location
      FROM Inventory i
      JOIN FoodItems    fi ON i.food_item_id = fi.food_item_id
      JOIN FoodCategory fc ON fi.category_id = fc.category_id
      JOIN FoodUnit     fu ON fi.unit_id = fu.unit_id
      JOIN Locations    l  ON i.location_id = l.location_id
      WHERE fi.food_item_id = $1
      ${lot_id ? 'AND i.lot_id = $2' : ''}
      ORDER BY fi.name
    `;
    if (lot_id) selParams.push(lot_id);

    const { rows } = await client.query(sel, selParams);

    await client.query('COMMIT');
    return rows; // array of updated lot rows
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('updateFoodItemTx failed:', err);
    throw err;
  } finally {
    client.release();
  }
}

async function getAllFoodCategories() {
  const { rows } = await pgPool.query(
    `SELECT category_id, name FROM FoodCategory ORDER BY name`
  );
  return rows;
}

module.exports = { listBookingsAdmin,listInventoryAdmin,updateBookingStatus,updateBookingStatus,updateFoodItemTx,getAllFoodCategories };
