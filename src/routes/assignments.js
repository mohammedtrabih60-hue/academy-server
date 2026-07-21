const router = require('express').Router();
const auth = require('../middleware/auth');
const role = require('../middleware/role');
const { db } = require('../config/firebase');
const { uuid, now, ok, err, serverErr } = require('../utils/helpers');

// GET /api/assignments?classId=xxx — list assignments (scoped)
router.get('/', auth, async (req, res) => {
  try {
    let q = db().collection('assignments');
    if (req.schoolId) q = q.where('schoolId', '==', req.schoolId);
    if (req.query.classId) q = q.where('classId', '==', req.query.classId);
    const snap = await q.orderBy('createdAt', 'desc').get();
    ok(res, snap.docs.map(d => d.data()));
  } catch (e) { serverErr(res, e); }
});

// GET /api/assignments/:id
router.get('/:id', auth, async (req, res) => {
  try {
    const doc = await db().collection('assignments').doc(req.params.id).get();
    if (!doc.exists) return err(res, 'not_found', 'Assignment not found', 404);
    ok(res, doc.data());
  } catch (e) { serverErr(res, e); }
});

// POST /api/assignments — teacher/director creates an assignment
// body: { classId, title, description, dueDate, attachmentUrl }
router.post('/', auth, role('teacher', 'director', 'admin'), async (req, res) => {
  try {
    const { classId, title, description, dueDate, attachmentUrl } = req.body;
    if (!classId || !title || !dueDate) return err(res, 'missing_fields', 'classId, title, dueDate required');

    const id = uuid();
    const assignment = {
      id, classId, title: title.trim(),
      description: description || '',
      dueDate,
      attachmentUrl: attachmentUrl || null,
      teacherId: req.userId,
      schoolId: req.schoolId || null,
      submissions: [], // [{ studentId, submittedAt, fileUrl, grade, gradedAt }]
      createdAt: now(),
    };
    await db().collection('assignments').doc(id).set(assignment);
    ok(res, assignment, 201);
  } catch (e) { serverErr(res, e); }
});

// PATCH /api/assignments/:id
router.patch('/:id', auth, role('teacher', 'director', 'admin'), async (req, res) => {
  try {
    const updates = {};
    for (const field of ['title', 'description', 'dueDate', 'attachmentUrl']) {
      if (req.body[field] !== undefined) updates[field] = req.body[field];
    }
    await db().collection('assignments').doc(req.params.id).update(updates);
    ok(res, { id: req.params.id });
  } catch (e) { serverErr(res, e); }
});

// DELETE /api/assignments/:id
router.delete('/:id', auth, role('teacher', 'director', 'admin'), async (req, res) => {
  try {
    await db().collection('assignments').doc(req.params.id).delete();
    ok(res, { deleted: req.params.id });
  } catch (e) { serverErr(res, e); }
});

// POST /api/assignments/:id/submit — student submits their work
// body: { fileUrl }
router.post('/:id/submit', auth, role('student'), async (req, res) => {
  try {
    const { fileUrl } = req.body;
    if (!fileUrl) return err(res, 'missing_fields', 'fileUrl required');

    const ref = db().collection('assignments').doc(req.params.id);
    const doc = await ref.get();
    if (!doc.exists) return err(res, 'not_found', 'Assignment not found', 404);

    const submissions = doc.data().submissions || [];
    const existingIndex = submissions.findIndex(s => s.studentId === req.userId);
    const submission = { studentId: req.userId, fileUrl, submittedAt: now(), grade: null, gradedAt: null };

    if (existingIndex >= 0) {
      submissions[existingIndex] = submission;
    } else {
      submissions.push(submission);
    }
    await ref.update({ submissions });
    ok(res, { id: req.params.id, submission });
  } catch (e) { serverErr(res, e); }
});

// POST /api/assignments/:id/grade — teacher grades one student's submission
// body: { studentId, grade }
router.post('/:id/grade', auth, role('teacher', 'director', 'admin'), async (req, res) => {
  try {
    const { studentId, grade } = req.body;
    if (!studentId || grade === undefined) return err(res, 'missing_fields', 'studentId, grade required');

    const ref = db().collection('assignments').doc(req.params.id);
    const doc = await ref.get();
    if (!doc.exists) return err(res, 'not_found', 'Assignment not found', 404);

    const submissions = doc.data().submissions || [];
    const index = submissions.findIndex(s => s.studentId === studentId);
    if (index < 0) return err(res, 'not_submitted', 'Student has not submitted yet', 404);

    submissions[index].grade = grade;
    submissions[index].gradedAt = now();
    await ref.update({ submissions });
    ok(res, { id: req.params.id, studentId, grade });
  } catch (e) { serverErr(res, e); }
});

module.exports = router;
