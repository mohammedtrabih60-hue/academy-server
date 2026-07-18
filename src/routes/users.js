const router = require('express').Router();
const bcrypt = require('bcryptjs');
const auth = require('../middleware/auth');
const role = require('../middleware/role');
const { db } = require('../config/firebase');
const { uuid, now, ok, err, serverErr } = require('../utils/helpers');

// GET /api/users?role=student
router.get('/', auth, async (req, res) => {
  try {
    let q = db().collection('users');
    if (req.schoolId) q = q.where('schoolId', '==', req.schoolId);
    if (req.query.role) q = q.where('role', '==', req.query.role);

    const snap = await q.get();
    const data = snap.docs.map(d => {
      const { passwordHash, ...safe } = d.data();
      return safe;
    });
    ok(res, data);
  } catch (e) { serverErr(res, e); }
});

// GET /api/users/:id
router.get('/:id', auth, async (req, res) => {
  try {
    const doc = await db().collection('users').doc(req.params.id).get();
    if (!doc.exists) return err(res, 'not_found', 'User not found', 404);
    const { passwordHash, ...safe } = doc.data();
    ok(res, safe);
  } catch (e) { serverErr(res, e); }
});

// POST /api/users  (admin/director creates a user directly, e.g. a teacher or student)
router.post('/', auth, role('director', 'admin'), async (req, res) => {
  try {
    const { name, email, password, role: userRole, schoolId } = req.body;
    if (!name || !email || !password) return err(res, 'missing_fields', 'name, email, password required');

    const d = db();
    const emailLower = email.trim().toLowerCase();
    const existing = await d.collection('users').where('email', '==', emailLower).limit(1).get();
    if (!existing.empty) return err(res, 'email_taken', 'This email is already registered', 409);

    const id = uuid();
    const passwordHash = await bcrypt.hash(password, 10);
    const user = {
      id, name: name.trim(), email: emailLower, passwordHash,
      role: userRole || 'student', schoolId: schoolId || req.schoolId || null,
      createdAt: now(), createdBy: req.userId,
    };
    await d.collection('users').doc(id).set(user);
    const { passwordHash: _omit, ...safe } = user;
    ok(res, safe, 201);
  } catch (e) { serverErr(res, e); }
});

// PATCH /api/users/:id
router.patch('/:id', auth, async (req, res) => {
  try {
    if (req.userId !== req.params.id && !['director', 'admin'].includes(req.role)) {
      return err(res, 'forbidden', 'You can only edit your own profile', 403);
    }
    const updates = { ...req.body };
    delete updates.passwordHash;
    delete updates.email;
    delete updates.id;

    if (updates.password) {
      updates.passwordHash = await bcrypt.hash(updates.password, 10);
      delete updates.password;
    }

    await db().collection('users').doc(req.params.id).update(updates);
    ok(res, { id: req.params.id });
  } catch (e) { serverErr(res, e); }
});

// DELETE /api/users/:id
router.delete('/:id', auth, role('director', 'admin'), async (req, res) => {
  try {
    await db().collection('users').doc(req.params.id).delete();
    ok(res, { deleted: req.params.id });
  } catch (e) { serverErr(res, e); }
});

module.exports = router;
