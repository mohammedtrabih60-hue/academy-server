const router = require('express').Router();
const auth = require('../middleware/auth');
const role = require('../middleware/role');
const { db } = require('../config/firebase');
const { uuid, now, ok, err, serverErr } = require('../utils/helpers');

// GET /api/career-guidance — scoped:
//   student  -> only their own
//   teacher/director/admin -> all in the school (they all may respond)
router.get('/', auth, async (req, res) => {
  try {
    let q = db().collection('careerGuidance');
    if (req.schoolId) q = q.where('schoolId', '==', req.schoolId);
    if (req.role === 'student') q = q.where('studentId', '==', req.userId);
    if (req.query.status) q = q.where('status', '==', req.query.status);

    const snap = await q.orderBy('createdAt', 'desc').get();
    ok(res, snap.docs.map(d => d.data()));
  } catch (e) { serverErr(res, e); }
});

// POST /api/career-guidance — student submits a request
// body: { message }
router.post('/', auth, role('student'), async (req, res) => {
  try {
    const { message } = req.body;
    if (!message) return err(res, 'missing_fields', 'message required');

    const id = uuid();
    const request = {
      id,
      studentId: req.userId,
      message: message.trim(),
      status: 'open', // 'open' | 'scheduled' | 'closed'
      reply: null,
      meetingDate: null,
      schoolId: req.schoolId || null,
      createdAt: now(),
      updatedAt: now(),
      respondedBy: null,
    };
    await db().collection('careerGuidance').doc(id).set(request);
    ok(res, request, 201);
  } catch (e) { serverErr(res, e); }
});

// PATCH /api/career-guidance/:id/respond — teacher/director replies, optionally schedules a meeting
// body: { reply, meetingDate }
router.patch('/:id/respond', auth, role('teacher', 'director', 'admin'), async (req, res) => {
  try {
    const { reply, meetingDate } = req.body;
    if (!reply) return err(res, 'missing_fields', 'reply required');

    const ref = db().collection('careerGuidance').doc(req.params.id);
    const doc = await ref.get();
    if (!doc.exists) return err(res, 'not_found', 'Request not found', 404);

    await ref.update({
      reply,
      meetingDate: meetingDate || null,
      status: meetingDate ? 'scheduled' : 'closed',
      updatedAt: now(),
      respondedBy: req.userId,
    });
    ok(res, { id: req.params.id });
  } catch (e) { serverErr(res, e); }
});

module.exports = router;
