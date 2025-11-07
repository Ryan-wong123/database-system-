// routes/recommendations.js
const express = require("express");
const router = express.Router();

const { recommendItemsForHousehold } = require("../services/recommendations");

// +++ add these lines +++
const { connectMongo } = require("../db/index");
const OpenAI = require("openai");
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const EMBEDDING_MODEL = process.env.EMBEDDING_MODEL || "text-embedding-3-small";
const VECTOR_INDEX = process.env.MONGO_VECTOR_INDEX || "embedding_idx";
const VECTOR_PATH = "embedding";
const K = Number(process.env.VECTOR_K || 10);
const NUM_CANDIDATES = Number(process.env.VECTOR_NUM_CANDIDATES || 200);

async function textToEmbedding(text) {
  const resp = await openai.embeddings.create({ model: EMBEDDING_MODEL, input: text });
  return resp.data[0].embedding;
}

function pipeline(queryVector) {
  return [
    {
      $vectorSearch: {
        index: VECTOR_INDEX,
        path: VECTOR_PATH,
        queryVector,
        numCandidates: NUM_CANDIDATES,
        limit: K,
      },
    },
    {
      $project: {
        _id: 0,
        item_id: 1,
        name: 1,
        category: 1,
        qty: "$qty_total",
        expiry: "$min_expiry",
        score: { $meta: "vectorSearchScore" },
      },
    },
  ];
}
// +++ end add +++

// GET /api/recommendations?household_id=123&location_id=5&limit=12
router.get("/", async (req, res) => {
  try {
    const householdId = Number(req.query.household_id);
    const locationId  = Number(req.query.location_id);
    const limit       = req.query.limit ? Number(req.query.limit) : 12;

    if (!Number.isInteger(householdId) || !Number.isInteger(locationId)) {
      return res.status(400).json({ error: "household_id and location_id are required integers" });
    }

    const results = await recommendItemsForHousehold({ householdId, locationId, limit });
    res.json({ items: results });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Internal error" });
  }
});

// POST /api/recommendations/semantic-search  { q: "high protein, halal" }
router.post("/semantic-search", async (req, res) => {
  try {
    const { q } = req.body || {};
    if (!q || !String(q).trim()) {
      return res.status(400).json({ ok: false, error: "Missing query 'q'." });
    }

    const db = await connectMongo();
    const col = db.collection("recommended_fooditem_semantics");

    const qVec = await textToEmbedding(String(q).trim());
    const results = await col.aggregate(pipeline(qVec)).toArray();

    const normalized = results.map(r => ({
      ...r,
      expiry: r.expiry ? new Date(r.expiry).toISOString().slice(0, 10) : null,
    }));

    res.json({ ok: true, count: normalized.length, results: normalized });
  } catch (err) {
    console.error("Semantic search error:", err);
    res.status(500).json({ ok: false, error: "Semantic search failed." });
  }
});

module.exports = router;
