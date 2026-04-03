const express = require('express');
const router = express.Router();
const workStore = require('../data/workStore');
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
  try {
    const items = workStore.getAll();
    res.json(items);
  } catch (err) {
    console.error('Error fetching work:', err);
    res.status(500).json({ error: 'Failed to fetch work items.' });
  }
});

// POST /api/work/upload-thumbnail - Upload thumbnail image (admin only)
// Returns a base64 data URL so it works on Vercel (no persistent filesystem)
router.post('/upload-thumbnail', requireAdmin, (req, res) => {
  // Use memoryStorage for thumbnails — they're compressed client-side to ~100-300 KB
  const memUpload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB safety cap
    fileFilter: (_req, file, cb) => {
      if (file.mimetype && file.mimetype.startsWith('image/')) cb(null, true);
      else cb(new Error('Only image files are allowed.'));
    }
  });

  memUpload.single('thumbnail')(req, res, (err) => {
    if (err) {
      console.error('Thumbnail upload error:', err.message, err.code);
      const status = err.code === 'LIMIT_FILE_SIZE' ? 413 : 400;
      return res.status(status).json({ error: err.message || 'Upload failed.' });
    }
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded.' });
    }

    const mime = req.file.mimetype || 'image/jpeg';
    const base64 = req.file.buffer.toString('base64');
    const imageUrl = `data:${mime};base64,${base64}`;

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
      console.error('Video upload error:', err.message, err.code);
      const status = err.code === 'LIMIT_FILE_SIZE' ? 413 : 400;
      return res.status(status).json({ error: err.message || 'Video upload failed.' });
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
  const { title, category } = req.body;
  if (!title || !category) {
    return res.status(400).json({ error: 'Title and category are required.' });
  }
  try {
    const item = workStore.create(req.body);
    res.status(201).json({ message: 'Work item added successfully!', id: item.id });
  } catch (err) {
    console.error('Error inserting work:', err);
    res.status(500).json({ error: 'Failed to add work item.' });
  }
});

// PUT /api/work/:id - Update work item (admin only)
router.put('/:id', requireAdmin, (req, res) => {
  const { id } = req.params;
  try {
    const item = workStore.update(id, req.body);
    if (!item) return res.status(404).json({ error: 'Work item not found.' });
    res.json({ message: 'Work item updated successfully!' });
  } catch (err) {
    console.error('Error updating work:', err);
    res.status(500).json({ error: 'Failed to update work item.' });
  }
});

// DELETE /api/work/:id - Delete work item (admin only)
router.delete('/:id', requireAdmin, (req, res) => {
  const { id } = req.params;
  try {
    const removed = workStore.remove(id);
    if (!removed) return res.status(404).json({ error: 'Work item not found.' });
    res.json({ message: 'Work item deleted successfully!' });
  } catch (err) {
    console.error('Error deleting work:', err);
    res.status(500).json({ error: 'Failed to delete work item.' });
  }
});

module.exports = router;