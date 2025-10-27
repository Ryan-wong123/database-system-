const jwt = require('jsonwebtoken');

function decodeToken(req, res, next) {
  const header = req.headers.authorization;
  console.log('Authorization header:', header);

  if (!header) return next();

  const [type, token] = header.split(' ');
  if (type !== 'Bearer' || !token) return next();

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    console.log("✅ JWT decoded OK:", decoded);
    req.user = decoded;
  } catch (err) {
    console.error("❌ JWT decode failed:", err.message);
  }


  next();
}

module.exports = { decodeToken };
