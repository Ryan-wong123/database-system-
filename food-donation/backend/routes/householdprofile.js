const express = require('express');
const router = express.Router();
const { Int32 } = require('bson');

const HouseholdProfile = require('../db/mongo_schema/household_profile');
const { getMyHousehold } = require('../db/household');

// require auth (same shape you use in /households routes)
function requireAuth(req, res, next) {
  const uid = req.user?.id ?? req.user?.user_id;
  if (!Number.isInteger(Number(uid))) return res.status(401).json({ error: 'Unauthorized' });
  req.user = { id: Number(uid), user_id: Number(uid) };
  next();
}

/**
 * GET /households/profile/me
 * Loads the profile bound to the caller's current SQL household (if any)
 */
router.get('/me', requireAuth, async (req, res) => {
  try {
    const sqlHH = await getMyHousehold(req.user.id); // { household_id, household_pin, household_name, ... }
    if (!sqlHH?.household_id) return res.json({ data: null });

    const doc = await HouseholdProfile.findOne({ household_id: sqlHH.household_id }).lean();
    res.json({ data: doc || null });
  } catch (e) {
    console.error('GET /households/profile/me error', e);
    res.status(500).json({ error: 'Failed to load household profile' });
  }
});

/**
 * PUT /households/profile
 * Upsert profile for the caller's current SQL household
 * Body: { preferences: { diet, avoids[], notes }, address, allergies_notes }
 */
router.put('/', requireAuth, async (req, res) => {
  try {
    const hh = await getMyHousehold(req.user.id);
    if (!hh?.household_id) {
      return res.status(400).json({ error: 'You are not in a household.' });
    }

    const body = req.body || {};
    const p = body.preferences || {};
    const avoids = Array.isArray(p.avoids) ? p.avoids.map(s => String(s).trim()).filter(Boolean) : [];

    // strict placeholder embedding (>= 8 doubles; set to 1536 if your model is 1536-dim)
    const DIM = 8;
    const embedding = Array.from({ length: DIM }, () => 0.0);

    // force BSON int32 where validator expects "int"
    const hhId = new Int32(Number(hh.household_id));
    const uId  = new Int32(Number(req.user.id));

    const setDoc = {
      user_id: uId,
      preferences: { diet: p.diet ?? null, avoids, notes: p.notes ?? null },
      address: body.address ?? null,
      allergies_notes: body.allergies_notes ?? null,
      embedding,                  // required by validator
      updated_at: new Date(),     // required by validator
    };

    const result = await HouseholdProfile.collection.findOneAndUpdate(
      { household_id: hhId },                                  // int32 in filter
      { $set: setDoc, $setOnInsert: { household_id: hhId } },  // int32 on insert
      { upsert: true, returnDocument: 'after' }
    );

    return res.json({ data: result.value });
  } catch (err) {
    console.error('PUT /households/profile validation error:',
      JSON.stringify(err?.errInfo || err?.errorResponse?.errInfo || err, null, 2)
    );
    return res.status(500).json({
      error: 'Failed to save household profile',
      message: err?.message,
      code: err?.code,
      codeName: err?.codeName,
      details: err?.errInfo || err?.errorResponse?.errInfo || null
    });
  }
});

module.exports = router;