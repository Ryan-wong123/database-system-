const express = require('express');
const router = express.Router();
const pgPool = require('../db/index'); // ← Use shared pool!

router.get('/list', async (_req, res) => {
  try {
    const { rows } = await pgPool.query(
      'SELECT diet_id, diet_flags FROM diet ORDER BY diet_flags ASC'
    );
    
    console.log('Diets loaded:', rows.length);
    
    res.json({ ok: true, items: rows, count: rows.length });
  } catch (err) {
    console.error('Error fetching diets:', err);
    res.status(500).json({ ok: false, error: err.message });
  }
});

module.exports = router;