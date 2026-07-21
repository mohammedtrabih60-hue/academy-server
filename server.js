require('dotenv').config();
const express   = require('express');
const http      = require('http');
const cors      = require('cors');
const helmet    = require('helmet');
const rateLimit = require('express-rate-limit');
const path      = require('path');
const { init }  = require('./src/config/firebase');
const { initChatSocket } = require('./src/sockets/chat_socket');

init();

const app = express();

app.use(helmet({ contentSecurityPolicy: false, crossOriginEmbedderPolicy: false }));
app.use(cors({ origin: '*', methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'], allowedHeaders: ['Content-Type', 'Authorization'] }));
app.options('*', cors());
app.use(express.json({ limit: '20mb' }));
app.use(express.urlencoded({ extended: true, limit: '20mb' }));
app.use('/api/', rateLimit({ windowMs: 60_000, max: 500, message: { success: false, code: 'rate_limited' } }));

app.use(express.static(path.join(__dirname, 'web')));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// ── ROUTES ───────────────────────────────────────────────────────────────
// Starting point: auth + users only. Add more app.use(...) lines here as
// new sections get built (schools, classes, grades, etc.)
app.use('/api/auth',                 require('./src/routes/auth'));
app.use('/api/users',                require('./src/routes/users'));
app.use('/api/schools',              require('./src/routes/schools'));
app.use('/api/registration-requests', require('./src/routes/registration_requests'));
app.use('/api/classes',              require('./src/routes/classes'));
app.use('/api/schedule',             require('./src/routes/schedule'));
app.use('/api/courses',              require('./src/routes/courses'));
app.use('/api/assignments',          require('./src/routes/assignments'));
app.use('/api/grades',               require('./src/routes/grades'));
app.use('/api/homeroom-requests',    require('./src/routes/homeroom_requests'));
app.use('/api/permission-requests',  require('./src/routes/permission_requests'));
app.use('/api/career-guidance',      require('./src/routes/career_guidance'));

// ── HEALTH ───────────────────────────────────────────────────────────────
app.get('/health', (_, res) => res.json({
  status: 'ok',
  server: 'Academy — starting point',
  routes: ['auth', 'users', 'schools', 'registration-requests', 'classes', 'schedule', 'courses', 'assignments', 'grades', 'homeroom-requests', 'permission-requests', 'career-guidance'],
  realtime: ['class-chat'],
  time: new Date().toISOString(),
}));

app.get('*', (req, res) => {
  if (!req.path.startsWith('/api') && !req.path.startsWith('/health') && !req.path.startsWith('/uploads')) {
    res.sendFile(path.join(__dirname, 'web', 'index.html'), (e) => {
      if (e) res.status(404).send('Not found — web/index.html not created yet');
    });
  } else {
    res.status(404).json({ success: false, code: 'not_found' });
  }
});

const PORT = process.env.PORT || 3000;
const httpServer = http.createServer(app);
initChatSocket(httpServer);

httpServer.listen(PORT, () => {
  console.log('\n🚀 Academy Server — starting point (auth + users)');
  console.log(`📡 http://localhost:${PORT}/health`);
  console.log('💬 Realtime class chat ready over Socket.io\n');
});
