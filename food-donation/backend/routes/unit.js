const express = require('express');
const router = express.Router();
const pgPool = require('../db/index'); // ← Use shared pool!

router.get('/list', async (_req, res) => {
  try {
    const { rows } = await pgPool.query(
      'SELECT unit_id, unit FROM foodunit ORDER BY unit ASC'
    );
    
    console.log('Units loaded:', rows.length);
    
    res.json({ ok: true, items: rows, count: rows.length });
  } catch (err) {
    console.error('Error fetching units:', err);
    res.status(500).json({ ok: false, error: err.message });
  }
});

module.exports = router;