require('dotenv').config();
const express   = require('express');
const cors      = require('cors');
const helmet    = require('helmet');
const rateLimit = require('express-rate-limit');
const { init }  = require('./src/config/firebase');

init();

const app = express();

app.use(helmet({ contentSecurityPolicy: false, crossOriginEmbedderPolicy: false }));
app.use(cors({ origin: '*', methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'], allowedHeaders: ['Content-Type', 'Authorization'] }));
app.options('*', cors());
app.use(express.json({ limit: '20mb' }));
app.use(express.urlencoded({ extended: true, limit: '20mb' }));
app.use('/api/', rateLimit({ windowMs: 60_000, max: 500, message: { success: false, code: 'rate_limited' } }));

// ── ROUTES ───────────────────────────────────────────────────────────────
// Note: the Flutter app's ApiService.baseUrl already includes "/api", and
// each call path (e.g. '/auth/login', '/students') is relative to that —
// so routes are mounted at /api/<resource> here to match exactly.
app.use('/api/auth',     require('./src/routes/auth'));
app.use('/api/schools',  require('./src/routes/schools'));
app.use('/api/teachers', require('./src/routes/teachers'));
app.use('/api/students', require('./src/routes/students'));
app.use('/api/parents',  require('./src/routes/parents'));
app.use('/api/classes',  require('./src/routes/classes'));

// ── HEALTH ───────────────────────────────────────────────────────────────
app.get('/health', (_, res) => res.json({
  status: 'ok',
  server: 'Tarabix Academy — stage 1 (auth + schools + teachers + students + parents + classes)',
  routes: ['auth', 'schools', 'teachers', 'students', 'parents', 'classes'],
  note: 'Most reads happen via direct Firestore listeners in the Flutter app — this server only handles login + writes.',
  time: new Date().toISOString(),
}));

app.get('*', (req, res) => {
  res.status(404).json({ success: false, code: 'not_found' });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log('\n🚀 Tarabix Academy Server — stage 1');
  console.log(`📡 http://localhost:${PORT}/health`);
  console.log('📦 auth, schools, teachers, students, parents, classes\n');
});
