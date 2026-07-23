const router = require('express').Router();
const auth = require('../middleware/auth');
const { db } = require('../config/firebase');
const { uuid, now, ok, serverErr } = require('../utils/helpers');

// POST /teachers — body is TeacherAccount.toJson()
router.post('/', auth, async (req, res) => {
  try {
    const body = { ...req.body };
    const id = body.id || uuid();
    if (body.email) body.email = String(body.email).trim().toLowerCase();

    const teacher = {
      ...body,
      id,
      schoolId: body.schoolId || req.schoolId || null,
      isActive: body.isActive !== undefined ? body.isActive : true,
      allowedClassIds: body.allowedClassIds || [],
      createdAt: body.createdAt || now(),
    };
    await db().collection('teacher_accounts').doc(id).set(teacher);
    ok(res, teacher, 201);
  } catch (e) { serverErr(res, e); }
});

// PATCH /teachers/:id
router.patch('/:id', auth, async (req, res) => {
  try {
    const updates = { ...req.body };
    if (updates.email) updates.email = String(updates.email).trim().toLowerCase();
    delete updates.id;
    await db().collection('teacher_accounts').doc(req.params.id).update(updates);
    ok(res, { id: req.params.id });
  } catch (e) { serverErr(res, e); }
});

// DELETE /teachers/:id
router.delete('/:id', auth, async (req, res) => {
  try {
    await db().collection('teacher_accounts').doc(req.params.id).delete();
    ok(res, { deleted: req.params.id });
  } catch (e) { serverErr(res, e); }
});

module.exports = router;
