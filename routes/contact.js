const express = require('express');
const router = express.Router();
const db = require('../database');

// POST /api/contact - Submit contact form
router.post('/', (req, res) => {
  const { name, email, phone, message, serviceType } = req.body;

  if (!name || !email || !message) {
    return res.status(400).json({ error: 'Name, email, and message are required.' });
  }

  const sql = 'INSERT INTO clients (name, email, phone, message, service_type) VALUES (?, ?, ?, ?, ?)';
  const params = [name, email, phone || '', message, serviceType || ''];

  db.run(sql, params, function(err) {
    if (err) {
      console.error('Error inserting client:', err);
      return res.status(500).json({ error: 'Failed to save inquiry.' });
    }
    res.status(201).json({ message: 'Inquiry submitted successfully!', id: this.lastID });
  });
});

// GET /api/contact - Get all inquiries (admin only)
router.get('/', (req, res) => {
  // In a real app, add authentication check here
  if (!req.session.admin) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  db.all('SELECT * FROM clients ORDER BY created_at DESC', [], (err, rows) => {
    if (err) {
      console.error('Error fetching clients:', err);
      return res.status(500).json({ error: 'Failed to fetch inquiries.' });
    }
    res.json(rows);
  });
});

// DELETE /api/contact/:id - Remove a saved inquiry (admin only)
router.delete('/:id', (req, res) => {
  if (!req.session.admin) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  const id = req.params.id;
  db.run('DELETE FROM clients WHERE id = ?', [id], function(err) {
    if (err) {
      console.error('Error deleting inquiry:', err);
      return res.status(500).json({ error: 'Failed to delete inquiry.' });
    }
    if (this.changes === 0) {
      return res.status(404).json({ error: 'Inquiry not found.' });
    }
    res.json({ message: 'Inquiry deleted.' });
  });
});

module.exports = router;