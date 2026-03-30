const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcryptjs');
const readline = require('readline');
const path = require('path');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

const dbPath = path.join(__dirname, 'portfolio.db');
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Error opening database:', err.message);
    process.exit(1);
  }
  promptForPassword();
});

function promptForPassword() {
  rl.question('Enter new password: ', (password) => {
    if (!password || password.length < 6) {
      console.error('❌ Password must be at least 6 characters long.');
      promptForPassword();
      return;
    }

    rl.question('Confirm password: ', (confirmPassword) => {
      if (password !== confirmPassword) {
        console.error('❌ Passwords do not match. Please try again.');
        promptForPassword();
        return;
      }

      const saltRounds = 10;
      bcrypt.hash(password, saltRounds, (err, hash) => {
        if (err) {
          console.error('Error hashing password:', err);
          process.exit(1);
        }

        db.run(
          'UPDATE admins SET password_hash = ? WHERE username = ?',
          [hash, 'admin'],
          (err) => {
            if (err) {
              console.error('Error updating password:', err);
              process.exit(1);
            }

            console.log('\n✅ Password changed successfully!');
            console.log('You can now login with your new password.');
            db.close();
            rl.close();
            process.exit(0);
          }
        );
      });
    });
  });
}
