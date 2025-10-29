// routes/household.js
const express = require("express");
const router = express.Router();
const { createAndJoinHousehold, joinByPin, leaveMyHousehold, getMyHousehold } = require("../db/household");

// very simple auth middleware: expects req.user.id, adapt to your JWT auth if needed
function requireAuth(req, res, next) {
  const uid = req.user?.id ?? req.user?.user_id;
  if (!Number.isInteger(Number(uid))) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  // normalize for downstream:
  req.user = { id: Number(uid), user_id: Number(uid) };
  next();
}

// GET /households/me  -> current household (if any)
router.get("/me", requireAuth, async (req, res) => {
  try {
    const data = await getMyHousehold(req.user.id);
    res.json({ data });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Failed to load household" });
  }
});

// POST /households      -> create new household and join
router.post("/", requireAuth, async (req, res) => {
  try {
    const { name } = req.body || {};
    if (!name) return res.status(400).json({ error: "Household name required" });
    const data = await createAndJoinHousehold(req.user.id, name);
    res.status(201).json({ data });
  } catch (e) {
    console.error(e);
    res.status(400).json({ error: e.message || "Failed to create household" });
  }
});

// POST /households/join -> join existing household by PIN
router.post("/join", requireAuth, async (req, res) => {
  try {
    const { pin } = req.body;
    if (!pin) return res.status(400).json({ error: "Household PIN required" });

    const data = await joinByPin(req.user.id, pin);
    res.json({ success: true, data, message: "Joined household successfully" });
  } catch (err) {
    console.error("Join household error:", err);
    res.status(400).json({ error: "Failed to join household" });
  }
});

// DELETE /households/me -> leave current household
router.delete("/me", requireAuth, async (req, res) => {
  try {
    await leaveMyHousehold(req.user.id);
    res.status(204).end();
  } catch (e) {
    console.error(e);
    res.status(400).json({ error: e.message || "Failed to leave household" });
  }
});

module.exports = router;
