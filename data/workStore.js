const db = require('../database');
const supabase = db.supabase;

// ── Public API (async) ──

async function getAll() {
  const { data, error } = await supabase
    .from('work')
    .select('*')
    .order('all_order', { ascending: true, nullsFirst: false })
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data || [];
}

async function getById(id) {
  const { data, error } = await supabase
    .from('work')
    .select('*')
    .eq('id', Number(id))
    .maybeSingle();
  if (error) throw error;
  return data;
}

async function create(input) {
  const row = {
    title: input.title || '',
    category: input.category || '',
    year: input.year || null,
    description: input.description || '',
    video_url: input.videoUrl || input.video_url || '',
    image_url: input.imageUrl || input.image_url || '',
    all_order: input.allOrder != null && input.allOrder !== '' ? Number(input.allOrder) : null,
    category_order: input.categoryOrder != null && input.categoryOrder !== '' ? Number(input.categoryOrder) : null,
  };
  const { data, error } = await supabase.from('work').insert(row).select();
  if (error) throw error;
  return data[0];
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

  const { data, error } = await supabase
    .from('work')
    .update(updates)
    .eq('id', Number(id))
    .select();
  if (error) throw error;
  if (!data || data.length === 0) return null;
  return data[0];
}

async function remove(id) {
  const { data, error } = await supabase
    .from('work')
    .delete()
    .eq('id', Number(id))
    .select();
  if (error) throw error;
  return data && data.length > 0;
}

module.exports = { getAll, getById, create, update, remove };
