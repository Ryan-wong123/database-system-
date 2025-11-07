// backend/db/userdiet.js
const { pgPool } = require("./index");
const { getMyHousehold } = require("./household");

async function upsertDietFlag(dietFlag) {
  const sql = `
    INSERT INTO diet (diet_flags)
    VALUES ($1)
    ON CONFLICT (diet_flags)
    DO UPDATE SET diet_flags = EXCLUDED.diet_flags
    RETURNING diet_id, diet_flags
  `;
  const { rows } = await pgPool.query(sql, [dietFlag.trim()]);
  return rows[0];
}

async function setSingleDietForUser(userId, dietFlagNullable) {
  const hh = await getMyHousehold(userId);
  if (!hh?.householdmembers_id) {
    const err = new Error("Join or create a household first.");
    err.status = 404;
    throw err;
  }
  const hmId = hh.householdmembers_id;

  // replace any existing diets with exactly one (or none if cleared)
  await pgPool.query(`DELETE FROM userdiet WHERE householdmembers_id = $1`, [hmId]);

  if (dietFlagNullable && String(dietFlagNullable).trim()) {
    const { diet_id } = await upsertDietFlag(String(dietFlagNullable));
    await pgPool.query(
      `INSERT INTO userdiet (householdmembers_id, diet_id) VALUES ($1, $2)`,
      [hmId, diet_id]
    );
  }

  const { rows } = await pgPool.query(
    `SELECT d.diet_id, d.diet_flags
     FROM userdiet ud
     JOIN diet d ON d.diet_id = ud.diet_id
     WHERE ud.householdmembers_id = $1
     ORDER BY d.diet_flags`,
    [hmId]
  );
  return rows;
}

async function getSingleDietForUser(userId) {
  const hh = await getMyHousehold(userId);
  if (!hh?.householdmembers_id) return null;
  const hmId = hh.householdmembers_id;

  const { rows } = await pgPool.query(
    `SELECT d.diet_flags
     FROM userdiet ud
     JOIN diet d ON d.diet_id = ud.diet_id
     WHERE ud.householdmembers_id = $1
     ORDER BY d.diet_flags
     LIMIT 1`,
    [hmId]
  );
  return rows[0]?.diet_flags ?? null;
}

module.exports = { setSingleDietForUser, getSingleDietForUser };
