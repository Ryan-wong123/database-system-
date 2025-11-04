// db/queries.js
const { pgPool } = require("./index");

/** Inventory (front & admin) **/
async function listInventory({ inStockOnly, q, location_id }) {
  const inStockBool =
    inStockOnly === true || inStockOnly === "true" || inStockOnly === 1 || inStockOnly === "1"
      ? true
      : inStockOnly === false || inStockOnly === "false" || inStockOnly === 0 || inStockOnly === "0"
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

/** Locations **/
async function listLocations() {
  const sql = `SELECT location_id AS id, name FROM Locations ORDER BY name ASC`;
  const { rows } = await pgPool.query(sql);
  return rows;
}

/** Units **/
async function listUnits() {
  const { rows } = await pgPool.query(
    'SELECT unit_id, unit FROM foodunit ORDER BY unit ASC'
  );
  return rows;
}

module.exports = { listInventory, listLocations, listUnits};
