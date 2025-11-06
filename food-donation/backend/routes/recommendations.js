const express = require("express");
const router = express.Router();
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

    // normalize expiry format for UI
    const normalized = results.map(r => ({
      ...r,
      expiry: r.expiry ? new Date(r.expiry).toISOString().slice(0, 10) : null
    }));

    return res.json({ ok: true, count: normalized.length, results: normalized });
  } catch (err) {
    console.error("Semantic search error:", err);
    res.status(500).json({ ok: false, error: "Semantic search failed." });
  }
});

module.exports = router;
