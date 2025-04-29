const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcryptjs');
const db = new sqlite3.Database('attendance.db');

async function resetPassword() {
  // Create hash for admin123
  const password = 'admin123';
  const hash = await bcrypt.hash(password, 10);
  
  // Update admin password
  db.run(
    "UPDATE Admins SET password_hash = ? WHERE username = ?",
    [hash, 'admin'],
    function(err) {
      if (err) {
        console.error("Error updating password:", err);
      } else if (this.changes > 0) {
        console.log("Password updated successfully for admin");
      } else {
        console.log("No admin user found");
      }
      db.close();
    }
  );
}

resetPassword();