const cron = require("node-cron");
const { updateMongoInventory, getInventoryFromMongo } = require("../db/mongo_inventory");
const {seed_food_embedding} = require("../scripts/seed_food_embeddings");
const {seed_household_diet_embeddings} = require("../scripts/seed_household_diet_embeddings");
let isInventoryRunning = false;
let isFoodEmbeddingRunning = false;
let isHouseholdEmbeddingRunning = false;

function startInventoryCron() {
  //run every 5 minutes
  const schedule = process.env.INVENTORY_CRON || "* * * * *";

  const task = cron.schedule(
    schedule,
    async () => {
      if (isInventoryRunning) {
        console.log("[CRON] updateMongoInventory skipped: already running");
        return;
      }
      isInventoryRunning = true;
      const started = new Date();
      console.log(`[CRON] updateMongoInventory started at ${started.toISOString()}`);

      try {
        const res = await updateMongoInventory({
          ttlSec: Number(process.env.CACHE_TTL_SEC || 300),
          reconcileDeletes: process.env.RECONCILE_DELETES !== "false",
        });
        const ended = new Date();
        console.log(
          `[CRON] updateMongoInventory ok: ${res.count} rows, duration=${ended - started}ms`
        );
      } catch (err) {
        console.error("[CRON] updateMongoInventory failed:", err);
      } finally {
        isInventoryRunning = false;
      }
    },
    {
      scheduled: false,          
      timezone: "Asia/Singapore" 
    }
  );

  task.start();
  console.log(`[CRON] Scheduled updateMongoInventory with "${schedule}"`);
  return task;
}

/** FOOD EMBEDDING CRON — run once a week, Sunday 3:00 AM */
function startFoodEmbeddingCron() {
  const schedule = process.env.FOOD_EMBEDDING_CRON || "* * * * *"; // 3am Sunday

  const task = cron.schedule(
    schedule,
    async () => {
      if (isFoodEmbeddingRunning) {
        console.log("[CRON] seed_food_embedding skipped: already running");
        return;
      }
      isFoodEmbeddingRunning = true;
      const started = new Date();
      console.log(`[CRON] seed_food_embedding started at ${started.toISOString()}`);

      try {
        const res = await seed_food_embedding();
        const ended = new Date();
        console.log(`[CRON] seed_food_embedding ok: updated=${res.updated}, duration=${ended - started}ms`);
      } catch (err) {
        console.error("[CRON] seed_food_embedding failed:", err);
      } finally {
        isFoodEmbeddingRunning = false;
      }
    },
    {
      scheduled: false,
      timezone: "Asia/Singapore",
    }
  );

  task.start();
  console.log(`[CRON] Scheduled seed_food_embedding with "${schedule}"`);
  return task;
}

/** HOUSEHOLD EMBEDDING CRON — run once a week, Sunday 4:00 AM */
function startHouseholdEmbeddingCron() {
  const schedule = process.env.HOUSEHOLD_EMBEDDING_CRON || "* * * * *"; // 4am Sunday

  const task = cron.schedule(
    schedule,
    async () => {
      if (isHouseholdEmbeddingRunning) {
        console.log("[CRON] seed_household_diet_embeddings skipped: already running");
        return;
      }
      isHouseholdEmbeddingRunning = true;
      const started = new Date();
      console.log(`[CRON] seed_household_diet_embeddings started at ${started.toISOString()}`);

      try {
        const res = await seed_household_diet_embeddings();
        const ended = new Date();
        console.log(`[CRON] seed_household_diet_embeddings ok: updated=${res.updated}, duration=${ended - started}ms`);
      } catch (err) {
        console.error("[CRON] seed_household_diet_embeddings failed:", err);
      } finally {
        isHouseholdEmbeddingRunning = false;
      }
    },
    {
      scheduled: false,
      timezone: "Asia/Singapore",
    }
  );

  task.start();
  console.log(`[CRON] Scheduled seed_household_diet_embeddings with "${schedule}"`);
  return task;
}

module.exports = {
  startInventoryCron,
  startFoodEmbeddingCron,
  startHouseholdEmbeddingCron,
};