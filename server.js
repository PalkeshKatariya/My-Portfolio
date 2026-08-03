require('dotenv').config();
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const session = require('express-session');
const path = require('path');
const apiApp = require('./api');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(bodyParser.json({ limit: '10mb' }));
app.use(bodyParser.urlencoded({ extended: true, limit: '10mb' }));
app.use(session({
  secret: process.env.SESSION_SECRET || 'your-secret-key',
  resave: false,
  saveUninitialized: true,
  cookie: { secure: false }
}));

// Attach the API app so /api/* works the same way locally and in Vercel
app.use(apiApp);

// Serve static files (for admin panel)
app.use(express.static(path.join(__dirname, 'public')));

// Serve the main portfolio page
const homepage = path.join(__dirname, 'Index.html');
const fallbackHomepage = path.join(__dirname, 'portfolio.html');

app.get('/', (req, res) => {
  res.sendFile(homepage);
});

app.get('/Index.html', (req, res) => {
  res.sendFile(homepage);
});

app.get('/portfolio.html', (req, res) => {
  res.sendFile(fallbackHomepage);
});

// Serve admin page specifically
app.get('/admin', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'admin.html'));
});

app.get('/admin.html', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'admin.html'));
});

// Start server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});