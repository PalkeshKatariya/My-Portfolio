const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// Create database path
const dbPath = path.join(__dirname, 'portfolio.db');

// Create database connection
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Error opening database:', err.message);
  } else {
    console.log('Connected to SQLite database.');
    initializeTables();
  }
});

// Initialize tables
function initializeTables() {
  // Clients table for contact inquiries
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

  // Work table for portfolio items
  db.run(`
    CREATE TABLE IF NOT EXISTS work (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      category TEXT NOT NULL,
      year INTEGER,
      description TEXT,
      video_url TEXT,
      image_url TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Admin users table
  db.run(`
    CREATE TABLE IF NOT EXISTS admins (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `, (err) => {
    if (err) {
      console.error('Error creating tables:', err.message);
    } else {
      // Insert default admin user if not exists
      const bcrypt = require('bcryptjs');
      const defaultPassword = 'admin123';
      const saltRounds = 10;
      
      // First check if admin already exists
      db.get('SELECT * FROM admins WHERE username = ?', ['admin'], (err, row) => {
        if (err) {
          console.error('Error checking admin:', err);
        } else if (row) {
          console.log('Admin user already exists.');
        } else {
          // Create admin user
          bcrypt.hash(defaultPassword, saltRounds, (err, hash) => {
            if (err) {
              console.error('Error hashing password:', err);
            } else {
              db.run(
                'INSERT INTO admins (username, password_hash) VALUES (?, ?)',
                ['admin', hash],
                (err) => {
                  if (err) {
                    console.error('Error inserting admin:', err);
                  } else {
                    console.log('✅ Admin user created: admin / admin123');
                  }
                }
              );
            }
          });
        }
      });
    }
  });
}

module.exports = db;