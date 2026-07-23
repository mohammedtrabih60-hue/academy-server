const router = require('express').Router();
const auth = require('../middleware/auth');
const { db } = require('../config/firebase');
const { uuid, now, ok, err, serverErr } = require('../utils/helpers');

// POST /students — body is AppUser.toJson() (role: student) + createdByTeacher
router.post('/', auth, async (req, res) => {
  try {
    const body = { ...req.body };
    const id = body.id || uuid();
    if (body.email) body.email = String(body.email).trim().toLowerCase();

    const student = {
      ...body,
      id,
      role: 'student',
      status: body.status || 'approved',
      schoolId: body.schoolId || req.schoolId || null,
      joinedAt: body.joinedAt || now(),
    };
    await db().collection('students').doc(id).set(student);
    ok(res, student, 201);
  } catch (e) { serverErr(res, e); }
});

// PATCH /students/:id
router.patch('/:id', auth, async (req, res) => {
  try {
    const updates = { ...req.body };
    if (updates.email) updates.email = String(updates.email).trim().toLowerCase();
    delete updates.id;
    await db().collection('students').doc(req.params.id).update(updates);
    ok(res, { id: req.params.id });
  } catch (e) { serverErr(res, e); }
});

// DELETE /students/:id
router.delete('/:id', auth, async (req, res) => {
  try {
    await db().collection('students').doc(req.params.id).delete();
    ok(res, { deleted: req.params.id });
  } catch (e) { serverErr(res, e); }
});

// POST /students/:id/approve
router.post('/:id/approve', auth, async (req, res) => {
  try {
    await db().collection('students').doc(req.params.id).update({ status: 'approved' });
    ok(res, { id: req.params.id, status: 'approved' });
  } catch (e) { serverErr(res, e); }
});

// POST /students/:id/reject
router.post('/:id/reject', auth, async (req, res) => {
  try {
    await db().collection('students').doc(req.params.id).update({ status: 'rejected' });
    ok(res, { id: req.params.id, status: 'rejected' });
  } catch (e) { serverErr(res, e); }
});

// POST /students/:id/reset-password — body: { password }
router.post('/:id/reset-password', auth, async (req, res) => {
  try {
    const { password } = req.body;
    if (!password) return err(res, 'missing_fields', 'password required');
    await db().collection('students').doc(req.params.id).update({ password });
    ok(res, { id: req.params.id });
  } catch (e) { serverErr(res, e); }
});

// POST /students/update-profile — updates the CALLER's own profile.
// NOTE: the Flutter app calls this exact path for every role (student,
// teacher, director, parent), not just students — so this route resolves
// the correct collection/doc based on the caller's role from their JWT.
// body: { name?, phone?, profileImageBase64? }
router.post('/update-profile', auth, async (req, res) => {
  try {
    const updates = { ...req.body };
    const d = db();

    switch (req.role) {
      case 'student':
        await d.collection('students').doc(req.userId).update(updates);
        break;
      case 'parent':
        await d.collection('parents').doc(req.userId).update(updates);
        break;
      case 'director':
        // Director's profile lives on the School doc itself
        // (teacherName / teacherPhotoBase64 fields).
        {
          const schoolUpdates = {};
          if (updates.name !== undefined) schoolUpdates.teacherName = updates.name;
          if (updates.profileImageBase64 !== undefined) schoolUpdates.teacherPhotoBase64 = updates.profileImageBase64;
          if (Object.keys(schoolUpdates).length) {
            await d.collection('schools').doc(req.userId).update(schoolUpdates);
          }
        }
        break;
      case 'teacher':
        {
          const teacherId = req.userId.startsWith('teacher-') ? req.userId.slice('teacher-'.length) : req.userId;
          const teacherUpdates = {};
          if (updates.name !== undefined) teacherUpdates.name = updates.name;
          if (updates.phone !== undefined) teacherUpdates.phone = updates.phone;
          if (updates.profileImageBase64 !== undefined) teacherUpdates.profileImageBase64 = updates.profileImageBase64;
          if (Object.keys(teacherUpdates).length) {
            await d.collection('teacher_accounts').doc(teacherId).update(teacherUpdates);
          }
        }
        break;
      default:
        return err(res, 'unsupported_role', 'Profile updates are not supported for this role');
    }

    ok(res, { id: req.userId });
  } catch (e) { serverErr(res, e); }
});

module.exports = router;
