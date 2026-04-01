const initSqlJs = require('sql.js/dist/sql-asm.js');

let db = null;
let dbReady = null;

// Initialize the database
function initDatabase() {
  if (dbReady) return dbReady;

  dbReady = (async () => {
    const SQL = await initSqlJs();
    db = new SQL.Database();
    console.log('Connected to in-memory SQLite database.');

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
          callback.call(context, null);
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
