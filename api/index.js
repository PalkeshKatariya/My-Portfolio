const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');

const app = express();

// ── Diagnostics ────────────────────────────────────────────
const bootErrors = [];

// ── Health endpoint FIRST (before any middleware that could crash) ──
app.get('/api/health', (_req, res) => {
  res.json({
    ok: bootErrors.length === 0,
    bootErrors,
    timestamp: new Date().toISOString()
  });
});

// ── Middleware ──────────────────────────────────────────────
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Session middleware – tolerate it being missing
try {
  const session = require('express-session');
  app.use(session({
    secret: process.env.SESSION_SECRET || 'your-secret-key',
    resave: false,
    saveUninitialized: true,
    cookie: { secure: false }
  }));
} catch (err) {
  bootErrors.push({ module: 'express-session', message: err.message });
  console.error('express-session failed to load:', err.message);
}

// ── Routes ─────────────────────────────────────────────────
try {
  const contactRoutes = require('../routes/contact');
  app.use('/api/contact', contactRoutes);
} catch (err) {
  bootErrors.push({ module: 'routes/contact', message: err.message });
  console.error('routes/contact failed to load:', err.message);
}

try {
  const workRoutes = require('../routes/work');
  app.use('/api/work', workRoutes);
} catch (err) {
  bootErrors.push({ module: 'routes/work', message: err.message });
  console.error('routes/work failed to load:', err.message);
}

try {
  const authRoutes = require('../routes/auth');
  app.use('/api/auth', authRoutes);
} catch (err) {
  bootErrors.push({ module: 'routes/auth', message: err.message });
  console.error('routes/auth failed to load:', err.message);
}



// ── Global error handler ───────────────────────────────────
app.use((err, _req, res, _next) => {
  console.error('Unhandled Express error:', err);
  res.status(500).json({
    error: 'Internal server error',
    detail: err.message || String(err)
  });
});

module.exports = app;
