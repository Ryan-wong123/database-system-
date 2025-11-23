// lib/redis.js
const redis = require('redis');

let client;
async function getRedis() {
  if (client?.isOpen) return client;
  const url = process.env.REDIS_URL || 'redis://localhost:6379';
  client = redis.createClient({ url });
  client.on('error', (e) => console.error('Redis error:', e));
  if (!client.isOpen) await client.connect();
  return client;
}

// Small helpers
async function rGet(key) { const c = await getRedis(); return c.get(key); }
async function rSet(key, value, ttlSec) {
  const c = await getRedis();
  if (ttlSec) return c.set(key, value, { EX: ttlSec });
  return c.set(key, value);
}
async function rDel(key) { const c = await getRedis(); return c.del(key); }
async function rIncrWithTTL(key, ttlSec) {
  const c = await getRedis();
  const v = await c.incr(key);
  if (v === 1 && ttlSec) await c.expire(key, ttlSec);
  return v;
}
async function rExists(key) { const c = await getRedis(); return (await c.exists(key)) === 1; }

module.exports = { getRedis, rGet, rSet, rDel, rIncrWithTTL, rExists };
