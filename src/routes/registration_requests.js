const router = require('express').Router();
const bcrypt = require('bcryptjs');
const auth = require('../middleware/auth');
const role = require('../middleware/role');
const { db } = require('../config/firebase');
const { uuid, now, ok, err, serverErr } = require('../utils/helpers');

// POST /api/registration-requests
// A teacher submits a student's info. Nothing is created in `users` yet —
// it just sits here as 'pending' until a director/admin decides.
// body: { name, email, password }
router.post('/', auth, role('teacher', 'director', 'admin'), async (req, res) => {
  try {
    const { name, email, password } = req.body;
    if (!name || !email || !password) {
      return err(res, 'missing_fields', 'name, email, password required');
    }

    const d = db();
    const emailLower = email.trim().toLowerCase();

    const existingUser = await d.collection('users').where('email', '==', emailLower).limit(1).get();
    if (!existingUser.empty) return err(res, 'email_taken', 'This email is already registered', 409);

    const existingPending = await d.collection('registrationRequests')
      .where('email', '==', emailLower).where('status', '==', 'pending').limit(1).get();
    if (!existingPending.empty) return err(res, 'request_pending', 'A request for this email is already pending', 409);

    const id = uuid();
    const passwordHash = await bcrypt.hash(password, 10);
    const request = {
      id,
      name: name.trim(),
      email: emailLower,
      passwordHash,
      role: 'student',
      schoolId: req.schoolId || null,
      status: 'pending', // 'pending' | 'approved' | 'rejected'
      submittedBy: req.userId,
      submittedByName: req.user?.name || null,
      createdAt: now(),
      decidedAt: null,
      decidedBy: null,
    };
    await d.collection('registrationRequests').doc(id).set(request);

    const { passwordHash: _omit, ...safe } = request;
    ok(res, safe, 201);
  } catch (e) { serverErr(res, e); }
});

// GET /api/registration-requests?status=pending
router.get('/', auth, role('director', 'admin'), async (req, res) => {
  try {
    let q = db().collection('registrationRequests');
    if (req.query.status) q = q.where('status', '==', req.query.status);
    const snap = await q.orderBy('createdAt', 'desc').get();
    const data = snap.docs.map(d => {
      const { passwordHash, ...safe } = d.data();
      return safe;
    });
    ok(res, data);
  } catch (e) { serverErr(res, e); }
});

// PATCH /api/registration-requests/:id/approve
// Creates the real user account from the stored (already-hashed) password
// and marks the request approved.
router.patch('/:id/approve', auth, role('director', 'admin'), async (req, res) => {
  try {
    const d = db();
    const reqDoc = await d.collection('registrationRequests').doc(req.params.id).get();
    if (!reqDoc.exists) return err(res, 'not_found', 'Request not found', 404);

    const request = reqDoc.data();
    if (request.status !== 'pending') return err(res, 'already_decided', 'This request was already decided', 409);

    const userId = uuid();
    const user = {
      id: userId,
      name: request.name,
      email: request.email,
      passwordHash: request.passwordHash,
      role: request.role,
      schoolId: request.schoolId,
      createdAt: now(),
      createdBy: req.userId,
      approvedFromRequest: request.id,
    };
    await d.collection('users').doc(userId).set(user);

    await reqDoc.ref.update({
      status: 'approved',
      decidedAt: now(),
      decidedBy: req.userId,
      createdUserId: userId,
    });

    ok(res, { requestId: request.id, userId });
  } catch (e) { serverErr(res, e); }
});

// PATCH /api/registration-requests/:id/reject
router.patch('/:id/reject', auth, role('director', 'admin'), async (req, res) => {
  try {
    const d = db();
    const reqDoc = await d.collection('registrationRequests').doc(req.params.id).get();
    if (!reqDoc.exists) return err(res, 'not_found', 'Request not found', 404);

    const request = reqDoc.data();
    if (request.status !== 'pending') return err(res, 'already_decided', 'This request was already decided', 409);

    await reqDoc.ref.update({
      status: 'rejected',
      decidedAt: now(),
      decidedBy: req.userId,
      rejectReason: req.body?.reason || null,
    });

    ok(res, { requestId: request.id });
  } catch (e) { serverErr(res, e); }
});

module.exports = router;
