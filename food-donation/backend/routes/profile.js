// backend/routes/profile.js
const express = require("express");
const router = express.Router();
const { setSingleDietForUser, getSingleDietForUser } = require("../db/userdiet");

// normalize auth (uses req.user from your JWT decode middleware)
function requireAuth(req, res, next) {
  const uid = req.user?.id ?? req.user?.user_id;
  if (!Number.isInteger(Number(uid))) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  req.user = { id: Number(uid), user_id: Number(uid) };
  next();
}

router.get("/me", requireAuth, async (req, res) => {
  try {
    const diet = await getSingleDietForUser(req.user.id);
    res.json({ data: { preferences: { diet } } });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Failed to load profile" });
  }
});

router.put("/", requireAuth, async (req, res) => {
  try {
    const dietFlag = req.body?.preferences?.diet ?? null;
    const rows = await setSingleDietForUser(req.user.id, dietFlag);
    const diet = rows[0]?.diet_flags ?? null;
    res.json({ data: { preferences: { diet } } });
  } catch (e) {
    console.error(e);
    res.status(e.status || 500).json({ error: e.message || "Failed to save profile" });
  }
});

module.exports = router;
