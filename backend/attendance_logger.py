import serial
import sqlite3
import os
from datetime import datetime
import bcrypt

# Configuration - Now uses relative paths
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DB_PATH = os.path.join(BASE_DIR, 'attendance.db')
ARDUINO_PORT = "COM7"
BAUD_RATE = 9600

def initialize_database():
    """Initialize database tables and initial data"""
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    
    # Create tables with improved schema
    cursor.executescript('''
    PRAGMA foreign_keys = ON;
    
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
    
    CREATE TABLE IF NOT EXISTS Admins (
        admin_id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        full_name TEXT NOT NULL,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        last_login TEXT,
        is_active INTEGER DEFAULT 1
    );
    ''')
    
    # Insert initial students
    students = [
        ("Millie Akoko", "FB 18 E0 00"),
        ("Peter Ndiema", "21 0F E0 00"),
        ("Gladys Njeru", "43 44 D8 00"),
        ("Hosea Mbugua", "36 D0 DF 00")
    ]
    
    cursor.executemany(
        "INSERT OR IGNORE INTO Students (name, rfid_tag) VALUES (?, ?)",
        students
    )
    
    # Check if admin exists
    cursor.execute("SELECT COUNT(*) FROM Admins WHERE username = 'admin'")
    if cursor.fetchone()[0] == 0:
        hashed_pw = bcrypt.hashpw("admin123".encode('utf-8'), bcrypt.gensalt())
        cursor.execute(
            "INSERT INTO Admins (username, password_hash, full_name) VALUES (?, ?, ?)",
            ("admin", hashed_pw, "System Administrator")
        )
        print("Created default admin: username=admin, password=admin123")
    
    conn.commit()
    conn.close()

def log_attendance(ser_conn, db_conn):
    """Main attendance logging loop with error handling"""
    cursor = db_conn.cursor()
    
    try:
        print("\nRFID Attendance Logger Active. Press Ctrl+C to stop.\n")
        while True:
            if ser_conn.in_waiting > 0:
                raw_data = ser_conn.readline()
                try:
                    data = raw_data.decode('utf-8').strip()
                    print(f"RFID Scan: {data}")
                    
                    if "," in data:  # Expected format: "Name,timestamp"
                        name, _ = data.split(",", 1)
                        name = name.strip()
                        timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
                        
                        cursor.execute(
                            "SELECT student_id FROM Students WHERE name = ?", 
                            (name,)
                        )
                        result = cursor.fetchone()
                        
                        if result:
                            cursor.execute(
                                """INSERT INTO Attendance 
                                (student_id, scan_time, status) 
                                VALUES (?, ?, ?)""",
                                (result[0], timestamp, "Present")
                            )
                            db_conn.commit()
                            print(f"Logged: {name} at {timestamp}")
                        else:
                            print(f"Unknown student: {name}")
                    elif "Unknown card detected" in data:
                        print("Unknown RFID card scanned")
                        
                except UnicodeDecodeError:
                    print(f"Invalid data received: {raw_data}")
                    
    except KeyboardInterrupt:
        print("\nStopping RFID logger...")
    except Exception as e:
        print(f"\nError: {str(e)}")
    finally:
        if 'ser_conn' in locals():
            ser_conn.close()
        if 'db_conn' in locals():
            db_conn.close()

def main():
    print(f"Initializing RFID Attendance System...")
    print(f"Database path: {DB_PATH}")
    
    # Initialize database
    initialize_database()
    
    # Set up serial connection
    try:
        ser = serial.Serial(ARDUINO_PORT, BAUD_RATE, timeout=1)
        print(f"Connected to Arduino on {ARDUINO_PORT}")
    except serial.SerialException as e:
        print(f"Arduino connection failed: {str(e)}")
        return
    
    # Set up database connection
    try:
        conn = sqlite3.connect(DB_PATH)
        conn.execute("PRAGMA foreign_keys = ON")
        print("Database connection established")
    except sqlite3.Error as e:
        print(f"Database connection failed: {str(e)}")
        ser.close()
        return
    
    # Start logging
    log_attendance(ser, conn)
    
    print("System shutdown complete")

if __name__ == "__main__":
    main()