// db/queries.js
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const pgPool = require("./index");

const JWT_SECRET = process.env.JWT_SECRET || "supersecret";

/** AUTH **/
async function registerUser(payload) {
  const { name, email, password, role, household_head_name, income_group, diet_flags } = payload;
  const password_hash = await bcrypt.hash(password, 10);

  if (role === "donee") {
    const result = await pgPool.query(
      "SELECT * FROM register_user_donee($1,$2,$3,$4,$5,$6,$7)",
      [name, email, password_hash, role, household_head_name, income_group, diet_flags]
    );
    return result.rows[0];
  } else {
    const result = await pgPool.query(
      "SELECT * FROM register_user($1,$2,$3,$4)",
      [name, email, password_hash, role]
    );
    return result.rows[0];
  }
}
async function loginUser(email, password) {
  const result = await pgPool.query("SELECT * FROM login_user($1)", [email]);
  if (result.rowCount === 0) throw new Error("Invalid credentials");

  const user = result.rows[0];
  const match = await bcrypt.compare(password, user.password_hash);
  if (!match) throw new Error("Invalid credentials");

  const token = jwt.sign({ id: user.user_id, role: user.role }, JWT_SECRET, { expiresIn: "1h" });

  return { user_id: user.user_id, email: user.email, role: user.role, token };
}

async function listInventory({ inStockOnly, q, location_id }) {
  // Normalize inputs for the SQL function (NULLs mean "ignore filter")
  const inStockBool =
    inStockOnly === true ||
    inStockOnly === "true" ||
    inStockOnly === 1 ||
    inStockOnly === "1"
      ? true
      : inStockOnly === false ||
        inStockOnly === "false" ||
        inStockOnly === 0 ||
        inStockOnly === "0"
      ? false
      : null;

  const search = q && String(q).trim() !== "" ? String(q).trim() : null;
  const locId =
    location_id !== undefined && location_id !== null && String(location_id).trim() !== ""
      ? Number(location_id)
      : null;

  const { rows } = await pgPool.query(
    "SELECT * FROM list_inventory($1,$2,$3)",
    [inStockBool, search, locId]
  );
  return rows;
}
async function listInventoryAdmin() {
  const { rows } = await pgPool.query("SELECT * FROM admin_list_inventory()");
  return rows;
}
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

async function listLocations() {
  const sql = `
    SELECT
      location_id AS id,
      name
    FROM Locations
    ORDER BY name ASC
  `;
  const { rows } = await pgPool.query(sql);
  return rows;
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
// db/queries.js
async function getAllFoodCategories() {
  const { rows } = await pgPool.query(
    `SELECT category_id, name FROM FoodCategory ORDER BY name`
  );
  return rows;
}


module.exports = {
  registerUser,
  loginUser,
  listInventory,
  listInventoryAdmin,
  listBookingsAdmin,
  listLocations,
  updateFoodItemTx,
  getAllFoodCategories,
};
