require('dotenv').config();
// Wrap EVERYTHING in a try-catch so Vercel never gets an uncaught module error
let app;
try {
  const express = require('express');
  const path = require('path');
  app = express();

  const bootErrors = [];

  // ── Health endpoint FIRST (zero dependencies) ──
  app.get('/api/health', (_req, res) => {
    res.json({ ok: bootErrors.length === 0, bootErrors, ts: new Date().toISOString() });
  });

  // ── Middleware ──
  try { app.use(require('cors')()); } catch (e) { bootErrors.push('cors: ' + e.message); }
  try { const bp = require('body-parser'); app.use(bp.json({ limit: '10mb' })); app.use(bp.urlencoded({ extended: true, limit: '10mb' })); } catch (e) { bootErrors.push('body-parser: ' + e.message); }
  try {
    const session = require('express-session');
    app.use(session({ secret: process.env.SESSION_SECRET || 'your-secret-key', resave: false, saveUninitialized: true, cookie: { secure: false } }));
  } catch (e) { bootErrors.push('express-session: ' + e.message); }

  // ── Serve static files (for public assets, admin panel, etc) ──
  app.use(express.static(path.join(__dirname, '..', 'public')));

  // ── Routes ──
  try { app.use('/api/contact', require('../routes/contact')); } catch (e) { bootErrors.push('routes/contact: ' + e.message); }
  try { app.use('/api/work', require('../routes/work')); } catch (e) { bootErrors.push('routes/work: ' + e.message); }
  try { app.use('/api/auth', require('../routes/auth')); } catch (e) { bootErrors.push('routes/auth: ' + e.message); }

  // ── Serve HTML pages for root routes (important for Vercel) ──
  const indexPath = path.join(__dirname, '..', 'Index.html');
  const portfolioPath = path.join(__dirname, '..', 'portfolio.html');
  const adminPath = path.join(__dirname, '..', 'public', 'admin.html');

  app.get('/', (_req, res) => {
    res.sendFile(indexPath);
  });

  app.get('/Index.html', (_req, res) => {
    res.sendFile(indexPath);
  });

  app.get('/portfolio.html', (_req, res) => {
    res.sendFile(portfolioPath);
  });

  app.get('/admin', (_req, res) => {
    res.sendFile(adminPath);
  });

  app.get('/admin.html', (_req, res) => {
    res.sendFile(adminPath);
  });

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
