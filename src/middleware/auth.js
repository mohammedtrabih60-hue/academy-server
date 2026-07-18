const jwt = require('jsonwebtoken');
const { err } = require('../utils/helpers');

module.exports = function auth(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;

  if (!token) return err(res, 'no_token', 'Authorization token required', 401);

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    req.userId = payload.userId;
    req.schoolId = payload.schoolId || null;
    req.role = payload.role;
    req.user = payload;
    next();
  } catch (e) {
    return err(res, 'invalid_token', 'Invalid or expired token', 401);
  }
};
