const express = require('express');
const router = express.Router();
const db = require('../database');
const multer = require('multer');

// Use memory storage for Vercel (read-only filesystem)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 8 * 1024 * 1024 }, // 8 MB
  fileFilter: (_req, file, cb) => {
    if (file.mimetype && file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed.'));
    }
  }
});

const uploadVideo = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024 }, // 50 MB (Vercel payload limit)
  fileFilter: (_req, file, cb) => {
    if (file.mimetype && file.mimetype.startsWith('video/')) {
      cb(null, true);
    } else {
      cb(new Error('Only video files are allowed.'));
    }
  }
});

// GET /api/work - Get all work items
router.get('/', (req, res) => {
  db.all('SELECT * FROM work ORDER BY COALESCE(all_order, 2147483647) ASC, created_at DESC', [], (err, rows) => {
    if (err) {
      console.error('Error fetching work:', err);
      return res.status(500).json({ error: 'Failed to fetch work items.' });
    }
    res.json(rows);
  });
});

// POST /api/work/upload-thumbnail - Upload thumbnail image (admin only)
router.post('/upload-thumbnail', (req, res) => {
  if (!req.session.admin) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  upload.single('thumbnail')(req, res, (err) => {
    if (err) {
      return res.status(400).json({ error: err.message || 'Upload failed.' });
    }
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded.' });
    }

    // In production, upload to a cloud storage service (e.g., Cloudinary, S3)
    // For now, return the file as a base64 data URL
    const base64 = req.file.buffer.toString('base64');
    const dataUrl = `data:${req.file.mimetype};base64,${base64}`;
    return res.status(201).json({
      message: 'Thumbnail uploaded successfully.',
      imageUrl: dataUrl
    });
  });
});

// POST /api/work/upload-video - Upload local video file (admin only)
router.post('/upload-video', (req, res) => {
  if (!req.session.admin) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  uploadVideo.single('video')(req, res, (err) => {
    if (err) {
      return res.status(400).json({ error: err.message || 'Video upload failed.' });
    }
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded.' });
    }

    // In production, upload to a cloud storage service (e.g., Cloudinary, S3)
    const base64 = req.file.buffer.toString('base64');
    const dataUrl = `data:${req.file.mimetype};base64,${base64}`;
    return res.status(201).json({
      message: 'Video uploaded successfully.',
      videoUrl: dataUrl
    });
  });
});

// POST /api/work - Add new work item (admin only)
router.post('/', (req, res) => {
  if (!req.session.admin) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const { title, category, year, description, videoUrl, imageUrl, allOrder, categoryOrder } = req.body;

  const parseOptionalOrder = (value) => {
    if (value === '' || value === null || value === undefined) return null;
    const parsed = Number.parseInt(value, 10);
    return Number.isFinite(parsed) ? parsed : null;
  };

  if (!title || !category) {
    return res.status(400).json({ error: 'Title and category are required.' });
  }

  const sql = 'INSERT INTO work (title, category, year, description, video_url, image_url, all_order, category_order) VALUES (?, ?, ?, ?, ?, ?, ?, ?)';
  const params = [
    title,
    category,
    year || null,
    description || '',
    videoUrl || '',
    imageUrl || '',
    parseOptionalOrder(allOrder),
    parseOptionalOrder(categoryOrder)
  ];

  db.run(sql, params, function(err) {
    if (err) {
      console.error('Error inserting work:', err);
      return res.status(500).json({ error: 'Failed to add work item.' });
    }
    res.status(201).json({ message: 'Work item added successfully!', id: this.lastID });
  });
});

// PUT /api/work/:id - Update work item (admin only)
router.put('/:id', (req, res) => {
  if (!req.session.admin) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const { id } = req.params;
  const { title, category, year, description, videoUrl, imageUrl, allOrder, categoryOrder } = req.body;

  const parseOptionalOrder = (value) => {
    if (value === '' || value === null || value === undefined) return null;
    const parsed = Number.parseInt(value, 10);
    return Number.isFinite(parsed) ? parsed : null;
  };

  const sql = 'UPDATE work SET title = ?, category = ?, year = ?, description = ?, video_url = ?, image_url = ?, all_order = ?, category_order = ? WHERE id = ?';
  const params = [
    title,
    category,
    year,
    description,
    videoUrl,
    imageUrl,
    parseOptionalOrder(allOrder),
    parseOptionalOrder(categoryOrder),
    id
  ];

  db.run(sql, params, function(err) {
    if (err) {
      console.error('Error updating work:', err);
      return res.status(500).json({ error: 'Failed to update work item.' });
    }
    if (this.changes === 0) {
      return res.status(404).json({ error: 'Work item not found.' });
    }
    res.json({ message: 'Work item updated successfully!' });
  });
});

// DELETE /api/work/:id - Delete work item (admin only)
router.delete('/:id', (req, res) => {
  if (!req.session.admin) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const { id } = req.params;

  db.run('DELETE FROM work WHERE id = ?', [id], function(err) {
    if (err) {
      console.error('Error deleting work:', err);
      return res.status(500).json({ error: 'Failed to delete work item.' });
    }
    if (this.changes === 0) {
      return res.status(404).json({ error: 'Work item not found.' });
    }
    res.json({ message: 'Work item deleted successfully!' });
  });
});

module.exports = router;