const { v4: uuidv4 } = require('uuid');

const uuid = () => uuidv4();
const now = () => new Date().toISOString();

// Most endpoints (matching ApiService's generic post/patch/del handling)
// respond with { success: true, data: ... }
const ok = (res, data, status = 200) =>
  res.status(status).json({ success: true, data });

// Errors respond with { success: false, code, message }
const err = (res, code, message, status = 400) =>
  res.status(status).json({ success: false, code, message });

const serverErr = (res, e) => {
  console.error('❌ Server error:', e);
  res.status(500).json({ success: false, code: 'server_error', message: e.message });
};

module.exports = { uuid, now, ok, err, serverErr };
