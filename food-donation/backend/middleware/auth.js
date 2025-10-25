// backend/middleware/auth.js
const jwt = require('jsonwebtoken');

function decodeToken(req, res, next) {
  const header = req.headers.authorization;
  if (!header) return next();

  const [type, token] = header.split(' ');
  if (type !== 'Bearer' || !token) return next();

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
  } catch (err) {
    console.error('JWT decode failed:', err.message);
  }

  next();
}

module.exports = { decodeToken };
