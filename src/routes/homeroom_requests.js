const router = require('express').Router();
const auth = require('../middleware/auth');
const role = require('../middleware/role');
const { db } = require('../config/firebase');
const { uuid, now, ok, err, serverErr } = require('../utils/helpers');

// GET /api/homeroom-requests — scoped:
//   student  -> only their own requests
//   teacher  -> requests addressed to them (as homeroom teacher)
//   director/admin -> all requests in the school
router.get('/', auth, async (req, res) => {
  try {
    let q = db().collection('homeroomRequests');
    if (req.schoolId) q = q.where('schoolId', '==', req.schoolId);

    if (req.role === 'student') {
      q = q.where('studentId', '==', req.userId);
    } else if (req.role === 'teacher') {
      q = q.where('teacherId', '==', req.userId);
    }

    const snap = await q.orderBy('createdAt', 'desc').get();
    ok(res, snap.docs.map(d => d.data()));
  } catch (e) { serverErr(res, e); }
});

// POST /api/homeroom-requests — student sends a פנייה to their homeroom teacher
// body: { teacherId, message }
router.post('/', auth, role('student'), async (req, res) => {
  try {
    const { teacherId, message } = req.body;
    if (!teacherId || !message) return err(res, 'missing_fields', 'teacherId, message required');

    const id = uuid();
    const request = {
      id,
      studentId: req.userId,
      teacherId,
      message: message.trim(),
      status: 'open', // 'open' | 'answered' | 'forwarded'
      reply: null,
      forwardedToTeacherId: null,
      schoolId: req.schoolId || null,
      createdAt: now(),
      updatedAt: now(),
    };
    await db().collection('homeroomRequests').doc(id).set(request);
    ok(res, request, 201);
  } catch (e) { serverErr(res, e); }
});

// PATCH /api/homeroom-requests/:id/reply — teacher replies
// body: { reply }
router.patch('/:id/reply', auth, role('teacher', 'director', 'admin'), async (req, res) => {
  try {
    const { reply } = req.body;
    if (!reply) return err(res, 'missing_fields', 'reply required');

    const ref = db().collection('homeroomRequests').doc(req.params.id);
    const doc = await ref.get();
    if (!doc.exists) return err(res, 'not_found', 'Request not found', 404);

    await ref.update({ reply, status: 'answered', updatedAt: now() });
    ok(res, { id: req.params.id });
  } catch (e) { serverErr(res, e); }
});

// PATCH /api/homeroom-requests/:id/forward — teacher forwards to another teacher
// body: { toTeacherId }
router.patch('/:id/forward', auth, role('teacher', 'director', 'admin'), async (req, res) => {
  try {
    const { toTeacherId } = req.body;
    if (!toTeacherId) return err(res, 'missing_fields', 'toTeacherId required');

    const ref = db().collection('homeroomRequests').doc(req.params.id);
    const doc = await ref.get();
    if (!doc.exists) return err(res, 'not_found', 'Request not found', 404);

    await ref.update({
      teacherId: toTeacherId,
      forwardedToTeacherId: toTeacherId,
      status: 'forwarded',
      updatedAt: now(),
    });
    ok(res, { id: req.params.id, toTeacherId });
  } catch (e) { serverErr(res, e); }
});

module.exports = router;
