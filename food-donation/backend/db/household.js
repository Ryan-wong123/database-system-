// db/household.js
const pgPool = require("./index");

async function createAndJoinHousehold(userId) {
  const { rows } = await pgPool.query(
    "SELECT * FROM create_household_and_join($1)", [userId]
  );
  return rows[0]; // { household_id, household_pin }
}

async function joinByPin(userId, pin) {
  const { rows } = await pgPool.query(
    "SELECT * FROM join_household_by_pin($1,$2)", [userId, pin]
  );
  return rows[0]; // { household_id }
}

async function leaveMyHousehold(userId) {
  await pgPool.query("SELECT leave_household($1)", [userId]);
}

async function getMyHousehold(userId) {
  const { rows } = await pgPool.query(`
    SELECT hm.householdmembers_id, hm.household_id, h.household_pin
    FROM HouseholdMembers hm
    JOIN Households h ON h.household_id = hm.household_id
    WHERE hm.user_id = $1
  `, [userId]);
  return rows[0] || null;
}

module.exports = { createAndJoinHousehold, joinByPin, leaveMyHousehold, getMyHousehold };
