const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const session = require('express-session');
const contactRoutes = require('../routes/contact');
const workRoutes = require('../routes/work');
const authRoutes = require('../routes/auth');

const app = express();

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(session({
  secret: process.env.SESSION_SECRET || 'your-secret-key',
  resave: false,
  saveUninitialized: true,
  cookie: { secure: false }
}));

// API Routes only
app.use('/api/contact', contactRoutes);
app.use('/api/work', workRoutes);
app.use('/api/auth', authRoutes);

module.exports = app;
