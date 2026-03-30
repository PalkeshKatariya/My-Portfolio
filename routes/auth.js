const express = require('express');
const bcrypt = require('bcryptjs');
const router = express.Router();
const db = require('../database');

// POST /api/auth/login - Admin login
router.post('/login', (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password are required.' });
  }

  db.get('SELECT * FROM admins WHERE username = ?', [username], (err, admin) => {
    if (err) {
      console.error('Error fetching admin:', err);
      return res.status(500).json({ error: 'Login failed.' });
    }

    if (!admin) {
      return res.status(401).json({ error: 'Invalid credentials.' });
    }

    bcrypt.compare(password, admin.password_hash, (err, isMatch) => {
      if (err) {
        console.error('Error comparing password:', err);
        return res.status(500).json({ error: 'Login failed.' });
      }

      if (isMatch) {
        req.session.admin = true;
        req.session.adminId = admin.id;
        res.json({ message: 'Login successful!' });
      } else {
        res.status(401).json({ error: 'Invalid credentials.' });
      }
    });
  });
});

// POST /api/auth/logout - Admin logout
router.post('/logout', (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      console.error('Error destroying session:', err);
      return res.status(500).json({ error: 'Logout failed.' });
    }
    res.json({ message: 'Logout successful!' });
  });
});

// GET /api/auth/status - Check login status
router.get('/status', (req, res) => {
  if (req.session.admin) {
    res.json({ loggedIn: true });
  } else {
    res.json({ loggedIn: false });
  }
});

module.exports = router;