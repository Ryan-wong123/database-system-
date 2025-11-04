// db/household.js
const { pgPool } = require("./index");

// db/household.js
async function createAndJoinHousehold(userId, name) {
  const { rows } = await pgPool.query(
    "SELECT * FROM create_household_and_join($1, $2)",
    [userId, name]
  );
  return rows[0];
}

async function joinByPin(userId, pin) {
  const { rows } = await pgPool.query(
    `SELECT join_household_by_pin($1, $2) AS status`,
    [pin, userId]
  );
  return rows[0].status; // e.g. "Successfully joined household"
}

async function leaveMyHousehold(userId) {
  await pgPool.query("SELECT sp_leave_household($1)", [userId]);
}

async function getMyHousehold(userId) {
  const { rows } = await pgPool.query(`
    SELECT hm.householdmembers_id, hm.household_id, h.household_pin, h.name AS household_name
    FROM HouseholdMembers hm
    JOIN Households h ON h.household_id = hm.household_id
    WHERE hm.user_id = $1;
    `, [userId]);
  return rows[0] || null;
}

async function leaveMyHousehold(userId) {
  await pgPool.query("SELECT leave_household($1)", [userId]);
}


module.exports = { createAndJoinHousehold, joinByPin, leaveMyHousehold, getMyHousehold, leaveMyHousehold };
