const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');
const { db } = require('../config/firebase');
const { uuid, now } = require('../utils/helpers');

/**
 * Realtime class chat (צ'אט כיתתי).
 *
 * Data model:
 *   - Firestore collection `chatMessages`: one doc per message
 *     { id, classId, senderId, senderName, senderRole, text, type,
 *       fileUrl, createdAt, pinned, deleted }
 *   - Firestore collection `chatSettings`: one doc per class (doc id = classId)
 *     { classId, isOpen, mutedStudentIds: [], blockedStudentIds: [] }
 *
 * Auth: the client passes the same JWT used for REST calls in the socket
 * handshake (`auth: { token }`). We verify it the same way the REST
 * `auth` middleware does, so there's exactly one login/session system
 * for the whole app — no separate realtime-only auth.
 */
function initChatSocket(httpServer) {
  const io = new Server(httpServer, {
    cors: { origin: '*', methods: ['GET', 'POST'] },
  });

  io.use((socket, next) => {
    try {
      const token = socket.handshake.auth?.token;
      if (!token) return next(new Error('no_token'));
      const payload = jwt.verify(token, process.env.JWT_SECRET);
      socket.userId = payload.userId;
      socket.schoolId = payload.schoolId || null;
      socket.role = payload.role;
      socket.userName = payload.name;
      next();
    } catch (e) {
      next(new Error('invalid_token'));
    }
  });

  io.on('connection', (socket) => {
    let currentClassId = null;

    async function getSettings(classId) {
      const ref = db().collection('chatSettings').doc(classId);
      const doc = await ref.get();
      if (!doc.exists) {
        const defaults = { classId, isOpen: true, mutedStudentIds: [], blockedStudentIds: [] };
        await ref.set(defaults);
        return defaults;
      }
      return doc.data();
    }

    async function isClassMember(classId) {
      const classDoc = await db().collection('classes').doc(classId).get();
      if (!classDoc.exists) return false;
      const c = classDoc.data();
      if (socket.role === 'director' || socket.role === 'admin') return c.schoolId === socket.schoolId;
      if (socket.role === 'teacher') return (c.teacherIds || []).includes(socket.userId) || c.homeroomTeacherId === socket.userId;
      if (socket.role === 'student') return (c.studentIds || []).includes(socket.userId);
      return false;
    }

    function isTeacherLike() {
      return ['teacher', 'director', 'admin'].includes(socket.role);
    }

    // ── JOIN A CLASS CHAT ROOM ─────────────────────────────────────────
    socket.on('join_class', async (classId) => {
      try {
        if (!(await isClassMember(classId))) {
          return socket.emit('chat_error', { message: 'אין לך גישה לצ׳אט הכיתה הזו' });
        }

        const settings = await getSettings(classId);
        if (socket.role === 'student' && (settings.blockedStudentIds || []).includes(socket.userId)) {
          return socket.emit('chat_error', { message: 'הוסרת מהצ׳אט הזה' });
        }

        if (currentClassId) socket.leave(`class:${currentClassId}`);
        currentClassId = classId;
        socket.join(`class:${classId}`);

        const snap = await db()
          .collection('chatMessages')
          .where('classId', '==', classId)
          .orderBy('createdAt', 'desc')
          .limit(100)
          .get();
        const history = snap.docs.map(d => d.data()).reverse();

        socket.emit('chat_history', { classId, messages: history, settings });
      } catch (e) {
        socket.emit('chat_error', { message: 'שגיאת שרת' });
      }
    });

    // ── SEND A MESSAGE ─────────────────────────────────────────────────
    // payload: { classId, text, type: 'text'|'image'|'file'|'audio', fileUrl }
    socket.on('send_message', async (payload) => {
      try {
        const { classId, text, type, fileUrl } = payload || {};
        if (!classId || (!text && !fileUrl)) return;
        if (!(await isClassMember(classId))) return;

        const settings = await getSettings(classId);
        if (!settings.isOpen && !isTeacherLike()) {
          return socket.emit('chat_error', { message: 'הצ׳אט סגור כרגע' });
        }
        if (socket.role === 'student') {
          if ((settings.blockedStudentIds || []).includes(socket.userId)) {
            return socket.emit('chat_error', { message: 'הוסרת מהצ׳אט הזה' });
          }
          if ((settings.mutedStudentIds || []).includes(socket.userId)) {
            return socket.emit('chat_error', { message: 'אתה מושתק בצ׳אט הזה' });
          }
        }

        const id = uuid();
        const message = {
          id,
          classId,
          senderId: socket.userId,
          senderName: socket.userName || '',
          senderRole: socket.role,
          text: text || '',
          type: type || 'text',
          fileUrl: fileUrl || null,
          pinned: false,
          deleted: false,
          createdAt: now(),
        };
        await db().collection('chatMessages').doc(id).set(message);
        io.to(`class:${classId}`).emit('new_message', message);
      } catch (e) {
        socket.emit('chat_error', { message: 'שגיאת שרת' });
      }
    });

    // ── TEACHER MODERATION ───────────────────────────────────────────────
    socket.on('toggle_chat', async ({ classId, isOpen }) => {
      if (!isTeacherLike() || !(await isClassMember(classId))) return;
      await db().collection('chatSettings').doc(classId).set({ isOpen }, { merge: true });
      io.to(`class:${classId}`).emit('chat_toggled', { classId, isOpen });
    });

    socket.on('delete_message', async ({ classId, messageId }) => {
      if (!isTeacherLike() || !(await isClassMember(classId))) return;
      await db().collection('chatMessages').doc(messageId).update({ deleted: true, text: '', fileUrl: null });
      io.to(`class:${classId}`).emit('message_deleted', { messageId });
    });

    socket.on('pin_message', async ({ classId, messageId, pinned }) => {
      if (!isTeacherLike() || !(await isClassMember(classId))) return;
      await db().collection('chatMessages').doc(messageId).update({ pinned });
      io.to(`class:${classId}`).emit('message_pinned', { messageId, pinned });
    });

    socket.on('mute_student', async ({ classId, studentId, muted }) => {
      if (!isTeacherLike() || !(await isClassMember(classId))) return;
      const ref = db().collection('chatSettings').doc(classId);
      const settings = await getSettings(classId);
      let ids = settings.mutedStudentIds || [];
      ids = muted ? [...new Set([...ids, studentId])] : ids.filter(id => id !== studentId);
      await ref.set({ mutedStudentIds: ids }, { merge: true });
      io.to(`class:${classId}`).emit('student_muted', { studentId, muted });
    });

    socket.on('block_student', async ({ classId, studentId, blocked }) => {
      if (!isTeacherLike() || !(await isClassMember(classId))) return;
      const ref = db().collection('chatSettings').doc(classId);
      const settings = await getSettings(classId);
      let ids = settings.blockedStudentIds || [];
      ids = blocked ? [...new Set([...ids, studentId])] : ids.filter(id => id !== studentId);
      await ref.set({ blockedStudentIds: ids }, { merge: true });
      io.to(`class:${classId}`).emit('student_blocked', { studentId, blocked });
    });

    socket.on('disconnect', () => {
      if (currentClassId) socket.leave(`class:${currentClassId}`);
    });
  });

  return io;
}

module.exports = { initChatSocket };
