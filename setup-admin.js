const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcryptjs');
const path = require('path');

// Connect to database
const dbPath = path.join(__dirname, 'portfolio.db');
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Error opening database:', err.message);
    process.exit(1);
  }
  console.log('Connected to database. Setting up admin user...');
  setupAdmin();
});

function setupAdmin() {
  const username = 'admin';
  const password = 'admin23';
  const saltRounds = 10;

  // First, delete existing admin user if any
  db.run('DELETE FROM admins WHERE username = ?', [username], (err) => {
    if (err) {
      console.error('Error deleting old admin:', err);
    } else {
      console.log('Cleared existing admin user.');
    }

    // Hash the password
    bcrypt.hash(password, saltRounds, (err, hash) => {
      if (err) {
        console.error('Error hashing password:', err);
        process.exit(1);
      }

      // Insert new admin user
      db.run(
        'INSERT INTO admins (username, password_hash) VALUES (?, ?)',
        [username, hash],
        (err) => {
          if (err) {
            console.error('Error creating admin user:', err);
            process.exit(1);
          }

          console.log('✅ Admin user successfully set up!');
          console.log(`\nLogin Credentials:`);
          console.log(`Username: ${username}`);
          console.log(`Password: ${password}`);
          console.log(`\n⚠️  Please change the password after first login!`);
          
          db.close();
          process.exit(0);
        }
      );
    });
  });
}
