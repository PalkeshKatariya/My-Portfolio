const fs = require('fs');
const path = require('path');

// Canonical source: data/work.json in the repo (deployed with the code).
// Locally this file is writable; on Vercel it's read-only but always present.
const REPO_FILE = path.join(__dirname, 'work.json');

// On Vercel we keep a writable copy in /tmp so admin edits work within a
// single function invocation (they won't survive a cold start, but reads
// always fall back to the deployed REPO_FILE).
const IS_VERCEL = !!process.env.VERCEL;
const TMP_FILE  = '/tmp/work.json';

function getFilePath() {
  if (!IS_VERCEL) return REPO_FILE;
  // Use /tmp copy if it exists (admin made changes this invocation)
  if (fs.existsSync(TMP_FILE)) return TMP_FILE;
  return REPO_FILE;
}

function readAll() {
  try {
    const raw = fs.readFileSync(getFilePath(), 'utf-8');
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

function writeAll(items) {
  const target = IS_VERCEL ? TMP_FILE : REPO_FILE;
  fs.writeFileSync(target, JSON.stringify(items, null, 2), 'utf-8');
}

function nextId(items) {
  if (items.length === 0) return 1;
  return Math.max(...items.map(i => i.id || 0)) + 1;
}

// ── Public API ──

function getAll() {
  const items = readAll();
  items.sort((a, b) => {
    const oa = a.all_order ?? 999999;
    const ob = b.all_order ?? 999999;
    return oa - ob;
  });
  return items;
}

function getById(id) {
  return readAll().find(i => i.id === Number(id)) || null;
}

function create(data) {
  const items = readAll();
  const item = {
    id: nextId(items),
    title: data.title || '',
    category: data.category || '',
    year: data.year || null,
    description: data.description || '',
    video_url: data.videoUrl || data.video_url || '',
    image_url: data.imageUrl || data.image_url || '',
    all_order: data.allOrder != null && data.allOrder !== '' ? Number(data.allOrder) : null,
    category_order: data.categoryOrder != null && data.categoryOrder !== '' ? Number(data.categoryOrder) : null,
    created_at: new Date().toISOString().replace('T', ' ').slice(0, 19)
  };
  items.push(item);
  writeAll(items);
  return item;
}

function update(id, data) {
  const items = readAll();
  const idx = items.findIndex(i => i.id === Number(id));
  if (idx === -1) return null;
  const item = items[idx];
  if (data.title !== undefined)         item.title          = data.title;
  if (data.category !== undefined)      item.category       = data.category;
  if (data.year !== undefined)          item.year           = data.year || null;
  if (data.description !== undefined)   item.description    = data.description;
  if (data.videoUrl !== undefined)      item.video_url      = data.videoUrl;
  if (data.video_url !== undefined)     item.video_url      = data.video_url;
  if (data.imageUrl !== undefined)      item.image_url      = data.imageUrl;
  if (data.image_url !== undefined)     item.image_url      = data.image_url;
  if (data.allOrder !== undefined)      item.all_order      = data.allOrder !== '' ? Number(data.allOrder) : null;
  if (data.categoryOrder !== undefined) item.category_order = data.categoryOrder !== '' ? Number(data.categoryOrder) : null;
  items[idx] = item;
  writeAll(items);
  return item;
}

function remove(id) {
  const items = readAll();
  const idx = items.findIndex(i => i.id === Number(id));
  if (idx === -1) return false;
  items.splice(idx, 1);
  writeAll(items);
  return true;
}

module.exports = { getAll, getById, create, update, remove };
