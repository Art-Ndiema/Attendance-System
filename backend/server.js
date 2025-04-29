const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const cors = require('cors');
const path = require('path');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
require('dotenv').config();

const app = express();

// Enable CORS and JSON parsing
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Database connection
const db = new sqlite3.Database('C:\\Users\\artnd\\Desktop\\Electronics\\Adruino Attendance System\\attendance.db', (err) => {
  if (err) console.error('Database error:', err);
  console.log('Connected to SQLite database');
});

// Create admin table if not exists
db.run(`CREATE TABLE IF NOT EXISTS Admins (
  admin_id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT UNIQUE,
  password_hash TEXT,
  full_name TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  last_login TEXT
)`);

// Authentication middleware
function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  
  if (!token) return res.sendStatus(401);
  
  jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key', (err, admin) => {
    if (err) return res.sendStatus(403);
    req.admin = admin;
    next();
  });
}

// Admin endpoints
app.post('/api/auth/signup', async (req, res) => {
  const { username, password, full_name } = req.body;
  
  if (!username || !password || !full_name) {
    return res.status(400).json({ error: 'All fields are required' });
  }

  try {
    const hashedPassword = await bcrypt.hash(password, 10);
    
    db.run(
      'INSERT INTO Admins (username, password_hash, full_name) VALUES (?, ?, ?)',
      [username, hashedPassword, full_name],
      function(err) {
        if (err) {
          return res.status(400).json({ error: 'Username already exists' });
        }
        res.status(201).json({ message: 'Admin account created' });
      }
    );
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/auth/login', (req, res) => {
  const { username, password } = req.body;
  
  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password required' });
  }

  db.get(
    'SELECT * FROM Admins WHERE username = ?',
    [username],
    async (err, admin) => {
      if (err) return res.status(500).json({ error: err.message });
      if (!admin) return res.status(401).json({ error: 'Invalid credentials' });
      
      try {
        const match = await bcrypt.compare(password, admin.password_hash);
        if (!match) return res.status(401).json({ error: 'Invalid credentials' });
        
        // Update last login
        db.run(
          'UPDATE Admins SET last_login = datetime("now") WHERE admin_id = ?',
          [admin.admin_id]
        );
        
        const token = jwt.sign(
          { adminId: admin.admin_id, username: admin.username },
          process.env.JWT_SECRET || 'your-secret-key',
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
        res.status(500).json({ error: err.message });
      }
    }
  );
});

// Protected routes
app.get('/api/dashboard', authenticateToken, (req, res) => {
  const selectedDate = req.query.date || new Date().toISOString().split('T')[0];
  
  db.get('SELECT COUNT(*) AS total FROM Students', (err, totalRow) => {
    if (err) return res.status(500).json({ error: err.message });
    
    const dateQuery = `
      SELECT COUNT(DISTINCT student_id) AS present 
      FROM Attendance 
      WHERE DATE(scan_time) = ? AND status = 'Present'
    `;
    
    db.get(dateQuery, [selectedDate], (err, presentRow) => {
      if (err) return res.status(500).json({ error: err.message });
      
      const chartQuery = `
        SELECT status, COUNT(*) AS count 
        FROM Attendance 
        WHERE DATE(scan_time) = ? 
        GROUP BY status
      `;
      
      db.all(chartQuery, [selectedDate], (err, chartRows) => {
        if (err) return res.status(500).json({ error: err.message });
        
        const chartData = {
          Present: 0,
          Absent: 0
        };
        
        chartRows.forEach(row => {
          chartData[row.status] = row.count;
        });
        
        const presentCount = presentRow.present || 0;
        const absentCount = totalRow.total - presentCount;
        
        res.json({
          total: totalRow.total,
          present: presentCount,
          absent: absentCount,
          chart: chartData
        });
      });
    });
  });
});

app.get('/api/attendance', authenticateToken, (req, res) => {
  const dateFilter = req.query.date ? `WHERE DATE(a.scan_time) = '${req.query.date}'` : '';
  
  const query = `
    SELECT 
      s.name AS name,
      s.rfid_tag AS rfid_tag,
      a.scan_time AS scan_time,
      a.status AS status
    FROM Attendance a
    JOIN Students s ON a.student_id = s.student_id
    ${dateFilter}
    ORDER BY a.scan_time DESC
  `;
  
  db.all(query, [], (err, rows) => {
    if (err) {
      console.error('Error fetching attendance:', err);
      return res.status(500).json({ error: err.message });
    }
    res.json(rows);
  });
});

// Health check endpoint (public)
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', message: 'Server is running' });
});

// Start the server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
// Temporary route to create first admin (remove after use)
app.post('/create-first-admin', async (req, res) => {
  const hashedPassword = await bcrypt.hash('admin123', 10);
  db.run(
    'INSERT INTO Admins (username, password_hash, full_name) VALUES (?, ?, ?)',
    ['admin', hashedPassword, 'System Admin'],
    function(err) {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ message: 'First admin created' });
    }
  );
});