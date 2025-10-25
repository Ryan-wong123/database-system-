function decodeToken(req, res, next) {
  const header = req.headers.authorization;
  console.log('Authorization header:', header);

  if (!header) return next();

  const [type, token] = header.split(' ');
  if (type !== 'Bearer' || !token) return next();

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    console.log('Decoded JWT:', req.user);
  } catch (err) {
    console.error('JWT decode failed:', err.message);
  }

  next();
}