// middleware/rateLimit.js
const { rIncrWithTTL } = require('../redis');

function rateLimit({ windowSec = 60, max = 60, keyFn } = {}) {
  return async (req, res, next) => {
    try {
      const key = keyFn
        ? keyFn(req)
        : (req.user?.user_id ? `rl:user:${req.user.user_id}` : `rl:ip:${req.ip}`);
      const count = await rIncrWithTTL(key, windowSec);
      res.set('X-RateLimit-Limit', String(max));
      res.set('X-RateLimit-Remaining', String(Math.max(max - count, 0)));
      if (count > max) return res.status(429).json({ error: 'Too Many Requests' });
      next();
    } catch (e) { next(e); }
  };
}

module.exports = { rateLimit };
