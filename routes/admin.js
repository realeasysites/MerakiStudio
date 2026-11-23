'use strict';
const path = require('path');
const express = require('express');
const db = require('../lib/db');
const auth = require('../lib/auth');
const { clean } = require('../lib/validate');

const router = express.Router();
const ADMIN_DIR = path.join(__dirname, '..', 'admin');

const STATUSES = ['new', 'contacted', 'booked', 'closed'];
const TABLES = { bookings: 'bookings', applications: 'applications' };

// Login attempts limiter
const attempts = new Map();
function loginLimiter(req, res, next) {
  const now = Date.now();
  const list = (attempts.get(req.ip) || []).filter((t) => now - t < 15 * 60 * 1000);
  if (list.length >= 10) return res.status(429).json({ error: 'Too many attempts. Try again in a few minutes.' });
  list.push(now);
  attempts.set(req.ip, list);
  next();
}

router.get('/', (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('X-Robots-Tag', 'noindex');
  res.sendFile(path.join(ADMIN_DIR, auth.isAuthed(req) ? 'dashboard.html' : 'login.html'));
});

router.get('/assets/:file', (req, res) => {
  const allowed = ['admin.css', 'dashboard.js', 'login.js'];
  if (!allowed.includes(req.params.file)) return res.status(404).end();
  res.sendFile(path.join(ADMIN_DIR, req.params.file));
});

router.post('/login', loginLimiter, (req, res) => {
  if (!auth.passwordConfigured()) {
    return res.status(503).json({ error: 'Admin login is not set up yet. Set ADMIN_PASSWORD on the server.' });
  }
  if (!auth.checkPassword((req.body || {}).password)) {
    return res.status(401).json({ error: 'Wrong password.' });
  }
  auth.setSession(res, req);
  res.json({ ok: true });
});

router.post('/logout', (req, res) => {
  auth.clearSession(res);
  res.json({ ok: true });
});

router.use('/api', auth.requireAuth);

router.get('/api/summary', (req, res) => {
  const count = (t, s) => db.prepare(`SELECT COUNT(*) n FROM ${t}${s ? ' WHERE status = ?' : ''}`).get(...(s ? [s] : [])).n;
  res.json({
    bookings: { total: count('bookings'), new: count('bookings', 'new') },
    applications: { total: count('applications'), new: count('applications', 'new') }
  });
});

router.get('/api/:type', (req, res) => {
  const table = TABLES[req.params.type];
  if (!table) return res.status(404).json({ error: 'Unknown type' });
  const rows = db.prepare(`SELECT * FROM ${table} ORDER BY datetime(created_at) DESC, id DESC`).all();
  res.json(rows);
});

router.patch('/api/:type/:id', (req, res) => {
  const table = TABLES[req.params.type];
  if (!table) return res.status(404).json({ error: 'Unknown type' });
  const id = Number(req.params.id);
  const body = req.body || {};
  const row = db.prepare(`SELECT id FROM ${table} WHERE id = ?`).get(id);
  if (!row) return res.status(404).json({ error: 'Not found' });
  if (body.status !== undefined) {
    if (!STATUSES.includes(body.status)) return res.status(400).json({ error: 'Bad status' });
    db.prepare(`UPDATE ${table} SET status = ? WHERE id = ?`).run(body.status, id);
  }
  if (body.admin_note !== undefined) {
    db.prepare(`UPDATE ${table} SET admin_note = ? WHERE id = ?`).run(clean(body.admin_note, 2000), id);
  }
  res.json({ ok: true });
});

router.delete('/api/:type/:id', (req, res) => {
  const table = TABLES[req.params.type];
  if (!table) return res.status(404).json({ error: 'Unknown type' });
  const info = db.prepare(`DELETE FROM ${table} WHERE id = ?`).run(Number(req.params.id));
  if (!info.changes) return res.status(404).json({ error: 'Not found' });
  res.json({ ok: true });
});

module.exports = router;
