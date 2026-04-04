const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_KEY environment variables.');
}

const supabase = createClient(SUPABASE_URL || '', SUPABASE_SERVICE_KEY || '');

// Callback-compatible wrapper so existing routes (contact, auth) keep working
// without a full rewrite. Uses Supabase under the hood.
const dbWrapper = {
  // run: for INSERT / UPDATE / DELETE
  run(sql, params, callback) {
    (async () => {
      try {
        const { table, operation, data, match } = parseSql(sql, params);
        let result;
        if (operation === 'insert') {
          const { data: rows, error } = await supabase.from(table).insert(data).select();
          if (error) throw error;
          const row = rows && rows[0];
          const ctx = { lastID: row ? row.id : 0, changes: rows ? rows.length : 0 };
          if (callback) callback.call(ctx, null);
          return;
        }
        if (operation === 'update') {
          let q = supabase.from(table).update(data);
          for (const [k, v] of Object.entries(match)) q = q.eq(k, v);
          const { data: rows, error } = await q.select();
          if (error) throw error;
          const ctx = { lastID: 0, changes: rows ? rows.length : 0 };
          if (callback) callback.call(ctx, null);
          return;
        }
        if (operation === 'delete') {
          let q = supabase.from(table).delete();
          for (const [k, v] of Object.entries(match)) q = q.eq(k, v);
          const { data: rows, error } = await q.select();
          if (error) throw error;
          const ctx = { lastID: 0, changes: rows ? rows.length : 0 };
          if (callback) callback.call(ctx, null);
          return;
        }
        if (callback) callback.call({ lastID: 0, changes: 0 }, null);
      } catch (err) {
        console.error('db.run error:', err);
        if (callback) callback.call({ lastID: 0, changes: 0 }, err);
      }
    })();
  },

  // get: SELECT returning one row
  get(sql, params, callback) {
    (async () => {
      try {
        const { table, columns, match, orderBy } = parseSelect(sql, params);
        let q = supabase.from(table).select(columns);
        for (const [k, v] of Object.entries(match)) q = q.eq(k, v);
        if (orderBy) q = q.order(orderBy.col, { ascending: orderBy.asc });
        q = q.limit(1).maybeSingle();
        const { data, error } = await q;
        if (error) throw error;
        callback(null, data);
      } catch (err) {
        console.error('db.get error:', err);
        callback(err, null);
      }
    })();
  },

  // all: SELECT returning many rows
  all(sql, params, callback) {
    (async () => {
      try {
        const { table, columns, match, orderBy } = parseSelect(sql, params);
        let q = supabase.from(table).select(columns);
        for (const [k, v] of Object.entries(match)) q = q.eq(k, v);
        if (orderBy) q = q.order(orderBy.col, { ascending: orderBy.asc });
        const { data, error } = await q;
        if (error) throw error;
        callback(null, data || []);
      } catch (err) {
        console.error('db.all error:', err);
        callback(err, []);
      }
    })();
  },

  // Expose the raw supabase client for direct use
  supabase
};

// ── Minimal SQL → Supabase translators ──
// These handle the specific SQL patterns used by the existing routes.

function parseSql(sql, params) {
  const s = sql.replace(/\s+/g, ' ').trim();

  // INSERT INTO table (col1, col2) VALUES (?, ?)
  const insertMatch = s.match(/^INSERT INTO (\w+)\s*\(([^)]+)\)\s*VALUES\s*\(/i);
  if (insertMatch) {
    const table = insertMatch[1];
    const cols = insertMatch[2].split(',').map(c => c.trim());
    const data = {};
    cols.forEach((c, i) => { data[c] = params[i] !== undefined ? params[i] : null; });
    return { table, operation: 'insert', data, match: {} };
  }

  // UPDATE table SET col1 = ?, col2 = ? WHERE id = ?
  const updateMatch = s.match(/^UPDATE (\w+) SET (.+?) WHERE (.+)$/i);
  if (updateMatch) {
    const table = updateMatch[1];
    const setParts = updateMatch[2].split(',').map(p => p.trim());
    const whereParts = updateMatch[3].split(/\s+AND\s+/i).map(p => p.trim());
    const data = {};
    let pi = 0;
    for (const part of setParts) {
      const col = part.split('=')[0].trim();
      if (part.includes('?')) { data[col] = params[pi++]; }
    }
    const match = {};
    for (const part of whereParts) {
      const col = part.split('=')[0].trim();
      if (part.includes('?')) { match[col] = params[pi++]; }
    }
    return { table, operation: 'update', data, match };
  }

  // DELETE FROM table WHERE col = ?
  const deleteMatch = s.match(/^DELETE FROM (\w+) WHERE (.+)$/i);
  if (deleteMatch) {
    const table = deleteMatch[1];
    const whereParts = deleteMatch[2].split(/\s+AND\s+/i).map(p => p.trim());
    const match = {};
    let pi = 0;
    for (const part of whereParts) {
      const col = part.split('=')[0].trim();
      if (part.includes('?')) { match[col] = params[pi++]; }
    }
    return { table, operation: 'delete', data: {}, match };
  }

  return { table: '', operation: 'unknown', data: {}, match: {} };
}

function parseSelect(sql, params) {
  const s = sql.replace(/\s+/g, ' ').trim();

  // SELECT cols FROM table [WHERE ...] [ORDER BY ...]
  const m = s.match(/^SELECT (.+?) FROM (\w+)(.*?)$/i);
  const columns = m ? (m[1].trim() === '*' ? '*' : m[1].trim()) : '*';
  const table = m ? m[2] : '';
  const rest = m ? m[3].trim() : '';

  const match = {};
  let pi = 0;
  const whereMatch = rest.match(/WHERE (.+?)(?:ORDER|$)/i);
  if (whereMatch) {
    const whereParts = whereMatch[1].split(/\s+AND\s+/i).map(p => p.trim());
    for (const part of whereParts) {
      const col = part.split('=')[0].trim();
      if (part.includes('?')) { match[col] = params[pi++]; }
    }
  }

  let orderBy = null;
  const orderMatch = rest.match(/ORDER BY (\w+)\s*(ASC|DESC)?/i);
  if (orderMatch) {
    orderBy = { col: orderMatch[1], asc: (orderMatch[2] || 'ASC').toUpperCase() === 'ASC' };
  }

  return { table, columns, match, orderBy };
}

module.exports = dbWrapper;
