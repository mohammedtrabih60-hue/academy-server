# Tarabix Academy — Server (Stage 1)

سيرفر جديد بالكامل، مبني ليطابق تطبيق الفلاتر الموجود عندك تماماً —
بدون أي تغيير على الفلاتر نفسه (بس هيك القواعد).

## معمارية مهمة لازم تفهمها

تطبيقك **هجين**:
- 🔵 القراءة (عرض البيانات) بتصير **مباشرة من Firestore** عن طريق Realtime Listeners بالفلاتر — مش من هاد السيرفر
- 🟢 تسجيل الدخول + عمليات الكتابة (إضافة/تعديل/حذف) بتمر عبر هاد السيرفر

يعني هاد السيرفر **مش** مسؤول عن كل شي — بس عن الجزء يلي بالـ `api_service.dart`.

## ⚠️ نقطة أمان مهمة لازم تعرفها

بما إنه تسجيل الدخول عندك بيمر عبر سيرفر مخصص (مش Firebase Auth)، مفيش
طريقة لقواعد أمان Firestore (`firestore.rules`) تتأكد "هاد فعلاً مدير
المدرسة X" — لأنه ما في جلسة Firebase Auth حقيقية عالفلاتر.

**الوضع الحالي:** القراءة مفتوحة لأي حد عنده رابط مشروع Firebase تبعك،
والكتابة مقفولة بالكامل من العميل (كل الكتابة بتمر عبر هاد السيرفر
باستخدام صلاحيات Admin SDK يلي بتتجاوز هاي القواعد أصلاً).

هاد مش مثالي أمنياً (أي حد عنده الـ API key يقدر يقرأ بياناتك)، بس هو
الخيار الوحيد المتاح بدون ما نغيّر بنية تسجيل الدخول بالفلاتر. لو حبيت
لاحقاً نرفع الأمان الحقيقي، الحل هو نخلي هاد السيرفر يولّد Firebase
Custom Token بعد تسجيل الدخول الناجح، والفلاتر يستخدمه مع
`FirebaseAuth.signInWithCustomToken()` — هيك تصير `request.auth` حقيقية
وتقدر تكتب قواعد دقيقة فعلاً. هاد تغيير أكبر، رح نأجله لآخر إذا بدك.

## التشغيل

```bash
npm install
cp .env.example .env
# عبّي .env بمفاتيحك
npm run dev
```

## رفع قواعد Firestore

```bash
firebase deploy --only firestore:rules
```//
(يحتاج Firebase CLI مسجل دخول بحسابك — `firebase login` أول مرة)

## الحالة الحالية (Stage 1 — الأساس)

| القسم | الحالة |
|---|---|
| Auth (تسجيل دخول بكل الأدوار الخمسة) | ✅ |
| Schools (مدارس) | ✅ |
| Teachers (معلمين إضافيين) | ✅ |
| Students (طلاب + قبول/رفض/تصفير كلمة سر) | ✅ |
| Parents (أولياء أمور) | ✅ |
| Classes (صفوف + تعيين مربي + طلب تحسين) | ✅ |

## Endpoints الحالية

| Method | Path | الوصف |
|---|---|---|
| POST | `/api/auth/login` | تسجيل دخول (يحدد الدور تلقائياً) |
| POST | `/api/schools` | إضافة مدرسة |
| PATCH | `/api/schools/:id` | تعديل مدرسة |
| DELETE | `/api/schools/:id` | حذف مدرسة |
| POST | `/api/schools/:id/toggle` | تفعيل/إيقاف مدرسة |
| POST | `/api/teachers` | إضافة معلم |
| PATCH | `/api/teachers/:id` | تعديل معلم |
| DELETE | `/api/teachers/:id` | حذف معلم |
| POST | `/api/students` | إضافة طالب |
| PATCH | `/api/students/:id` | تعديل طالب |
| DELETE | `/api/students/:id` | حذف طالب |
| POST | `/api/students/:id/approve` | قبول طالب |
| POST | `/api/students/:id/reject` | رفض طالب |
| POST | `/api/students/:id/reset-password` | تصفير كلمة سر طالب |
| POST | `/api/students/update-profile` | تحديث بروفايل (لأي دور — انتبه!) |
| POST | `/api/parents` | إضافة ولي أمر |
| PATCH | `/api/parents/:id` | تعديل ولي أمر |
| DELETE | `/api/parents/:id` | حذف ولي أمر |
| POST | `/api/classes` | إضافة صف |
| DELETE | `/api/classes/:id` | حذف صف |
| PATCH | `/api/classes/:id/homeroom` | تعيين مربي صف |
| POST | `/api/classes/improvement-request` | طلب تحسين يحيدات (تحصير كـ Faniya) |

## حساب الأدمن الافتراضي

`admin@school.edu` / `admin2024` (قابل للتغيير من `config/app` بـ Firestore)

## الباقي (المراحل الجاية)

رسائل، علامات، حضور، اختبارات، كورسات، واجبات، شهادات، دفعات، نقاط،
מسابقات، مليونير، פניות، إشعارات، جدول، أكواد دخول، AI chat/solve.
