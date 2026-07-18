const router = require('express').Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const auth = require('../middleware/auth');
const { db } = require('../config/firebase');
const { uuid, now, ok, err, serverErr } = require('../utils/helpers');

function signToken(user) {
  return jwt.sign(
    { userId: user.id, schoolId: user.schoolId || null, role: user.role, name: user.name, email: user.email },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '30d' }
  );
}

// POST /api/auth/register
router.post('/register', async (req, res) => {
  try {
    const { name, email, password, role, schoolId } = req.body;
    if (!name || !email || !password) {
      return err(res, 'missing_fields', 'name, email, password required');
    }

    const d = db();
    const emailLower = email.trim().toLowerCase();
    const existing = await d.collection('users').where('email', '==', emailLower).limit(1).get();
    if (!existing.empty) return err(res, 'email_taken', 'This email is already registered', 409);

    const id = uuid();
    const passwordHash = await bcrypt.hash(password, 10);
    const user = {
      id,
      name: name.trim(),
      email: emailLower,
      passwordHash,
      role: role || 'student',
      schoolId: schoolId || null,
      createdAt: now(),
    };
    await d.collection('users').doc(id).set(user);

    const { passwordHash: _omit, ...safeUser } = user;
    ok(res, { token: signToken(user), user: safeUser }, 201);
  } catch (e) { serverErr(res, e); }
});

// POST /api/auth/login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return err(res, 'missing_fields', 'email, password required');

    const d = db();
    const emailLower = email.trim().toLowerCase();
    const snap = await d.collection('users').where('email', '==', emailLower).limit(1).get();
    if (snap.empty) return err(res, 'invalid_credentials', 'Email or password is incorrect', 401);

    const user = snap.docs[0].data();
    const matches = await bcrypt.compare(password, user.passwordHash || '');
    if (!matches) return err(res, 'invalid_credentials', 'Email or password is incorrect', 401);

    const { passwordHash: _omit, ...safeUser } = user;
    ok(res, { token: signToken(user), user: safeUser });
  } catch (e) { serverErr(res, e); }
});

// GET /api/auth/me
router.get('/me', auth, async (req, res) => {
  try {
    const doc = await db().collection('users').doc(req.userId).get();
    if (!doc.exists) return err(res, 'not_found', 'User not found', 404);
    const { passwordHash: _omit, ...safeUser } = doc.data();
    ok(res, safeUser);
  } catch (e) { serverErr(res, e); }
});

// POST /api/auth/refresh
router.post('/refresh', auth, async (req, res) => {
  try {
    const doc = await db().collection('users').doc(req.userId).get();
    if (!doc.exists) return err(res, 'not_found', 'User not found', 404);
    const user = doc.data();
    ok(res, { token: signToken(user) });
  } catch (e) { serverErr(res, e); }
});

module.exports = router;
