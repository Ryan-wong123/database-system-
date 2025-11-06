// backend/scripts/seed_food_embeddings.js
require("dotenv").config();
const { pgPool, connectMongoose } = require("../db/index");
const OpenAI = require("openai");
const Rec = require("../db/mongo_schema/recommended_fooditem_semantics");

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

/**
 * Pick ONE model and keep it consistent with your Atlas index dimensions:
 *  - text-embedding-3-small (1536 dims)  [cheaper]
 *  - text-embedding-3-large (3072 dims)  [higher quality]
 */
const EMBEDDING_MODEL = process.env.EMBEDDING_MODEL || "text-embedding-3-small";

function buildDocText({ name, ingredients, category, unit }) {
  // This is the semantic string we embed.
  // Feel free to enrich with synonyms or allergen flags if you have them.
  return [
    `Name: ${name}`,
    category ? `Category: ${category}` : "",
    unit ? `Unit: ${unit}` : "",
    ingredients ? `Ingredients: ${ingredients}` : ""
  ].filter(Boolean).join("\n");
}

async function fetchFoodRows() {
  // You already query via view v_food_items in db/fooditem.js; we’ll reproduce that here
  // with category/unit names resolved. Use your existing view if available.
  const sql = `
    SELECT fi.food_item_id AS item_id,
           fi.name,
           fi.ingredients,
           fc.name AS category,
           fu.unit AS unit
    FROM FoodItems fi
    JOIN FoodCategory fc ON fc.category_id = fi.category_id
    JOIN FoodUnit fu ON fu.unit_id = fi.unit_id
    ORDER BY fi.food_item_id
  `;
  const { rows } = await pgPool.query(sql);
  return rows;
}

async function embedBatch(texts) {
  // OpenAI official embeddings usage (Node.js)
  // Docs: https://platform.openai.com/docs/guides/embeddings
  const resp = await openai.embeddings.create({
    model: EMBEDDING_MODEL,
    input: texts
  });
  return resp.data.map(d => d.embedding);
}

async function main() {
  await connectMongoose();
  const rows = await fetchFoodRows();

  const BATCH = 100;
  for (let i = 0; i < rows.length; i += BATCH) {
    const slice = rows.slice(i, i + BATCH);

    const texts = slice.map(r => buildDocText(r));
    const vectors = await embedBatch(texts);

    const ops = slice.map((r, idx) => ({
      updateOne: {
        filter: { item_id: r.item_id },
        update: {
          $set: {
            item_id: r.item_id,
            name: r.name,
            embedding: vectors[idx],
            updated_at: new Date(),
            // optional enrichments:
            // tags: r.tags || [],
            // synonyms: r.synonyms || [],
            // allergen_flags: r.allergen_flags || []
          }
        },
        upsert: true
      }
    }));

    await Rec.bulkWrite(ops, { ordered: false });
    console.log(`Upserted ${ops.length} embeddings...`);
  }

  console.log("✅ Finished seeding embeddings");
  process.exit(0);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
