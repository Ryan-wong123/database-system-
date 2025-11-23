const {connectMongo} = require("./index");
const InventoryCache = require("./mongo_schema/inventory_snapshot");
const {getInventory} = require("./inventory")


function computeCacheMeta(ttlSec = 300) {
  const as_of = new Date();
  const cache_valid_until = new Date(as_of.getTime() + ttlSec * 1000);
  return { as_of, cache_ttl_sec: ttlSec, cache_valid_until, cache_status: "fresh" };
}

// --- Core function: refresh Mongo cache from PG view ---
async function updateMongoInventory({ reconcileDeletes = true, ttlSec = 300 } = {}) {
  await connectMongo();

  // 1. Get current inventory snapshot from Postgres
  const rows = await getInventory();

  // rows are [{ inventory: { ...actual data... } }], since your query wraps to_jsonb(t)
  const inventoryRows = rows.map(r => r.inventory);

  // 2. Prepare bulk upserts
  const meta = computeCacheMeta(ttlSec);
  const bulkOps = inventoryRows.map(row => ({
    updateOne: {
      filter: { inventory_id: row.lot_id },
      upsert: true,
      update: {
        $set: {
          inventory_id: row.lot_id,
          item_name: row.name,
          category: row.category,
          unit: row.unit,
          qty_on_hand: Number(row.qty) || 0,
          location_id: row.location_id,
          location_name: row.location_name,
          expiry_date: row.expiry_date ? new Date(row.expiry_date) : null,
          lot_id: row.lot_id,
          food_item_id: row.food_item_id,
          diets: row.diet_flags || [],
          ...meta,
        },
      },
    },
  }));

  if (bulkOps.length) {
    const res = await InventoryCache.bulkWrite(bulkOps, { ordered: false });
    console.log(`Synced ${res.matchedCount + res.upsertedCount} inventory docs`);
  } else {
    console.log("No inventory rows found in Postgres");
  }

  // 3. Optional: remove stale docs not present in the current view
  if (reconcileDeletes) {
    const keepIds = new Set(inventoryRows.map(r => r.lot_id));
    const stale = await InventoryCache.find({ inventory_id: { $nin: [...keepIds] } }, { _id: 1 });
    if (stale.length) {
      await InventoryCache.deleteMany({ _id: { $in: stale.map(s => s._id) } });
      console.log(`Removed ${stale.length} stale docs`);
    }
  }

  return { count: inventoryRows.length };
}

// --- Read directly from Mongo cache ---
async function getInventoryFromMongo(filter = {}) {
  await connectMongo();

  const query = {};

  if (filter.search) {
    query.$or = [
      { item_name: { $regex: filter.search, $options: "i" } }, //insensitive
      { category: { $regex: filter.search, $options: "i" } },
    ];
  }

  if (filter.diet) query.diets = filter.diet;
  if (filter.inStockOnly) query.qty_on_hand = { $gt: 0 };
  if (filter.category) query.category = filter.category;

  const result = await InventoryCache.find(query).sort({ expiry_date: 1 }).lean();
  return result;
}

module.exports = {
  updateMongoInventory,
  getInventoryFromMongo,
};