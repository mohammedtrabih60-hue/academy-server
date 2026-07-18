const admin = require('firebase-admin');

let _db = null;

function init() {
  if (admin.apps.length) return;

  const raw = process.env.FIREBASE_SERVICE_ACCOUNT;
  if (!raw) {
    console.error('❌ FIREBASE_SERVICE_ACCOUNT env var is missing.');
    process.exit(1);
  }

  const serviceAccount = JSON.parse(raw);

  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });

  _db = admin.firestore();
  console.log('✅ Firebase initialized');
}

function db() {
  if (!_db) throw new Error('Firebase not initialized — call init() first');
  return _db;
}

module.exports = { init, db, admin };
