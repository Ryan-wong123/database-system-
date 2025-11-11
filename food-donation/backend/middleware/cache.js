// middleware/cache.js
const { rGet, rSet } = require('../redis');

function cacheGet({ keyOf, ttl = 60 }) {
  return async (req, res, next) => {
    try {
      const key = typeof keyOf === 'function' ? keyOf(req) : keyOf;
      if (!key) return next();

      const hit = await rGet(key);
      if (hit) {
        res.set('X-Cache', 'HIT');
        return res.status(200).json(JSON.parse(hit));
      }
      const origJson = res.json.bind(res);
      res.json = async (payload) => {
        try { await rSet(key, JSON.stringify(payload), ttl); } catch {}
        res.set('X-Cache', 'MISS');
        return origJson(payload);
      };
      next();
    } catch { next(); }
  };
}

function invalidateKeys(...keys) {
  const { rDel } = require('../redis');
  return async (_req, _res, next) => {
    try { await Promise.all(keys.map((k) => rDel(k))); } catch {}
    next();
  };
}

module.exports = { cacheGet, invalidateKeys };
