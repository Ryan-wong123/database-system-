// middleware/idempotency.js
const { rGet, rSet } = require('../redis');

function idempotency({ ttlSec = 24 * 3600 } = {}) {
  return async (req, res, next) => {
    try {
      const key = req.headers['idempotency-key'];
      if (!key) return next();

      const clientId = String(
        req.headers['x-user-id'] || req.user?.user_id || req.ip
      ).trim();

      const redisKey = `idem:req:${clientId}:${key}`;
      const seen = await rGet(redisKey);
      if (seen) {
        const cached = JSON.parse(seen);
        res.set('Idempotency-Replayed', '1');
        return res.status(cached.status || 200).json(cached.body);
      }

      const origStatus = res.status.bind(res);
      const origJson = res.json.bind(res);
      let statusCode = 200;
      res.status = (code) => { statusCode = code; return origStatus(code); };
      res.json = async (payload) => {
        try {
          await rSet(redisKey, JSON.stringify({ status: statusCode, body: payload }), ttlSec);
        } catch {}
        return origJson(payload);
      };

      next();
    } catch (e) { next(e); }
  };
}

module.exports = { idempotency };
