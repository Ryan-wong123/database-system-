// scripts/seed_household_diet_embeddings.js
const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "..", ".env") });

const { pgPool, connectMongoose } = require("../db/index");
const OpenAI = require("openai");
const Household = require("../db/mongo_schema/household_diet_semantics"); // <-- NEW

if (!process.env.OPENAI_API_KEY) { console.error("❌ OPENAI_API_KEY missing"); process.exit(1); }
if (!process.env.MONGO_URI)      { console.error("❌ MONGO_URI missing");      process.exit(1); }

const EMBEDDING_MODEL = process.env.EMBEDDING_MODEL || "text-embedding-3-small";
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

/** Build text to embed (deterministic) */
function prefsToText(pref = {}) {
  const parts = [];
  if (pref.diet) parts.push(`Diet: ${pref.diet}`);
  if (Array.isArray(pref.avoids) && pref.avoids.length) parts.push(`Avoids: ${pref.avoids.join(", ")}`);
  if (pref.notes) parts.push(`Notes: ${pref.notes}`);
  return parts.join("\n") || "Diet: unspecified";
}

/** Aggregate distinct diet flags per household from PostgreSQL */
async function fetchHouseholdDietSummariesFromPG() {
  const sql = `
    WITH per_member AS (
      SELECT hm.household_id, d.diet_flags
      FROM public.userdiet ud
      JOIN public.householdmembers hm ON hm.householdmembers_id = ud.householdmembers_id
      JOIN public.diet d             ON d.diet_id             = ud.diet_id
    ),
    per_household AS (
      SELECT household_id,
             array_agg(DISTINCT diet_flags ORDER BY diet_flags) AS diets
      FROM per_member
      GROUP BY household_id
    )
    SELECT h.household_id,
           COALESCE(ph.diets, ARRAY[]::text[]) AS diets
    FROM public.households h
    LEFT JOIN per_household ph ON ph.household_id = h.household_id
    ORDER BY h.household_id
  `;
  const { rows } = await pgPool.query(sql);
  return rows; // [{ household_id, diets: [...] }]
}

async function embedBatch(texts) {
  const resp = await openai.embeddings.create({
    model: EMBEDDING_MODEL,
    input: texts,
  });
  return resp.data.map(d => d.embedding);
}

async function main() {
  await connectMongoose();
  console.log("✅ Connected to MongoDB (via Mongoose)");

  // 1) roll up household diet preferences
  const rows = await fetchHouseholdDietSummariesFromPG();

  // 2) embed + upsert in batches
  const BATCH = 100;
  for (let i = 0; i < rows.length; i += BATCH) {
    const chunk = rows.slice(i, i + BATCH);

    const texts = chunk.map(r => {
      const diet = (r.diets && r.diets.length) ? r.diets.join(", ") : null;
      return prefsToText({ diet, avoids: null, notes: null });
    });

    const vectors = await embedBatch(texts);

    const ops = chunk.map((r, idx) => {
      const diet = (r.diets && r.diets.length) ? r.diets.join(", ") : null;
      return {
        updateOne: {
          filter: { household_id: Number(r.household_id) },
          update: {
            $set: {
              household_id: Number(r.household_id),
              preferences: { diet, avoids: null, notes: null },
              embedding: vectors[idx].map(Number),
              updated_at: new Date(),
            },
          },
          upsert: true,
        },
      };
    });

    await Household.bulkWrite(ops, { ordered: false }); // <-- same pattern as food seeder
    console.log(`⬆️ Upserted ${ops.length} household embeddings…`);
  }

  console.log("✅ Finished seeding household diet embeddings");
  process.exit(0);
}

main().catch(e => { console.error(e); process.exit(1); });
