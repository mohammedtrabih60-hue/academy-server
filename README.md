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

## الخطوة الجاية

بعد ما تتأكد إنه هاد الجزء شغال تمام، منضيف قسم قسم (schools, classes, grades...) بنفس الأسلوب.
