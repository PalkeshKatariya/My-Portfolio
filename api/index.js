const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const session = require('express-session');
const path = require('path');
const db = require('../database');
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

// Serve static files
app.use(express.static(path.join(__dirname, '..', 'public')));

// Routes
app.use('/api/contact', contactRoutes);
app.use('/api/work', workRoutes);
app.use('/api/auth', authRoutes);

// Serve the main portfolio page
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'portfolio (1).html'));
});

// Serve admin page
app.get('/admin', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'public', 'admin.html'));
});

app.get('/admin.html', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'public', 'admin.html'));
});

module.exports = app;
