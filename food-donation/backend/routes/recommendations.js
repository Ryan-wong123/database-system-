// backend/routes/recommendations.js
const express = require("express");
const router = express.Router();
const { pgPool, connectMongo } = require("../db/index");
const OpenAI = require("openai");

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const EMBEDDING_MODEL = process.env.EMBEDDING_MODEL || "text-embedding-3-small";
const VECTOR_INDEX = process.env.MONGO_VECTOR_INDEX || "embedding_idx"; // Atlas Search index name
const VECTOR_PATH = "embedding";
const K = Number(process.env.VECTOR_K || 10);
const NUM_CANDIDATES = Number(process.env.VECTOR_NUM_CANDIDATES || 200);

async function textToEmbedding(text) {
  const resp = await openai.embeddings.create({
    model: EMBEDDING_MODEL,
    input: text
  });
  return resp.data[0].embedding;
}

// Optional: pre-filter by tag, etc.
function makeVectorPipeline(queryVec, { tag, excludeAllergens } = {}) {
  const filter = {};
  if (tag) filter.tags = tag;
  if (excludeAllergens && Array.isArray(excludeAllergens) && excludeAllergens.length) {
    filter.allergen_flags = { $nin: excludeAllergens };
  }

  const stage = {
    $vectorSearch: {
      index: VECTOR_INDEX,
      path: VECTOR_PATH,
      queryVector: queryVec,
      numCandidates: NUM_CANDIDATES,
      limit: K,
      ...(Object.keys(filter).length ? { filter } : {})
    }
  };

  return [
    stage,
    {
      $project: {
        _id: 0,
        item_id: 1,
        name: 1,
        tags: 1,
        synonyms: 1,
        allergen_flags: 1,
        score: { $meta: "vectorSearchScore" }
      }
    }
  ];
}

router.post("/semantic-search", async (req, res) => {
  try {
    const { q, location_id } = req.body || {};
    if (!q || !String(q).trim()) {
      return res.status(400).json({ ok: false, error: "Missing query 'q'." });
    }

    const db = await connectMongo(); // native driver db handle
    const col = db.collection("recommended_fooditem_semantics");

    const qVec = await textToEmbedding(String(q).trim());

    const pipeline = makeVectorPipeline(qVec, {});
    const hits = await col.aggregate(pipeline).toArray();

    // Get availability from PG for the same item_ids
    const itemIds = hits.map(h => h.item_id);
    let avail = [];
    if (itemIds.length) {
      // Use your list_inventory function – returns rows with item_id, qty, expiry, location, etc.
      // If you want to restrict to a location, pass location_id; otherwise null
      const { rows } = await pgPool.query(
        "SELECT * FROM list_inventory($1,$2,$3)",
        [true, null, location_id ? Number(location_id) : null]
      );
      avail = rows;
    }

    // Merge scores + availability by item_id
    const availabilityMap = new Map();
    for (const r of avail) {
      // Normalize to your row shape; example assumes r.food_item_id and r.qty_total fields
      const itemId = r.food_item_id ?? r.item_id;
      const prev = availabilityMap.get(itemId) || { qty_total: 0, entries: [] };
      const addQty = r.qty_total ?? r.qty ?? 0;
      prev.qty_total += addQty;
      prev.entries.push(r);
      availabilityMap.set(itemId, prev);
    }

    const results = hits.map(h => ({
      ...h,
      availability: availabilityMap.get(h.item_id) || { qty_total: 0, entries: [] }
    }));

    return res.json({ ok: true, count: results.length, results });
  } catch (err) {
    console.error(err);
    res.status(500).json({ ok: false, error: "Semantic search failed." });
  }
});

module.exports = router;
