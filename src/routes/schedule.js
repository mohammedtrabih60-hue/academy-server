const router = require('express').Router();
const auth = require('../middleware/auth');
const role = require('../middleware/role');
const { db } = require('../config/firebase');
const { uuid, now, ok, err, serverErr } = require('../utils/helpers');

// GET /api/schedule?classId=xxx — list lessons (scoped to caller's school)
router.get('/', auth, async (req, res) => {
  try {
    let q = db().collection('schedule');
    if (req.schoolId) q = q.where('schoolId', '==', req.schoolId);
    if (req.query.classId) q = q.where('classId', '==', req.query.classId);
    const snap = await q.get();
    ok(res, snap.docs.map(d => d.data()));
  } catch (e) { serverErr(res, e); }
});

// POST /api/schedule — create a lesson slot (director/admin/teacher)
// body: { classId, day, hour, subject, room, teacherId }
router.post('/', auth, role('director', 'admin', 'teacher'), async (req, res) => {
  try {
    const { classId, day, hour, subject, room, teacherId } = req.body;
    if (!classId || !day || !hour || !subject) {
      return err(res, 'missing_fields', 'classId, day, hour, subject required');
    }

    const id = uuid();
    const lesson = {
      id, classId, day, hour, subject,
      room: room || null,
      teacherId: teacherId || null,
      schoolId: req.schoolId || null,
      createdAt: now(),
      createdBy: req.userId,
    };
    await db().collection('schedule').doc(id).set(lesson);
    ok(res, lesson, 201);
  } catch (e) { serverErr(res, e); }
});

// PATCH /api/schedule/:id
router.patch('/:id', auth, role('director', 'admin', 'teacher'), async (req, res) => {
  try {
    const updates = {};
    for (const field of ['day', 'hour', 'subject', 'room', 'teacherId', 'classId']) {
      if (req.body[field] !== undefined) updates[field] = req.body[field];
    }
    await db().collection('schedule').doc(req.params.id).update(updates);
    ok(res, { id: req.params.id });
  } catch (e) { serverErr(res, e); }
});

// DELETE /api/schedule/:id
router.delete('/:id', auth, role('director', 'admin', 'teacher'), async (req, res) => {
  try {
    await db().collection('schedule').doc(req.params.id).delete();
    ok(res, { deleted: req.params.id });
  } catch (e) { serverErr(res, e); }
});

module.exports = router;
