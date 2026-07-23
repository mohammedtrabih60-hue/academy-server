const router = require('express').Router();
const auth = require('../middleware/auth');
const { db } = require('../config/firebase');
const { uuid, now, ok, serverErr } = require('../utils/helpers');

// POST /parents — body is Parent.toJson()
router.post('/', auth, async (req, res) => {
  try {
    const body = { ...req.body };
    const id = body.id || uuid();
    if (body.email) body.email = String(body.email).trim().toLowerCase();

    const parent = {
      ...body,
      id,
      schoolId: body.schoolId || req.schoolId || null,
      studentIds: body.studentIds || [],
      createdAt: body.createdAt || now(),
    };
    await db().collection('parents').doc(id).set(parent);
    ok(res, parent, 201);
  } catch (e) { serverErr(res, e); }
});

// PATCH /parents/:id
router.patch('/:id', auth, async (req, res) => {
  try {
    const updates = { ...req.body };
    if (updates.email) updates.email = String(updates.email).trim().toLowerCase();
    delete updates.id;
    await db().collection('parents').doc(req.params.id).update(updates);
    ok(res, { id: req.params.id });
  } catch (e) { serverErr(res, e); }
});

// DELETE /parents/:id
router.delete('/:id', auth, async (req, res) => {
  try {
    await db().collection('parents').doc(req.params.id).delete();
    ok(res, { deleted: req.params.id });
  } catch (e) { serverErr(res, e); }
});

module.exports = router;
