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

async function listLocations() {
  const { rows } = await pgPool.query("SELECT * FROM locations_list()");
  return rows; 
}

async function listUnits() {
  const { rows } = await pgPool.query("SELECT * FROM foodunit_list()");
  return rows; 
}

module.exports = { listInventory, listLocations, listUnits};
