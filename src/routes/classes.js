const router = require('express').Router();
const auth = require('../middleware/auth');
const { db } = require('../config/firebase');
const { uuid, now, ok, err, serverErr } = require('../utils/helpers');

// POST /classes — body: { name }
router.post('/', auth, async (req, res) => {
  try {
    const { name } = req.body;
    if (!name) return err(res, 'missing_fields', 'name required');

    const id = uuid();
    const schoolClass = {
      id,
      name: name.trim(),
      schoolId: req.schoolId || null,
      createdAt: now(),
      homeroomTeacherId: null,
      homeroomTeacherName: null,
      homeroomTeacherPhoto: null,
      homeroomTeacherPhone: null,
    };
    await db().collection('classes').doc(id).set(schoolClass);
    ok(res, schoolClass, 201);
  } catch (e) { serverErr(res, e); }
});

// DELETE /classes/:id
router.delete('/:id', auth, async (req, res) => {
  try {
    await db().collection('classes').doc(req.params.id).delete();
    ok(res, { deleted: req.params.id });
  } catch (e) { serverErr(res, e); }
});

// PATCH /classes/:id/homeroom — body: { teacherId, teacherName }
router.patch('/:id/homeroom', auth, async (req, res) => {
  try {
    const { teacherId, teacherName } = req.body;
    const d = db();

    let photo = null;
    let phone = null;
    if (teacherId) {
      const teacherDoc = await d.collection('teacher_accounts').doc(teacherId).get();
      if (teacherDoc.exists) {
        photo = teacherDoc.data().profileImageBase64 || null;
        phone = teacherDoc.data().phone || null;
      }
    }

    await d.collection('classes').doc(req.params.id).update({
      homeroomTeacherId: teacherId || null,
      homeroomTeacherName: teacherName || null,
      homeroomTeacherPhoto: photo,
      homeroomTeacherPhone: phone,
    });
    ok(res, { id: req.params.id });
  } catch (e) { serverErr(res, e); }
});

// POST /classes/improvement-request
// Stored as a Faniya-shaped doc (matches how the app's own
// improvement_requests_screen.dart filters the faniyot collection by subject).
// body: { subject, currentUnits, targetUnits, studentId, studentName, classId, schoolId }
router.post('/improvement-request', auth, async (req, res) => {
  try {
    const { subject, currentUnits, targetUnits, studentId, studentName, classId, schoolId } = req.body;
    if (!subject || !studentId) return err(res, 'missing_fields', 'subject, studentId required');

    const id = uuid();
    const nowIso = now();
    const faniya = {
      id,
      studentId,
      studentName: studentName || '',
      schoolId: schoolId || req.schoolId || null,
      classId: classId || null,
      subject: `בקשת שיפור יחידות - ${subject}`,
      status: 'open',
      messages: [{
        id: uuid(),
        senderId: studentId,
        senderName: studentName || '',
        isTeacher: false,
        text: `בקשה לשיפור יחידות ב${subject}: מ-${currentUnits} ל-${targetUnits} יחידות`,
        mediaType: 'none',
        sentAt: nowIso,
      }],
      createdAt: nowIso,
      updatedAt: nowIso,
      transferredToTeacherId: null,
      transferredToTeacherName: null,
    };
    await db().collection('faniyot').doc(id).set(faniya);
    ok(res, faniya, 201);
  } catch (e) { serverErr(res, e); }
});

module.exports = router;
