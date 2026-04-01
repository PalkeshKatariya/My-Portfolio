// Wrap EVERYTHING in a try-catch so Vercel never gets an uncaught module error
let app;
try {
  const express = require('express');
  app = express();

  const bootErrors = [];

  // ── Health endpoint FIRST (zero dependencies) ──
  app.get('/api/health', (_req, res) => {
    res.json({ ok: bootErrors.length === 0, bootErrors, ts: new Date().toISOString() });
  });

  // ── Middleware ──
  try { app.use(require('cors')()); } catch (e) { bootErrors.push('cors: ' + e.message); }
  try { const bp = require('body-parser'); app.use(bp.json()); app.use(bp.urlencoded({ extended: true })); } catch (e) { bootErrors.push('body-parser: ' + e.message); }
  try {
    const session = require('express-session');
    app.use(session({ secret: process.env.SESSION_SECRET || 'your-secret-key', resave: false, saveUninitialized: true, cookie: { secure: false } }));
  } catch (e) { bootErrors.push('express-session: ' + e.message); }

  // ── Routes ──
  try { app.use('/api/contact', require('../routes/contact')); } catch (e) { bootErrors.push('routes/contact: ' + e.message); }
  try { app.use('/api/work', require('../routes/work')); } catch (e) { bootErrors.push('routes/work: ' + e.message); }
  try { app.use('/api/auth', require('../routes/auth')); } catch (e) { bootErrors.push('routes/auth: ' + e.message); }

  // ── Global error handler ──
  app.use((err, _req, res, _next) => {
    console.error('Unhandled Express error:', err);
    res.status(500).json({ error: 'Internal server error', detail: err.message });
  });

} catch (fatalErr) {
  // If even Express fails to load, export a raw handler
  console.error('FATAL boot error:', fatalErr);
  app = (req, res) => {
    res.setHeader('Content-Type', 'application/json');
    res.statusCode = 500;
    res.end(JSON.stringify({ fatal: true, error: fatalErr.message, stack: fatalErr.stack }));
  };
}

module.exports = app;
