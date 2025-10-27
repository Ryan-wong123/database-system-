// routes/household.js
const express = require("express");
const router = express.Router();
const { createAndJoinHousehold, joinByPin, leaveMyHousehold, getMyHousehold } = require("../db/household");

// very simple auth middleware: expects req.user.id, adapt to your JWT auth if needed
function requireAuth(req, res, next) {
  // If you already decode JWT elsewhere, reuse it.
  // Here, read from Authorization: Bearer <token> if you have a decoder.
  // For brevity, assume req.user is already set by a global middleware.
  if (!req.user?.id) return res.status(401).json({ error: "Unauthorized" });
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
    const { pin } = req.body || {};
    if (!pin) return res.status(400).json({ error: "PIN required" });
    const data = await joinByPin(req.user.id, pin.toUpperCase());
    res.status(200).json({ data });
  } catch (e) {
    console.error(e);
    res.status(400).json({ error: e.message || "Failed to join household" });
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
