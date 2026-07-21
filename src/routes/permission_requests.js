const router = require('express').Router();
const auth = require('../middleware/auth');
const role = require('../middleware/role');
const { db } = require('../config/firebase');
const { uuid, now, ok, err, serverErr } = require('../utils/helpers');

const VALID_TYPES = ['exam_retake', 'forgot_password', 'permission', 'absence', 'delay'];

// GET /api/permission-requests — scoped:
//   student  -> only their own
//   teacher  -> requests addressed to them
//   director/admin -> all in the school
router.get('/', auth, async (req, res) => {
  try {
    let q = db().collection('permissionRequests');
    if (req.schoolId) q = q.where('schoolId', '==', req.schoolId);

    if (req.role === 'student') {
      q = q.where('studentId', '==', req.userId);
    } else if (req.role === 'teacher') {
      q = q.where('teacherId', '==', req.userId);
    }
    if (req.query.status) q = q.where('status', '==', req.query.status);

    const snap = await q.orderBy('createdAt', 'desc').get();
    ok(res, snap.docs.map(d => d.data()));
  } catch (e) { serverErr(res, e); }
});

// POST /api/permission-requests — student submits a request
// body: { teacherId, type, note }
// type: 'exam_retake' | 'forgot_password' | 'permission' | 'absence' | 'delay'
router.post('/', auth, role('student'), async (req, res) => {
  try {
    const { teacherId, type, note } = req.body;
    if (!teacherId || !type) return err(res, 'missing_fields', 'teacherId, type required');
    if (!VALID_TYPES.includes(type)) return err(res, 'invalid_type', `type must be one of: ${VALID_TYPES.join(', ')}`);

    const id = uuid();
    const request = {
      id,
      studentId: req.userId,
      teacherId,
      type,
      note: note || '',
      status: 'pending', // 'pending' | 'accepted' | 'rejected'
      responseNote: null,
      schoolId: req.schoolId || null,
      createdAt: now(),
      decidedAt: null,
      decidedBy: null,
    };
    await db().collection('permissionRequests').doc(id).set(request);
    ok(res, request, 201);
  } catch (e) { serverErr(res, e); }
});

// PATCH /api/permission-requests/:id/accept — body: { responseNote }
router.patch('/:id/accept', auth, role('teacher', 'director', 'admin'), async (req, res) => {
  try {
    const ref = db().collection('permissionRequests').doc(req.params.id);
    const doc = await ref.get();
    if (!doc.exists) return err(res, 'not_found', 'Request not found', 404);

    await ref.update({
      status: 'accepted',
      responseNote: req.body.responseNote || null,
      decidedAt: now(),
      decidedBy: req.userId,
    });
    ok(res, { id: req.params.id });
  } catch (e) { serverErr(res, e); }
});

// PATCH /api/permission-requests/:id/reject — body: { responseNote }
router.patch('/:id/reject', auth, role('teacher', 'director', 'admin'), async (req, res) => {
  try {
    const ref = db().collection('permissionRequests').doc(req.params.id);
    const doc = await ref.get();
    if (!doc.exists) return err(res, 'not_found', 'Request not found', 404);

    await ref.update({
      status: 'rejected',
      responseNote: req.body.responseNote || null,
      decidedAt: now(),
      decidedBy: req.userId,
    });
    ok(res, { id: req.params.id });
  } catch (e) { serverErr(res, e); }
});

module.exports = router;
