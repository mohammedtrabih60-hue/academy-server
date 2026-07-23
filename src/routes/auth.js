const router = require('express').Router();
const jwt = require('jsonwebtoken');
const { db } = require('../config/firebase');
const { err } = require('../utils/helpers');

function sendLoginSuccess(res, role, fields = {}) {
  const token = jwt.sign(
    { userId: fields.userId || 'admin', schoolId: fields.schoolId || null, role },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '30d' }
  );
  res.json({ success: true, token, user: { role, ...fields } });
}

// POST /auth/login
// Mirrors the exact role-resolution order the Flutter app's client-side
// loginAuto() used to do locally: admin -> school director -> teacher
// account -> student -> parent. Now done server-side against Firestore.
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return err(res, 'missing_fields', 'email, password required');

    const emailLower = email.trim().toLowerCase();
    const d = db();

    // 1) Admin — email/password come from config/app, falling back to defaults
    const configDoc = await d.collection('config').doc('app').get();
    const cfg = configDoc.exists ? configDoc.data() : {};
    const adminEmail = (cfg.adminEmail || 'admin@school.edu').toLowerCase();
    const adminPassword = cfg.adminPassword || 'admin2024';

    if (emailLower === adminEmail) {
      if (password !== adminPassword) return err(res, 'wrong_password', 'Incorrect password', 401);
      return sendLoginSuccess(res, 'admin');
    }

    // 2) School director (primary teacher account embedded on the School doc)
    const schoolSnap = await d.collection('schools').where('teacherEmail', '==', emailLower).limit(1).get();
    if (!schoolSnap.empty) {
      const school = schoolSnap.docs[0].data();
      if (!school.isActive) return err(res, 'school_inactive', 'School is inactive', 403);
      if (school.teacherPassword !== password) return err(res, 'wrong_password', 'Incorrect password', 401);
      return sendLoginSuccess(res, 'director', {
        userId: school.id,
        name: school.teacherName || 'מנהל/ת',
        email: school.teacherEmail,
        password: school.teacherPassword,
        schoolId: school.id,
        schoolName: school.name,
        photoBase64: school.teacherPhotoBase64 || null,
      });
    }

    // 3) Extra teacher accounts
    const teacherSnap = await d.collection('teacher_accounts').where('email', '==', emailLower).limit(1).get();
    if (!teacherSnap.empty) {
      const acc = teacherSnap.docs[0].data();
      if (!acc.isActive) return err(res, 'rejected', 'Account disabled', 403);
      if (acc.password !== password) return err(res, 'wrong_password', 'Incorrect password', 401);

      const schoolDoc = await d.collection('schools').doc(acc.schoolId).get();
      const school = schoolDoc.exists ? schoolDoc.data() : null;
      if (!school || !school.isActive) return err(res, 'school_inactive', 'School is inactive', 403);

      return sendLoginSuccess(res, 'teacher', {
        userId: `teacher-${acc.id}`,
        name: acc.name,
        email: acc.email,
        password: acc.password,
        schoolId: acc.schoolId,
        schoolName: school.name,
        assignedClassIds: acc.allowedClassIds || [],
        photoBase64: acc.profileImageBase64 || null,
      });
    }

    // 4) Students
    const studentSnap = await d.collection('students').where('email', '==', emailLower).limit(1).get();
    if (!studentSnap.empty) {
      const st = studentSnap.docs[0].data();
      if (st.password !== password) return err(res, 'wrong_password', 'Incorrect password', 401);
      if (st.status === 'pending') return err(res, 'pending', 'Account pending approval', 403);
      if (st.status === 'rejected') return err(res, 'rejected', 'Account rejected', 403);

      return sendLoginSuccess(res, 'student', {
        userId: st.id,
        name: st.name,
        email: st.email,
        password: st.password,
        joinedAt: st.joinedAt,
        schoolId: st.schoolId,
        schoolName: st.schoolName,
        classId: st.classId || null,
        className: st.className || null,
        idNumber: st.idNumber || null,
        phone: st.phone || null,
        photoBase64: st.profileImageBase64 || null,
      });
    }

    // 5) Parents
    const parentSnap = await d.collection('parents').where('email', '==', emailLower).limit(1).get();
    if (!parentSnap.empty) {
      const p = parentSnap.docs[0].data();
      if (p.password !== password) return err(res, 'wrong_password', 'Incorrect password', 401);

      return sendLoginSuccess(res, 'parent', {
        userId: p.id,
        name: p.name,
        email: p.email,
        password: p.password,
        schoolId: p.schoolId,
        schoolName: p.schoolName,
        phone: p.phone || null,
        studentIds: p.studentIds || [],
      });
    }

    return err(res, 'not_found', 'User not found', 404);
  } catch (e) {
    console.error('❌ Login error:', e);
    return err(res, 'server_error', e.message, 500);
  }
});

module.exports = router;
