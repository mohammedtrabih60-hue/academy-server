const router = require('express').Router();
const auth = require('../middleware/auth');
const role = require('../middleware/role');
const { db } = require('../config/firebase');
const { uuid, now, ok, err, serverErr } = require('../utils/helpers');

// GET /api/schools — list all institutions
router.get('/', auth, async (req, res) => {
  try {
    const snap = await db().collection('schools').orderBy('createdAt', 'desc').get();
    const data = snap.docs.map(d => d.data());
    ok(res, data);
  } catch (e) { serverErr(res, e); }
});

// GET /api/schools/:id
router.get('/:id', auth, async (req, res) => {
  try {
    const doc = await db().collection('schools').doc(req.params.id).get();
    if (!doc.exists) return err(res, 'not_found', 'Institution not found', 404);
    ok(res, doc.data());
  } catch (e) { serverErr(res, e); }
});

// POST /api/schools — add a new university/school (management/admin only)
// body: { institutionNumber, name, type: 'university' | 'school' }
router.post('/', auth, role('management', 'admin'), async (req, res) => {
  try {
    const { institutionNumber, name, type } = req.body;
    if (!institutionNumber || !name) {
      return err(res, 'missing_fields', 'institutionNumber, name required');
    }

    const d = db();
    const existing = await d.collection('schools')
      .where('institutionNumber', '==', institutionNumber)
      .limit(1).get();
    if (!existing.empty) return err(res, 'already_exists', 'This institution number is already registered', 409);

    const id = uuid();
    const school = {
      id,
      institutionNumber,
      name: name.trim(),
      type: type || 'school', // 'university' | 'school'
      createdAt: now(),
      createdBy: req.userId,
    };
    await d.collection('schools').doc(id).set(school);
    ok(res, school, 201);
  } catch (e) { serverErr(res, e); }
});

// PATCH /api/schools/:id
router.patch('/:id', auth, role('management', 'admin'), async (req, res) => {
  try {
    const updates = { ...req.body };
    delete updates.id;
    delete updates.institutionNumber;
    await db().collection('schools').doc(req.params.id).update(updates);
    ok(res, { id: req.params.id });
  } catch (e) { serverErr(res, e); }
});

// DELETE /api/schools/:id
router.delete('/:id', auth, role('management', 'admin'), async (req, res) => {
  try {
    await db().collection('schools').doc(req.params.id).delete();
    ok(res, { deleted: req.params.id });
  } catch (e) { serverErr(res, e); }
});

module.exports = router;
