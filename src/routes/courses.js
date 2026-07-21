const router = require('express').Router();
const auth = require('../middleware/auth');
const role = require('../middleware/role');
const { db } = require('../config/firebase');
const { uuid, now, ok, err, serverErr } = require('../utils/helpers');

// GET /api/courses?classId=xxx — list courses (scoped to caller's school)
router.get('/', auth, async (req, res) => {
  try {
    let q = db().collection('courses');
    if (req.schoolId) q = q.where('schoolId', '==', req.schoolId);
    if (req.query.classId) q = q.where('classId', '==', req.query.classId);
    if (req.query.teacherId) q = q.where('teacherId', '==', req.query.teacherId);
    const snap = await q.orderBy('createdAt', 'desc').get();
    ok(res, snap.docs.map(d => d.data()));
  } catch (e) { serverErr(res, e); }
});

// GET /api/courses/:id
router.get('/:id', auth, async (req, res) => {
  try {
    const doc = await db().collection('courses').doc(req.params.id).get();
    if (!doc.exists) return err(res, 'not_found', 'Course not found', 404);
    ok(res, doc.data());
  } catch (e) { serverErr(res, e); }
});

// POST /api/courses — create a course (teacher/director/admin)
// body: { classId, title, description, materials: [{type, title, url}] }
router.post('/', auth, role('teacher', 'director', 'admin'), async (req, res) => {
  try {
    const { classId, title, description, materials } = req.body;
    if (!classId || !title) return err(res, 'missing_fields', 'classId, title required');

    const id = uuid();
    const course = {
      id, classId, title: title.trim(),
      description: description || '',
      materials: Array.isArray(materials) ? materials : [],
      teacherId: req.userId,
      schoolId: req.schoolId || null,
      createdAt: now(),
    };
    await db().collection('courses').doc(id).set(course);
    ok(res, course, 201);
  } catch (e) { serverErr(res, e); }
});

// PATCH /api/courses/:id — edit title/description, or add a material
router.patch('/:id', auth, role('teacher', 'director', 'admin'), async (req, res) => {
  try {
    const updates = {};
    if (req.body.title !== undefined) updates.title = req.body.title;
    if (req.body.description !== undefined) updates.description = req.body.description;
    if (req.body.materials !== undefined) updates.materials = req.body.materials;
    await db().collection('courses').doc(req.params.id).update(updates);
    ok(res, { id: req.params.id });
  } catch (e) { serverErr(res, e); }
});

// POST /api/courses/:id/materials — append one material item
// body: { type: 'video'|'pdf'|'image'|'link', title, url }
router.post('/:id/materials', auth, role('teacher', 'director', 'admin'), async (req, res) => {
  try {
    const { type, title, url } = req.body;
    if (!type || !url) return err(res, 'missing_fields', 'type, url required');

    const ref = db().collection('courses').doc(req.params.id);
    const doc = await ref.get();
    if (!doc.exists) return err(res, 'not_found', 'Course not found', 404);

    const materials = doc.data().materials || [];
    materials.push({ type, title: title || '', url, addedAt: now() });
    await ref.update({ materials });
    ok(res, { id: req.params.id, materials });
  } catch (e) { serverErr(res, e); }
});

// DELETE /api/courses/:id
router.delete('/:id', auth, role('teacher', 'director', 'admin'), async (req, res) => {
  try {
    await db().collection('courses').doc(req.params.id).delete();
    ok(res, { deleted: req.params.id });
  } catch (e) { serverErr(res, e); }
});

module.exports = router;
