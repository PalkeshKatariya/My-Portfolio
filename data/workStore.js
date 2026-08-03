const fs = require('fs');
const path = require('path');
const db = require('../database');
const supabase = db.supabase;

const fallbackStoragePath = path.join(__dirname, '..', 'data', 'work-items.json');

function readFallbackRows() {
  try {
    const raw = fs.readFileSync(fallbackStoragePath, 'utf8').trim();
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (err) {
    if (err && err.code !== 'ENOENT') {
      console.warn('Unable to read fallback work storage:', err.message);
    }
    return [];
  }
}

function readSeedWorkRows() {
  try {
    const seedPath = path.join(__dirname, 'work.json');
    const raw = fs.readFileSync(seedPath, 'utf8').trim();
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (err) {
    console.warn('Unable to read seed work data:', err.message);
    return [];
  }
}

function getFallbackRows() {
  const rows = readFallbackRows();
  return rows.length > 0 ? rows : readSeedWorkRows();
}

function writeFallbackRows(rows) {
  fs.mkdirSync(path.dirname(fallbackStoragePath), { recursive: true });
  fs.writeFileSync(fallbackStoragePath, JSON.stringify(rows, null, 2));
}

function createFallbackId() {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

// ── Public API (async) ──

async function getAll() {
  if (!supabase) {
    return getFallbackRows().sort((a, b) => (Number(a.all_order ?? 999999) - Number(b.all_order ?? 999999)) || (Number(a.id || 0) - Number(b.id || 0)));
  }

  try {
    let result = await supabase
      .from('work')
      .select('*')
      .order('all_order', { ascending: true, nullsFirst: true });

    if (result.error) {
      console.warn('Work ordering by all_order failed, retrying with id:', result.error.message || result.error);
      result = await supabase.from('work').select('*').order('id', { ascending: true });
    }

    if (result.error) throw result.error;
    return result.data || [];
  } catch (err) {
    console.warn('Supabase work read failed, using fallback storage:', err.message || err);
    return getFallbackRows().sort((a, b) => (Number(a.all_order ?? 999999) - Number(b.all_order ?? 999999)) || (Number(a.id || 0) - Number(b.id || 0)));
  }
}

async function getById(id) {
  if (!supabase) {
    return getFallbackRows().find(item => String(item.id) === String(id)) || null;
  }

  try {
    const { data, error } = await supabase
      .from('work')
      .select('*')
      .eq('id', Number(id))
      .maybeSingle();
    if (error) throw error;
    return data;
  } catch (err) {
    console.warn('Supabase work read failed, using fallback storage:', err.message || err);
    return getFallbackRows().find(item => String(item.id) === String(id)) || null;
  }
}

async function create(input) {
  const row = {
    id: createFallbackId(),
    title: input.title || '',
    category: input.category || '',
    year: input.year || null,
    description: input.description || '',
    video_url: input.videoUrl || input.video_url || '',
    image_url: input.imageUrl || input.image_url || '',
    all_order: input.allOrder != null && input.allOrder !== '' ? Number(input.allOrder) : null,
    category_order: input.categoryOrder != null && input.categoryOrder !== '' ? Number(input.categoryOrder) : null,
  };

  if (!supabase) {
    const rows = readFallbackRows();
    rows.unshift(row);
    writeFallbackRows(rows);
    return row;
  }

  try {
    const { data, error } = await supabase.from('work').insert(row).select();
    if (error) throw error;
    return data[0];
  } catch (err) {
    console.warn('Supabase work insert failed, using fallback storage:', err.message || err);
    const rows = readFallbackRows();
    rows.unshift(row);
    writeFallbackRows(rows);
    return row;
  }
}

async function update(id, input) {
  const updates = {};
  if (input.title !== undefined)         updates.title          = input.title;
  if (input.category !== undefined)      updates.category       = input.category;
  if (input.year !== undefined)          updates.year           = input.year || null;
  if (input.description !== undefined)   updates.description    = input.description;
  if (input.videoUrl !== undefined)      updates.video_url      = input.videoUrl;
  if (input.video_url !== undefined)     updates.video_url      = input.video_url;
  if (input.imageUrl !== undefined)      updates.image_url      = input.imageUrl;
  if (input.image_url !== undefined)     updates.image_url      = input.image_url;
  if (input.allOrder !== undefined)      updates.all_order      = input.allOrder !== '' ? Number(input.allOrder) : null;
  if (input.categoryOrder !== undefined) updates.category_order = input.categoryOrder !== '' ? Number(input.categoryOrder) : null;

  if (!supabase) {
    const rows = readFallbackRows();
    const index = rows.findIndex(item => String(item.id) === String(id));
    if (index === -1) return null;
    rows[index] = { ...rows[index], ...updates };
    writeFallbackRows(rows);
    return rows[index];
  }

  try {
    const { data, error } = await supabase
      .from('work')
      .update(updates)
      .eq('id', Number(id))
      .select();
    if (error) throw error;
    if (!data || data.length === 0) return null;
    return data[0];
  } catch (err) {
    console.warn('Supabase work update failed, using fallback storage:', err.message || err);
    const rows = readFallbackRows();
    const index = rows.findIndex(item => String(item.id) === String(id));
    if (index === -1) return null;
    rows[index] = { ...rows[index], ...updates };
    writeFallbackRows(rows);
    return rows[index];
  }
}

async function remove(id) {
  if (!supabase) {
    const rows = readFallbackRows();
    const remaining = rows.filter(item => String(item.id) !== String(id));
    writeFallbackRows(remaining);
    return rows.length !== remaining.length;
  }

  try {
    const { data, error } = await supabase
      .from('work')
      .delete()
      .eq('id', Number(id))
      .select();
    if (error) throw error;
    return data && data.length > 0;
  } catch (err) {
    console.warn('Supabase work delete failed, using fallback storage:', err.message || err);
    const rows = readFallbackRows();
    const remaining = rows.filter(item => String(item.id) !== String(id));
    writeFallbackRows(remaining);
    return rows.length !== remaining.length;
  }
}

module.exports = { getAll, getById, create, update, remove };
