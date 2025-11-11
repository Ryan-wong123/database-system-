const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "..", ".env") });

const { pgPool, connectMongoose } = require("../db/index");
const OpenAI = require("openai");
const Rec = require("../db/mongo_schema/recommended_fooditem_semantics");

if (!process.env.OPENAI_API_KEY) { console.error("❌ OPENAI_API_KEY missing"); process.exit(1); }
if (!process.env.MONGO_URI) { console.error("❌ MONGO_URI missing"); process.exit(1); }

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const EMBEDDING_MODEL = process.env.EMBEDDING_MODEL || "text-embedding-3-small";

/** Text we embed */
function buildDocText({ name, ingredients, category, unit }) {
  return [
    `Name: ${name}`,
    category ? `Category: ${category}` : "",
    unit ? `Unit: ${unit}` : "",
    ingredients ? `Ingredients: ${ingredients}` : "",
  ].filter(Boolean).join("\n");
}

/** Pull base item rows (with category/unit) */
async function fetchFoodBase() {
  const sql = `
    SELECT fi.food_item_id AS item_id,
           fi.name,
           fi.ingredients,
           fc.name AS category,
           fu.unit AS unit
    FROM FoodItems fi
    JOIN FoodCategory fc ON fc.category_id = fi.category_id
    JOIN FoodUnit fu     ON fu.unit_id     = fi.unit_id
    ORDER BY fi.food_item_id
  `;
  const { rows } = await pgPool.query(sql);
  return rows; // [{item_id, name, ingredients, category, unit}, ...]
}

/** Pull availability snapshot: SUM(qty), MIN(expiry) per item_id */
async function fetchAvailability(itemIds) {
  if (!itemIds.length) return new Map();
  const sql = `
    SELECT inv.food_item_id AS item_id,
           COALESCE(SUM(inv.qty), 0) AS qty_total,
           MIN(inv.expiry_date)      AS min_expiry
    FROM Inventory inv
    WHERE inv.food_item_id = ANY($1::int[])
    GROUP BY inv.food_item_id
  `;
  const { rows } = await pgPool.query(sql, [itemIds]);
  return new Map(rows.map(r => [r.item_id, {
    qty_total: Number(r.qty_total || 0),
    min_expiry: r.min_expiry || null,
  }]));
}

async function embedBatch(texts) {
  const resp = await openai.embeddings.create({ model: EMBEDDING_MODEL, input: texts });
  return resp.data.map(d => d.embedding);
}

async function seed_food_embedding() {
  await connectMongoose();

  // 1) base rows
  const baseRows = await fetchFoodBase();
  if (!baseRows || baseRows.length === 0) {
    console.log("No food rows to process.");
    return { updated: 0 };
  }

  // 2) availability snapshot (sum qty, earliest expiry)
  const ids = baseRows.map(r => r.item_id);
  const avail = await fetchAvailability(ids);

  // 3) embed in batches and upsert with denormalized fields
  const BATCH = 100;
  for (let i = 0; i < baseRows.length; i += BATCH) {
    const chunk = baseRows.slice(i, i + BATCH);
    const texts = chunk.map(r => buildDocText(r));
    const vectors = await embedBatch(texts);
    if (!vectors || !Array.isArray(vectors) || vectors.length !== chunk.length) {
      console.warn(`[food] Embedding failed or incomplete (batch ${i / BATCH + 1}). Stopping.`);
      return { updated };
    }
    const ops = chunk.map((r, idx) => {
      const av = avail.get(r.item_id) || { qty_total: 0, min_expiry: null };
      return {
        updateOne: {
          filter: { item_id: r.item_id },
          update: {
            $set: {
              item_id: r.item_id,
              name: r.name,
              category: r.category || "",
              qty_total: Number(av.qty_total || 0),
              min_expiry: av.min_expiry ? new Date(av.min_expiry) : null,
              embedding: vectors[idx],
              updated_at: new Date(),
            },
          },
          upsert: true,
        }
      };
    });
    await Rec.bulkWrite(ops, { ordered: false });
  }
}

//main().catch((e) => { console.error(e); process.exit(1); });
