const router = require('express').Router();
const auth = require('../middleware/auth');
const role = require('../middleware/role');
const { db } = require('../config/firebase');
const { uuid, now, ok, err, serverErr } = require('../utils/helpers');

// GET /api/grades?studentId=xxx&classId=xxx
// Students only ever see their own grades regardless of query params.
router.get('/', auth, async (req, res) => {
  try {
    let q = db().collection('grades');
    if (req.schoolId) q = q.where('schoolId', '==', req.schoolId);

    if (req.role === 'student') {
      q = q.where('studentId', '==', req.userId);
    } else if (req.query.studentId) {
      q = q.where('studentId', '==', req.query.studentId);
    }
    if (req.query.classId) q = q.where('classId', '==', req.query.classId);

    const snap = await q.orderBy('createdAt', 'desc').get();
    ok(res, snap.docs.map(d => d.data()));
  } catch (e) { serverErr(res, e); }
});

// POST /api/grades — teacher/director enters a grade
// body: { studentId, classId, subject, term, score, maxScore }
router.post('/', auth, role('teacher', 'director', 'admin'), async (req, res) => {
  try {
    const { studentId, classId, subject, term, score, maxScore } = req.body;
    if (!studentId || !classId || !subject || score === undefined) {
      return err(res, 'missing_fields', 'studentId, classId, subject, score required');
    }

    const id = uuid();
    const grade = {
      id, studentId, classId, subject,
      term: term || null,
      score,
      maxScore: maxScore ?? 100,
      schoolId: req.schoolId || null,
      enteredBy: req.userId,
      createdAt: now(),
    };
    await db().collection('grades').doc(id).set(grade);
    ok(res, grade, 201);
  } catch (e) { serverErr(res, e); }
});

// PATCH /api/grades/:id
router.patch('/:id', auth, role('teacher', 'director', 'admin'), async (req, res) => {
  try {
    const updates = {};
    for (const field of ['score', 'maxScore', 'subject', 'term']) {
      if (req.body[field] !== undefined) updates[field] = req.body[field];
    }
    await db().collection('grades').doc(req.params.id).update(updates);
    ok(res, { id: req.params.id });
  } catch (e) { serverErr(res, e); }
});

// DELETE /api/grades/:id
router.delete('/:id', auth, role('teacher', 'director', 'admin'), async (req, res) => {
  try {
    await db().collection('grades').doc(req.params.id).delete();
    ok(res, { deleted: req.params.id });
  } catch (e) { serverErr(res, e); }
});

module.exports = router;
