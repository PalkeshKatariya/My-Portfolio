const express = require('express');
const router = express.Router();
const db = require('../database');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { requireAdmin } = require('./authMiddleware');

// On Vercel the filesystem is read-only except /tmp
const IS_VERCEL = !!process.env.VERCEL;
const UPLOAD_DIR = IS_VERCEL
  ? '/tmp/uploads'
  : path.join(__dirname, '..', 'public', 'uploads');
const VIDEO_DIR = path.join(UPLOAD_DIR, 'videos');

try {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
  fs.mkdirSync(VIDEO_DIR, { recursive: true });
} catch (e) {
  console.error('Could not create upload dirs:', e.message);
}

// Disk storage for thumbnails
const thumbStorage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, UPLOAD_DIR),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname) || '.png';
    cb(null, `thumb-${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`);
  }
});

const upload = multer({
  storage: thumbStorage,
  limits: { fileSize: 20 * 1024 * 1024 }, // 20 MB
  fileFilter: (_req, file, cb) => {
    if (file.mimetype && file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed.'));
    }
  }
});

// Disk storage for videos
const videoStorage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, VIDEO_DIR),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname) || '.mp4';
    cb(null, `video-${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`);
  }
});

const uploadVideo = multer({
  storage: videoStorage,
  limits: { fileSize: 1024 * 1024 * 1024 }, // 1 GB
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
router.post('/upload-thumbnail', requireAdmin, (req, res) => {
  upload.single('thumbnail')(req, res, (err) => {
    if (err) {
      return res.status(400).json({ error: err.message || 'Upload failed.' });
    }
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded.' });
    }

    const imageUrl = `/uploads/${req.file.filename}`;
    return res.status(201).json({
      message: 'Thumbnail uploaded successfully.',
      imageUrl
    });
  });
});

// POST /api/work/upload-video - Upload local video file (admin only)
router.post('/upload-video', requireAdmin, (req, res) => {
  uploadVideo.single('video')(req, res, (err) => {
    if (err) {
      return res.status(400).json({ error: err.message || 'Video upload failed.' });
    }
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded.' });
    }

    const videoUrl = `/uploads/videos/${req.file.filename}`;
    return res.status(201).json({
      message: 'Video uploaded successfully.',
      videoUrl
    });
  });
});

// POST /api/work - Add new work item (admin only)
router.post('/', requireAdmin, (req, res) => {
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
router.put('/:id', requireAdmin, (req, res) => {
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
router.delete('/:id', requireAdmin, (req, res) => {
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