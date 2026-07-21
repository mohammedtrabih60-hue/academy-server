# Academy — Server (Starting Point)

سيرفر جديد ونظيف، بيبلش بس بقسمين: **تسجيل الدخول (auth)** و**المستخدمين (users)**.
كل قسم جديد رح نضيفه بعدين كـ route منفصل بنفس الطريقة.

## البنية

```
academy-server/
├── server.js                 # نقطة الدخول
├── package.json
├── .env.example
├── src/
│   ├── config/firebase.js    # اتصال Firebase
│   ├── middleware/
│   │   ├── auth.js           # التحقق من JWT
│   │   └── role.js           # صلاحيات حسب الدور
│   ├── routes/
│   │   ├── auth.js           # register / login / me / refresh
│   │   └── users.js          # CRUD للمستخدمين
│   └── utils/helpers.js
├── uploads/
└── web/                       # هون رح يطلع تطبيق الفرونت اند بعدين
```

## التشغيل محلياً

```bash
npm install
cp .env.example .env
# عبّي .env بمفاتيحك (FIREBASE_SERVICE_ACCOUNT و JWT_SECRET)
npm run dev
```

يفتح على: `http://localhost:3000/health`

## رفعه على GitHub

```bash
cd academy-server
git init
git add -A
git commit -m "Initial commit — auth + users"
git branch -M main
git remote add origin <رابط الريبو تبعك>
git push -u origin main
```

⚠️ **مهم:** ملف `.env` مستثنى بـ `.gitignore` وما رح يترفع — هيك مفاتيحك بتضل سرية.
لما ترفع السيرفر على Railway/Render أو أي استضافة، ضيف متغيرات البيئة (`FIREBASE_SERVICE_ACCOUNT`, `JWT_SECRET`, ...) من لوحة التحكم تبعهم مباشرة.

## نقاط الوصول (Endpoints) الحالية

| Method | Path | الوصف |
|---|---|---|
| POST | `/api/auth/register` | تسجيل مستخدم جديد |
| POST | `/api/auth/login` | تسجيل دخول |
| GET | `/api/auth/me` | بيانات المستخدم الحالي (يحتاج توكن) |
| POST | `/api/auth/refresh` | تجديد التوكن |
| GET | `/api/users` | قائمة المستخدمين |
| GET | `/api/users/:id` | مستخدم واحد |
| POST | `/api/users` | إنشاء مستخدم (مدير/إدمن بس) |
| PATCH | `/api/users/:id` | تعديل مستخدم |
| DELETE | `/api/users/:id` | حذف مستخدم (مدير/إدمن بس) |
| GET | `/api/schools` | قائمة المؤسسات (جامعات/مدارس) |
| GET | `/api/schools/:id` | مؤسسة وحدة |
| POST | `/api/schools` | إضافة مؤسسة جديدة (הנהלה/إدمن بس) |
| PATCH | `/api/schools/:id` | تعديل مؤسسة |
| DELETE | `/api/schools/:id` | حذف مؤسسة (הנהלה/إدمن بس) |
| POST | `/api/registration-requests` | معلم بيسجل طالب — بيصير "بانتظار الموافقة" |
| GET | `/api/registration-requests` | قائمة الطلبات (مدير/إدمن بس) |
| PATCH | `/api/registration-requests/:id/approve` | الموافقة — بينشئ حساب الطالب فعلياً |
| PATCH | `/api/registration-requests/:id/reject` | الرفض |
| GET | `/api/classes` | قائمة الصفوف (بمدرسة المستخدم) |
| POST | `/api/classes` | إنشاء صف (مدير/إدمن) |
| PATCH | `/api/classes/:id` | تعديل اسم/صف/مربي |
| DELETE | `/api/classes/:id` | حذف صف |
| POST | `/api/classes/:id/assign-student` | إضافة طالب للصف (وينقله من صف تاني تلقائياً) |
| POST | `/api/classes/:id/remove-student` | إزالة طالب من الصف |
| POST | `/api/classes/:id/assign-teacher` | إضافة معلم للصف |
| POST | `/api/classes/:id/remove-teacher` | إزالة معلم من الصف |
| GET | `/api/schedule` | جدول الحصص (بمدرسة/صف) |
| POST | `/api/schedule` | إضافة حصة (مدير/معلم) |
| PATCH | `/api/schedule/:id` | تعديل حصة |
| DELETE | `/api/schedule/:id` | حذف حصة |
| GET | `/api/courses` | قائمة الكورسات |
| POST | `/api/courses` | إنشاء كورس (معلم/مدير) |
| PATCH | `/api/courses/:id` | تعديل كورس |
| POST | `/api/courses/:id/materials` | إضافة محتوى (فيديو/PDF/رابط) |
| DELETE | `/api/courses/:id` | حذف كورس |
| GET | `/api/assignments` | قائمة الواجبات |
| POST | `/api/assignments` | إنشاء واجب (معلم/مدير) |
| PATCH | `/api/assignments/:id` | تعديل واجب |
| DELETE | `/api/assignments/:id` | حذف واجب |
| POST | `/api/assignments/:id/submit` | تسليم الواجب (طالب) |
| POST | `/api/assignments/:id/grade` | تصحيح تسليم طالب |
| GET | `/api/grades` | العلامات (الطالب يشوف بس علاماته هو) |
| POST | `/api/grades` | إدخال علامة (معلم/مدير) |
| PATCH | `/api/grades/:id` | تعديل علامة |
| DELETE | `/api/grades/:id` | حذف علامة |
| GET | `/api/homeroom-requests` | פניות (الطالب يشوف بس تبعاته، المعلم يشوف الموجهة إله) |
| POST | `/api/homeroom-requests` | الطالب يبعت פנייה للمربي |
| PATCH | `/api/homeroom-requests/:id/reply` | المربي يرد |
| PATCH | `/api/homeroom-requests/:id/forward` | تحويل الطلب لمعلم تاني |
| GET | `/api/permission-requests` | أישורים (إعادة امتحان، نسيان كلمة سر، استئذان، غياب، تأخير) |
| POST | `/api/permission-requests` | الطالب يبعت طلب |
| PATCH | `/api/permission-requests/:id/accept` | قبول |
| PATCH | `/api/permission-requests/:id/reject` | رفض |
| GET | `/api/career-guidance` | طلبات التوجيه المهني |
| POST | `/api/career-guidance` | الطالب يبعت طلب |
| PATCH | `/api/career-guidance/:id/respond` | رد + تحديد موعد (اختياري) |

## Realtime — צ'אט כיתתי (Socket.io)

هاد مش REST — بيتصل عن طريق WebSocket على نفس السيرفر (نفس الـ JWT).

**الاتصال:** `io(rootUrl, { auth: { token }, transports: ['websocket'] })`

| Event (client → server) | الوصف |
|---|---|
| `join_class` (classId) | الانضمام لصف — بيرجع `chat_history` |
| `send_message` `{classId, text, type, fileUrl}` | إرسال رسالة |
| `toggle_chat` `{classId, isOpen}` | فتح/إغلاق الشات (معلم/مدير بس) |
| `delete_message` `{classId, messageId}` | حذف رسالة (معلم/مدير بس) |
| `pin_message` `{classId, messageId, pinned}` | تثبيت إعلان (معلم/مدير بس) |
| `mute_student` `{classId, studentId, muted}` | كتم طالب (معلم/مدير بس) |
| `block_student` `{classId, studentId, blocked}` | حظر طالب (معلم/مدير بس) |

| Event (server → client) | الوصف |
|---|---|
| `chat_history` | `{classId, messages[], settings}` عند الانضمام |
| `new_message` | رسالة جديدة |
| `chat_toggled` / `message_deleted` / `message_pinned` / `student_muted` / `student_blocked` | تحديثات حية |
| `chat_error` | `{message}` |

## الخطوة الجاية

بعد ما تتأكد إنه هاد الجزء شغال تمام، منضيف قسم قسم (schools, classes, grades...) بنفس الأسلوب.
