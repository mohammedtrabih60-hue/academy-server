const router = require('express').Router();
const auth = require('../middleware/auth');
const { db } = require('../config/firebase');
const { uuid, now, ok, err, serverErr } = require('../utils/helpers');

// POST /schools — body is School.toJson() from the Flutter app
router.post('/', auth, async (req, res) => {
  try {
    const body = { ...req.body };
    const id = body.id || uuid();
    if (body.teacherEmail) body.teacherEmail = String(body.teacherEmail).trim().toLowerCase();

    const school = {
      ...body,
      id,
      isActive: body.isActive !== undefined ? body.isActive : true,
      createdAt: body.createdAt || now(),
    };
    await db().collection('schools').doc(id).set(school);
    ok(res, school, 201);
  } catch (e) { serverErr(res, e); }
});

// PATCH /schools/:id
router.patch('/:id', auth, async (req, res) => {
  try {
    const updates = { ...req.body };
    if (updates.teacherEmail) updates.teacherEmail = String(updates.teacherEmail).trim().toLowerCase();
    delete updates.id;
    await db().collection('schools').doc(req.params.id).update(updates);
    ok(res, { id: req.params.id });
  } catch (e) { serverErr(res, e); }
});

// DELETE /schools/:id
router.delete('/:id', auth, async (req, res) => {
  try {
    await db().collection('schools').doc(req.params.id).delete();
    ok(res, { deleted: req.params.id });
  } catch (e) { serverErr(res, e); }
});

// POST /schools/:id/toggle — flips isActive
router.post('/:id/toggle', auth, async (req, res) => {
  try {
    const ref = db().collection('schools').doc(req.params.id);
    const doc = await ref.get();
    if (!doc.exists) return err(res, 'not_found', 'School not found', 404);
    const newActive = !(doc.data().isActive !== false);
    await ref.update({ isActive: newActive });
    ok(res, { id: req.params.id, isActive: newActive });
  } catch (e) { serverErr(res, e); }
});

module.exports = router;
