const router = require('express').Router();
const auth = require('../middleware/auth');
const role = require('../middleware/role');
const { db } = require('../config/firebase');
const { uuid, now, ok, err, serverErr } = require('../utils/helpers');

// GET /api/classes — list classes in the caller's school
router.get('/', auth, async (req, res) => {
  try {
    let q = db().collection('classes');
    if (req.schoolId) q = q.where('schoolId', '==', req.schoolId);
    const snap = await q.orderBy('createdAt', 'desc').get();
    ok(res, snap.docs.map(d => d.data()));
  } catch (e) { serverErr(res, e); }
});

// GET /api/classes/:id
router.get('/:id', auth, async (req, res) => {
  try {
    const doc = await db().collection('classes').doc(req.params.id).get();
    if (!doc.exists) return err(res, 'not_found', 'Class not found', 404);
    ok(res, doc.data());
  } catch (e) { serverErr(res, e); }
});

// POST /api/classes — create a class (director/admin only)
// body: { name, grade }
router.post('/', auth, role('director', 'admin'), async (req, res) => {
  try {
    const { name, grade } = req.body;
    if (!name) return err(res, 'missing_fields', 'name required');

    const id = uuid();
    const classDoc = {
      id,
      name: name.trim(),
      grade: grade || null,
      schoolId: req.schoolId || null,
      homeroomTeacherId: null,
      studentIds: [],
      teacherIds: [],
      createdAt: now(),
      createdBy: req.userId,
    };
    await db().collection('classes').doc(id).set(classDoc);
    ok(res, classDoc, 201);
  } catch (e) { serverErr(res, e); }
});

// PATCH /api/classes/:id — rename / change grade / set homeroom teacher
router.patch('/:id', auth, role('director', 'admin'), async (req, res) => {
  try {
    const updates = {};
    if (req.body.name !== undefined) updates.name = req.body.name;
    if (req.body.grade !== undefined) updates.grade = req.body.grade;
    if (req.body.homeroomTeacherId !== undefined) updates.homeroomTeacherId = req.body.homeroomTeacherId;
    await db().collection('classes').doc(req.params.id).update(updates);
    ok(res, { id: req.params.id });
  } catch (e) { serverErr(res, e); }
});

// DELETE /api/classes/:id
router.delete('/:id', auth, role('director', 'admin'), async (req, res) => {
  try {
    await db().collection('classes').doc(req.params.id).delete();
    ok(res, { deleted: req.params.id });
  } catch (e) { serverErr(res, e); }
});

// POST /api/classes/:id/assign-student — body: { studentId }
// Also removes the student from any other class in the same school first,
// so a student only ever belongs to one class at a time.
router.post('/:id/assign-student', auth, role('director', 'admin'), async (req, res) => {
  try {
    const { studentId } = req.body;
    if (!studentId) return err(res, 'missing_fields', 'studentId required');

    const d = db();
    const targetRef = d.collection('classes').doc(req.params.id);
    const targetDoc = await targetRef.get();
    if (!targetDoc.exists) return err(res, 'not_found', 'Class not found', 404);

    let q = d.collection('classes').where('studentIds', 'array-contains', studentId);
    if (req.schoolId) q = q.where('schoolId', '==', req.schoolId);
    const others = await q.get();
    for (const doc of others.docs) {
      if (doc.id !== req.params.id) {
        const ids = (doc.data().studentIds || []).filter(sid => sid !== studentId);
        await doc.ref.update({ studentIds: ids });
      }
    }

    const currentIds = targetDoc.data().studentIds || [];
    if (!currentIds.includes(studentId)) currentIds.push(studentId);
    await targetRef.update({ studentIds: currentIds });

    ok(res, { classId: req.params.id, studentId });
  } catch (e) { serverErr(res, e); }
});

// POST /api/classes/:id/remove-student — body: { studentId }
router.post('/:id/remove-student', auth, role('director', 'admin'), async (req, res) => {
  try {
    const { studentId } = req.body;
    if (!studentId) return err(res, 'missing_fields', 'studentId required');

    const ref = db().collection('classes').doc(req.params.id);
    const doc = await ref.get();
    if (!doc.exists) return err(res, 'not_found', 'Class not found', 404);

    const ids = (doc.data().studentIds || []).filter(sid => sid !== studentId);
    await ref.update({ studentIds: ids });
    ok(res, { classId: req.params.id, studentId });
  } catch (e) { serverErr(res, e); }
});

// POST /api/classes/:id/assign-teacher — body: { teacherId }
router.post('/:id/assign-teacher', auth, role('director', 'admin'), async (req, res) => {
  try {
    const { teacherId } = req.body;
    if (!teacherId) return err(res, 'missing_fields', 'teacherId required');

    const ref = db().collection('classes').doc(req.params.id);
    const doc = await ref.get();
    if (!doc.exists) return err(res, 'not_found', 'Class not found', 404);

    const ids = doc.data().teacherIds || [];
    if (!ids.includes(teacherId)) ids.push(teacherId);
    await ref.update({ teacherIds: ids });
    ok(res, { classId: req.params.id, teacherId });
  } catch (e) { serverErr(res, e); }
});

// POST /api/classes/:id/remove-teacher — body: { teacherId }
router.post('/:id/remove-teacher', auth, role('director', 'admin'), async (req, res) => {
  try {
    const { teacherId } = req.body;
    if (!teacherId) return err(res, 'missing_fields', 'teacherId required');

    const ref = db().collection('classes').doc(req.params.id);
    const doc = await ref.get();
    if (!doc.exists) return err(res, 'not_found', 'Class not found', 404);

    const ids = (doc.data().teacherIds || []).filter(tid => tid !== teacherId);
    await ref.update({ teacherIds: ids });
    ok(res, { classId: req.params.id, teacherId });
  } catch (e) { serverErr(res, e); }
});

module.exports = router;
