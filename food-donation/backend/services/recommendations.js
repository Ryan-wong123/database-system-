// services/recommendations.js
const { pgPool } = require("../db/index");
const HouseholdProfiles = require("../db/mongo_schema/household_diet_semantics");
const RecommendedFoodSem = require("../db/mongo_schema/recommended_fooditem_semantics");

// small helpers
function l2norm(vec) {
  let s = 0; for (let i = 0; i < vec.length; i++) s += vec[i] * vec[i];
  const n = Math.sqrt(s) || 1;
  for (let i = 0; i < vec.length; i++) vec[i] /= n;
  return vec;
}
function cosineSim(a, b) {
  let s = 0; for (let i = 0; i < a.length; i++) s += a[i] * b[i];
  return s;
}

/**
 * Recommend items for a household at a given location, ranked by cosine sim to household profile.
 * - Uses Postgres inventory for what's available (qty, expiry, location)  → food_item_id set
 * - Uses Mongo item embeddings to rank → name + metadata for dropdown
 */
async function recommendItemsForHousehold({ householdId, locationId, limit = 12, minQty = 1 }) {
  // 1) get household embedding (1536-dim)
  const hh = await HouseholdProfiles.findOne(
    { household_id: householdId },
    { embedding: 1 },
  ).lean();

  if (!hh?.embedding || hh.embedding.length !== 1536) {
    return []; // or throw; schema enforces 1536 min/max, so missing means not seeded yet
  }

  const hhVec = l2norm(hh.embedding.slice());

  // 2) from Postgres, fetch available item IDs at the location (qty > 0, not expired)
  const { rows } = await pgPool.query(
    `
    SELECT DISTINCT fi.food_item_id, fi.name
    FROM public.inventory inv
    JOIN public.fooditems fi ON fi.food_item_id = inv.food_item_id
    WHERE inv.location_id = $1
      AND inv.qty > $2
      AND inv.expiry_date >= CURRENT_DATE
    ORDER BY fi.food_item_id
    `,
    [locationId, minQty]
  );
  if (rows.length === 0) return [];

  const itemIds = rows.map(r => r.food_item_id);

  // 3) fetch embeddings for those items (Mongo)
  const items = await RecommendedFoodSem.find(
    { item_id: { $in: itemIds } },
    { item_id: 1, name: 1, category: 1, embedding: 1, updated_at: 1 }
  ).lean();

  if (items.length === 0) return [];

  // 4) score by cosine similarity
  const scored = [];
  for (const it of items) {
    if (!Array.isArray(it.embedding) || it.embedding.length !== 1536) continue;
    const v = l2norm(it.embedding.slice());
    const score = cosineSim(hhVec, v);
    scored.push({
      item_id: it.item_id,
      name: it.name,
      category: it.category ?? null,
      score,
    });
  }

  // 5) sort + slice + return minimal shape for dropdown
  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, limit);
}

module.exports = { recommendItemsForHousehold };
