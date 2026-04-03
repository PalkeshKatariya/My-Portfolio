const fs = require('fs');
const path = require('path');

let initSqlJs;
try {
  initSqlJs = require('sql.js');
} catch (e) {
  console.error('sql.js require failed:', e.message);
  initSqlJs = null;
}

// On Vercel the WASM binary may not be found automatically, so locate it explicitly
function getSqlJsConfig() {
  const candidates = [
    path.join(__dirname, 'node_modules', 'sql.js', 'dist', 'sql-wasm.wasm'),
    path.resolve('node_modules', 'sql.js', 'dist', 'sql-wasm.wasm'),
    '/var/task/node_modules/sql.js/dist/sql-wasm.wasm'
  ];
  for (const p of candidates) {
    try { if (fs.existsSync(p)) return { locateFile: () => p }; } catch { /* skip */ }
  }
  return undefined; // fall back to defaults
}

let db = null;
let dbReady = null;

// Persist database to disk so data survives restarts / Vercel cold starts
const DB_FILE = process.env.VERCEL
  ? '/tmp/portfolio.sqlite'
  : path.join(__dirname, 'portfolio.sqlite');

function saveToFile() {
  try {
    if (db) {
      const data = db.export();
      fs.writeFileSync(DB_FILE, Buffer.from(data));
    }
  } catch (e) {
    console.error('Failed to persist database:', e.message);
  }
}

// Initialize the database
function initDatabase() {
  if (dbReady) return dbReady;

  if (!initSqlJs) {
    dbReady = Promise.reject(new Error('sql.js module not available'));
    return dbReady;
  }

  dbReady = (async () => {
    const SQL = await initSqlJs(getSqlJsConfig());

    // Try loading existing database file
    let loaded = false;
    try {
      if (fs.existsSync(DB_FILE)) {
        const fileBuffer = fs.readFileSync(DB_FILE);
        db = new SQL.Database(fileBuffer);
        console.log('Loaded database from', DB_FILE);
        loaded = true;
      }
    } catch (e) {
      console.error('Failed to load database file, creating fresh:', e.message);
    }

    if (!loaded) {
      db = new SQL.Database();
      console.log('Created new in-memory SQLite database.');
    }

    // Initialize tables
    db.run(`
      CREATE TABLE IF NOT EXISTS clients (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        email TEXT NOT NULL,
        phone TEXT,
        message TEXT,
        service_type TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    db.run(`
      CREATE TABLE IF NOT EXISTS work (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT NOT NULL,
        category TEXT NOT NULL,
        year INTEGER,
        description TEXT,
        video_url TEXT,
        image_url TEXT,
        all_order INTEGER,
        category_order INTEGER,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    db.run(`
      CREATE TABLE IF NOT EXISTS admins (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Insert default admin user if not exists
    const bcrypt = require('bcryptjs');
    const existing = db.exec("SELECT * FROM admins WHERE username = 'admin'");
    if (existing.length === 0 || existing[0].values.length === 0) {
      const hash = bcrypt.hashSync('admin123', 10);
      db.run("INSERT INTO admins (username, password_hash) VALUES (?, ?)", ['admin', hash]);
      console.log('Admin user created: admin / admin123');
    }

    // Seed default portfolio items when running on ephemeral environments.
    const workCountResult = db.exec('SELECT COUNT(*) AS count FROM work');
    const workCount = workCountResult[0] && workCountResult[0].values[0]
      ? Number(workCountResult[0].values[0][0])
      : 0;

    if (workCount === 0) {
      const seedItems = [
        {
          title: 'Grudge',
          category: 'wedding',
          year: 2025,
          description: 'Short film',
          video_url: 'https://youtu.be/s4nC6PtPjmo?si=UoLTtSc3LLeFNfWj',
          image_url: 'https://images.unsplash.com/photo-1519741497674-611481863552?w=900&q=80',
          all_order: 1,
          category_order: 1
        },
        {
          title: 'knock knock - BRAND FILM',
          category: 'commercial',
          year: 2024,
          description: 'Brand film',
          video_url: 'https://www.youtube.com/watch?v=aqz-KE-bpKQ',
          image_url: 'https://images.unsplash.com/photo-1492691527719-9d1e07e534b4?w=900&q=80',
          all_order: 2,
          category_order: 1
        },
        {
          title: 'SOUNDWAVE FESTIVAL 2023',
          category: 'events',
          year: 2023,
          description: 'Live event coverage',
          video_url: 'https://www.youtube.com/watch?v=ZrOKjDZOtkA',
          image_url: 'https://images.unsplash.com/photo-1506157786151-b8491531f063?w=900&q=80',
          all_order: 3,
          category_order: 1
        },
        {
          title: 'LUMIERE - LUXURY AD',
          category: 'commercial',
          year: 2023,
          description: 'Luxury commercial',
          video_url: 'https://www.youtube.com/watch?v=ywJn-mCZKKA',
          image_url: 'https://images.unsplash.com/photo-1601758228041-f3b2795255f1?w=900&q=80',
          all_order: 4,
          category_order: 2
        },
        {
          title: 'MAYA and RAJ - THE CEREMONY',
          category: 'wedding',
          year: 2023,
          description: 'Wedding film',
          video_url: 'https://www.youtube.com/watch?v=3JZ_D3ELwOQ',
          image_url: 'https://images.unsplash.com/photo-1583939411023-14783179e581?w=900&q=80',
          all_order: 5,
          category_order: 2
        }
      ];

      const insertSql = 'INSERT INTO work (title, category, year, description, video_url, image_url, all_order, category_order) VALUES (?, ?, ?, ?, ?, ?, ?, ?)';
      seedItems.forEach((item) => {
        db.run(insertSql, [
          item.title,
          item.category,
          item.year,
          item.description,
          item.video_url,
          item.image_url,
          item.all_order,
          item.category_order
        ]);
      });
      console.log(`Seeded ${seedItems.length} default work items.`);
    }

    saveToFile();
    return db;
  })();

  return dbReady;
}

// Wrapper that mimics the callback-based sqlite3 API
const dbWrapper = {
  run(sql, params, callback) {
    initDatabase().then((database) => {
      try {
        database.run(sql, params || []);
        if (callback) {
          const lastID = database.exec("SELECT last_insert_rowid() as id");
          const changes = database.exec("SELECT changes() as c");
          const context = {
            lastID: lastID[0] ? lastID[0].values[0][0] : 0,
            changes: changes[0] ? changes[0].values[0][0] : 0
          };
          saveToFile();
          callback.call(context, null);
        } else {
          saveToFile();
        }
      } catch (err) {
        if (callback) callback.call({ lastID: 0, changes: 0 }, err);
      }
    }).catch((err) => {
      if (callback) callback.call({ lastID: 0, changes: 0 }, err);
    });
  },

  get(sql, params, callback) {
    initDatabase().then((database) => {
      try {
        const result = database.exec(sql, params || []);
        if (result.length > 0 && result[0].values.length > 0) {
          const columns = result[0].columns;
          const values = result[0].values[0];
          const row = {};
          columns.forEach((col, i) => { row[col] = values[i]; });
          callback(null, row);
        } else {
          callback(null, null);
        }
      } catch (err) {
        callback(err, null);
      }
    }).catch((err) => {
      callback(err, null);
    });
  },

  all(sql, params, callback) {
    initDatabase().then((database) => {
      try {
        const result = database.exec(sql, params || []);
        if (result.length > 0) {
          const columns = result[0].columns;
          const rows = result[0].values.map((values) => {
            const row = {};
            columns.forEach((col, i) => { row[col] = values[i]; });
            return row;
          });
          callback(null, rows);
        } else {
          callback(null, []);
        }
      } catch (err) {
        callback(err, []);
      }
    }).catch((err) => {
      callback(err, []);
    });
  }
};

module.exports = dbWrapper;
