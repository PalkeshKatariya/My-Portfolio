const express = require('express');
const router = express.Router();
const workStore = require('../data/workStore');
const multer = require('multer');
const db = require('../database');
const { requireAdmin } = require('./authMiddleware');

const supabase = db.supabase;
const SUPABASE_URL = process.env.SUPABASE_URL || '';

// GET /api/work - Get all work items
router.get('/', async (req, res) => {
  try {
    const items = await workStore.getAll();
    res.json(items);
  } catch (err) {
    console.error('Error fetching work:', err);
    res.status(500).json({ error: 'Failed to fetch work items.' });
  }
});

// POST /api/work/upload-thumbnail - Upload thumbnail image (admin only)
router.post('/upload-thumbnail', requireAdmin, (req, res) => {
  const memUpload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 5 * 1024 * 1024 },
    fileFilter: (_req, file, cb) => {
      if (file.mimetype && file.mimetype.startsWith('image/')) cb(null, true);
      else cb(new Error('Only image files are allowed.'));
    }
  });

  memUpload.single('thumbnail')(req, res, async (err) => {
    if (err) {
      console.error('Thumbnail upload error:', err.message, err.code);
      const status = err.code === 'LIMIT_FILE_SIZE' ? 413 : 400;
      return res.status(status).json({ error: err.message || 'Upload failed.' });
    }
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded.' });
    }

    try {
      const ext = req.file.originalname.split('.').pop() || 'png';
      const fileName = `thumbs/thumb-${Date.now()}-${Math.round(Math.random() * 1e9)}.${ext}`;
      const { error: uploadError } = await supabase.storage
        .from('uploads')
        .upload(fileName, req.file.buffer, {
          contentType: req.file.mimetype || 'image/jpeg',
          upsert: false
        });
      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage.from('uploads').getPublicUrl(fileName);
      return res.status(201).json({
        message: 'Thumbnail uploaded successfully.',
        imageUrl: urlData.publicUrl
      });
    } catch (uploadErr) {
      console.error('Supabase Storage upload error:', uploadErr);
      return res.status(500).json({ error: 'Failed to upload thumbnail.' });
    }
  });
});

// POST /api/work/upload-video - Upload local video file (admin only)
router.post('/upload-video', requireAdmin, (req, res) => {
  const memVideoUpload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 100 * 1024 * 1024 }, // 100 MB
    fileFilter: (_req, file, cb) => {
      if (file.mimetype && file.mimetype.startsWith('video/')) cb(null, true);
      else cb(new Error('Only video files are allowed.'));
    }
  });

  memVideoUpload.single('video')(req, res, async (err) => {
    if (err) {
      console.error('Video upload error:', err.message, err.code);
      const status = err.code === 'LIMIT_FILE_SIZE' ? 413 : 400;
      return res.status(status).json({ error: err.message || 'Video upload failed.' });
    }
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded.' });
    }

    try {
      const ext = req.file.originalname.split('.').pop() || 'mp4';
      const fileName = `videos/video-${Date.now()}-${Math.round(Math.random() * 1e9)}.${ext}`;
      const { error: uploadError } = await supabase.storage
        .from('uploads')
        .upload(fileName, req.file.buffer, {
          contentType: req.file.mimetype || 'video/mp4',
          upsert: false
        });
      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage.from('uploads').getPublicUrl(fileName);
      return res.status(201).json({
        message: 'Video uploaded successfully.',
        videoUrl: urlData.publicUrl
      });
    } catch (uploadErr) {
      console.error('Supabase Storage video upload error:', uploadErr);
      return res.status(500).json({ error: 'Failed to upload video.' });
    }
  });
});

// POST /api/work - Add new work item (admin only)
router.post('/', requireAdmin, async (req, res) => {
  const { title, category } = req.body;
  if (!title || !category) {
    return res.status(400).json({ error: 'Title and category are required.' });
  }
  try {
    const item = await workStore.create(req.body);
    res.status(201).json({ message: 'Work item added successfully!', id: item.id });
  } catch (err) {
    console.error('Error inserting work:', err);
    res.status(500).json({ error: 'Failed to add work item.' });
  }
});

// PUT /api/work/:id - Update work item (admin only)
router.put('/:id', requireAdmin, async (req, res) => {
  const { id } = req.params;
  try {
    const item = await workStore.update(id, req.body);
    if (!item) return res.status(404).json({ error: 'Work item not found.' });
    res.json({ message: 'Work item updated successfully!' });
  } catch (err) {
    console.error('Error updating work:', err);
    res.status(500).json({ error: 'Failed to update work item.' });
  }
});

// DELETE /api/work/:id - Delete work item (admin only)
router.delete('/:id', requireAdmin, async (req, res) => {
  const { id } = req.params;
  try {
    const removed = await workStore.remove(id);
    if (!removed) return res.status(404).json({ error: 'Work item not found.' });
    res.json({ message: 'Work item deleted successfully!' });
  } catch (err) {
    console.error('Error deleting work:', err);
    res.status(500).json({ error: 'Failed to delete work item.' });
  }
});

module.exports = router;