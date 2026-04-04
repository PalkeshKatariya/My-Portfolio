// Run once after setting up Supabase to seed the database with existing data.
// Usage: SUPABASE_URL=... SUPABASE_SERVICE_KEY=... node seed-supabase.js

const { createClient } = require('@supabase/supabase-js');
const bcrypt = require('bcryptjs');
const workItems = require('./data/work.json');

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('Set SUPABASE_URL and SUPABASE_SERVICE_KEY environment variables.');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

async function seed() {
  console.log('Seeding work items...');
  // Remove old id field so Supabase auto-generates them
  const rows = workItems.map(({ id, ...rest }) => rest);
  // Clear existing rows first, then insert fresh
  await supabase.from('work').delete().neq('id', 0);
  const { error: workErr } = await supabase.from('work').insert(rows);
  if (workErr) console.error('Work seed error:', workErr);
  else console.log(`Inserted ${rows.length} work items.`);

  console.log('Seeding default admin user...');
  const hash = bcrypt.hashSync('admin123', 10);
  const { error: adminErr } = await supabase
    .from('admins')
    .upsert({ username: 'admin', password_hash: hash }, { onConflict: 'username' });
  if (adminErr) console.error('Admin seed error:', adminErr);
  else console.log('Admin user created: admin / admin123');

  console.log('Done!');
}

seed().catch(console.error);
