import serial
import sqlite3
from datetime import datetime
import bcrypt  # For password hashing (only needed for initial admin setup)

# Configuration
ARDUINO_PORT = "COM7"
BAUD_RATE = 9600
DB_PATH = 'C:\\Users\\artnd\\Desktop\\Electronics\\Adruino Attendance System\\attendance.db'

def initialize_database():
    """Initialize database tables and initial data"""
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    
    # Create tables
    cursor.executescript('''
    CREATE TABLE IF NOT EXISTS Students (
        student_id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        rfid_tag TEXT UNIQUE NOT NULL
    );
    
    CREATE TABLE IF NOT EXISTS Attendance (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        student_id INTEGER NOT NULL,
        scan_time TEXT NOT NULL,
        status TEXT DEFAULT 'Present',
        FOREIGN KEY (student_id) REFERENCES Students(student_id)
    );
    
    CREATE TABLE IF NOT EXISTS Admins (
        admin_id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        full_name TEXT NOT NULL,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        last_login TEXT
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
    
    conn.commit()
    conn.close()

def create_initial_admin():
    """Create the initial admin account (run once)"""
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    
    username = "admin"
    password = "admin123"  # Change this before production use!
    full_name = "System Administrator"
    
    hashed_password = bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt())
    
    try:
        cursor.execute(
            "INSERT INTO Admins (username, password_hash, full_name) VALUES (?, ?, ?)",
            (username, hashed_password, full_name)
        )
        conn.commit()
        print("Initial admin account created successfully")
    except sqlite3.IntegrityError:
        print("Admin account already exists")
    finally:
        conn.close()

def log_attendance(ser_conn, db_conn):
    """Main attendance logging loop"""
    cursor = db_conn.cursor()
    
    try:
        while True:
            if ser_conn.in_waiting > 0:
                data = ser_conn.readline().decode('utf-8').strip()
                print(f"Received: {data}")
                
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
                            "INSERT INTO Attendance (student_id, scan_time, status) VALUES (?, ?, ?)",
                            (result[0], timestamp, "Present")
                        )
                        db_conn.commit()
                        print(f"Logged attendance for {name} at {timestamp}")
                    else:
                        print(f"Unknown student: {name}")
                elif "Unknown card detected" in data:
                    print("Unknown RFID card detected")
    
    except KeyboardInterrupt:
        print("\nLogging stopped by user")
    except Exception as e:
        print(f"Error occurred: {str(e)}")

def main():
    # Initialize database (safe to run multiple times)
    initialize_database()
    
    # Uncomment this line to create initial admin (run once)
    # create_initial_admin()
    
    # Set up serial connection
    try:
        ser = serial.Serial(ARDUINO_PORT, BAUD_RATE, timeout=1)
        print(f"Connected to Arduino on {ARDUINO_PORT}")
    except serial.SerialException as e:
        print(f"Failed to connect to Arduino: {str(e)}")
        return
    
    # Set up database connection
    try:
        conn = sqlite3.connect(DB_PATH)
        print("Connected to database")
    except sqlite3.Error as e:
        print(f"Database connection error: {str(e)}")
        ser.close()
        return
    
    # Start attendance logging
    print("Starting attendance logging...")
    log_attendance(ser, conn)
    
    # Clean up
    ser.close()
    conn.close()
    print("Resources cleaned up")

if __name__ == "__main__":
    main()