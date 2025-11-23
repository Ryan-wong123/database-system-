// backend/db/userdiet.js
const { pgPool } = require("./index");
const { getMyHousehold } = require("./household");

async function upsertDietFlag(dietFlag) {
  const { rows } = await pgPool.query(
    "SELECT * FROM diet_upsert($1)",
    [dietFlag.trim()]
  );
  return rows[0]; 
}

async function setSingleDietForUser(userId, dietFlagNullable) {
  try {
    const { rows } = await pgPool.query(
      "SELECT * FROM userdiet_set_single_for_user($1,$2)",
      [Number(userId), dietFlagNullable]
    );
    // returns an array (0 or 1 row) like your previous implementation
    return rows;
  } catch (err) {
    // Map the household-missing case to 404, to match your old behavior
    if (err?.code === "P0001" && /Join or create a household first\./i.test(err.message)) {
      const e = new Error("Join or create a household first.");
      e.status = 404;
      throw e;
    }
    throw err;
  }
}

async function getSingleDietForUser(userId) {
  const { rows } = await pgPool.query(
    "SELECT userdiet_get_single_for_user($1) AS diet_flags",
    [Number(userId)]
  );
  return rows[0]?.diet_flags ?? null;
}

module.exports = { setSingleDietForUser, getSingleDietForUser };
