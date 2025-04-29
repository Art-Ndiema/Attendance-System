require('dotenv').config();
const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const app = express();
const PORT = process.env.PORT || 3000;

// Database Configuration
const DB_PATH = path.join(__dirname, 'attendance.db');

// Middleware
app.use(cors({
  origin: '*', // Allow all origins during development
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static frontend files from the frontend directory
app.use(express.static(path.join(__dirname, '..', 'frontend')));

// Single home route for SPA
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'frontend', 'index.html'));
});

// Database Connection
const db = new sqlite3.Database(DB_PATH, (err) => {
  if (err) {
    console.error('Database connection error:', err);
    process.exit(1);
  }
  console.log('Connected to SQLite database');
  initializeDatabase();
});

// Database Initialization
function initializeDatabase() {
  db.serialize(() => {
    // Enable foreign key constraints
    db.run('PRAGMA foreign_keys = ON');
    
    // Create tables if they don't exist
    db.exec(`
      CREATE TABLE IF NOT EXISTS Admins (
        admin_id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        full_name TEXT NOT NULL,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        last_login TEXT
      );
      
      CREATE TABLE IF NOT EXISTS Students (
        student_id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        rfid_tag TEXT UNIQUE NOT NULL,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP
      );
      
      CREATE TABLE IF NOT EXISTS Attendance (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        student_id INTEGER NOT NULL,
        scan_time TEXT NOT NULL,
        status TEXT DEFAULT 'Present',
        FOREIGN KEY (student_id) REFERENCES Students(student_id) ON DELETE CASCADE
      );
    `);
    
    // Create default admin if none exists
    db.get("SELECT COUNT(*) as count FROM Admins", (err, row) => {
      if (row.count === 0) {
        bcrypt.hash('admin123', 10, (err, hash) => {
          db.run(
            "INSERT INTO Admins (username, password_hash, full_name) VALUES (?, ?, ?)",
            ['admin', hash, 'System Administrator'],
            (err) => {
              if (err) console.error("Error creating admin:", err);
              else console.log("Default admin created - username: admin, password: admin123");
            }
          );
        });
      }
    });
  });
}

// Authentication Middleware
function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  
  if (!token) return res.sendStatus(401);
  
  jwt.verify(token, process.env.JWT_SECRET || 'fallback-secret-123', (err, user) => {
    if (err) return res.sendStatus(403);
    
    // Verify admin still exists (removed is_active check)
    db.get(
      "SELECT admin_id FROM Admins WHERE admin_id = ?",
      [user.adminId],
      (err, admin) => {
        if (err || !admin) return res.sendStatus(403);
        req.user = user;
        next();
      }
    );
  });
}

// API Routes

// Health Check
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    database: DB_PATH,
    tables: ['Admins', 'Students', 'Attendance']
  });
});

// Authentication Routes
app.post('/api/auth/login', (req, res) => {
  console.log('Login attempt:', req.body);
  const { username, password } = req.body;
  
  if (!username || !password) {
    console.log('Missing username or password');
    return res.status(400).json({ error: 'Username and password required' });
  }

  // Removed the is_active check from the query
  db.get(
    "SELECT * FROM Admins WHERE username = ?",
    [username],
    async (err, admin) => {
      if (err) {
        console.error('Database error:', err);
        return res.status(500).json({ error: 'Database error' });
      }
      if (!admin) {
        console.log('Invalid username');
        return res.status(401).json({ error: 'Invalid credentials' });
      }
      
      try {
        console.log('Comparing passwords');
        const match = await bcrypt.compare(password, admin.password_hash);
        console.log('Password match:', match);
        if (!match) return res.status(401).json({ error: 'Invalid credentials' });
        
        // Update last login
        db.run(
          "UPDATE Admins SET last_login = datetime('now') WHERE admin_id = ?",
          [admin.admin_id]
        );
        
        const token = jwt.sign(
          { 
            adminId: admin.admin_id,
            username: admin.username 
          },
          process.env.JWT_SECRET || 'fallback-secret-123',
          { expiresIn: '4h' }
        );
        
        res.json({ 
          token,
          admin: {
            id: admin.admin_id,
            username: admin.username,
            fullName: admin.full_name
          }
        });
      } catch (err) {
        console.error('Login error:', err);
        res.status(500).json({ error: 'Login failed' });
      }
    }
  );
});

// Protected Routes
app.get('/api/dashboard', authenticateToken, (req, res) => {
  const selectedDate = req.query.date || new Date().toISOString().split('T')[0];
  
  const queries = {
    totalStudents: 'SELECT COUNT(*) AS total FROM Students',
    presentToday: `
      SELECT COUNT(DISTINCT student_id) AS present 
      FROM Attendance 
      WHERE DATE(scan_time) = ? AND status = 'Present'
    `,
    attendanceStats: `
      SELECT status, COUNT(*) AS count 
      FROM Attendance 
      WHERE DATE(scan_time) = ? 
      GROUP BY status
    `
  };

  db.serialize(() => {
    db.get(queries.totalStudents, [], (err, totalRow) => {
      if (err) return res.status(500).json({ error: err.message });
      
      db.get(queries.presentToday, [selectedDate], (err, presentRow) => {
        if (err) return res.status(500).json({ error: err.message });
        
        db.all(queries.attendanceStats, [selectedDate], (err, chartRows) => {
          if (err) return res.status(500).json({ error: err.message });
          
          const chartData = { Present: 0, Absent: 0 };
          chartRows.forEach(row => chartData[row.status] = row.count);
          
          res.json({
            total: totalRow.total,
            present: presentRow.present || 0,
            absent: totalRow.total - (presentRow.present || 0),
            chart: chartData
          });
        });
      });
    });
  });
});

app.get('/api/attendance', authenticateToken, (req, res) => {
  const { date } = req.query;
  const query = `
    SELECT 
      s.name, 
      s.rfid_tag, 
      a.scan_time, 
      a.status
    FROM Attendance a
    JOIN Students s ON a.student_id = s.student_id
    ${date ? "WHERE DATE(a.scan_time) = ?" : ""}
    ORDER BY a.scan_time DESC
  `;
  
  db.all(query, date ? [date] : [], (err, rows) => {
    if (err) {
      console.error('Attendance fetch error:', err);
      return res.status(500).json({ error: 'Database error' });
    }
    res.json(rows);
  });
});

// Error Handling
app.use((err, req, res, next) => {
  console.error('Server error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

// Start Server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Database: ${DB_PATH}`);
});