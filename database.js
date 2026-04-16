const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, 'campuscruze.db');
const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error('Error opening database', err.message);
    } else {
        console.log('Connected to the SQLite database.');
        
        // Initialize Tables
        db.serialize(() => {
            // Users Table
            db.run(`CREATE TABLE IF NOT EXISTS users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                username TEXT UNIQUE,
                password TEXT,
                role TEXT,
                college_name TEXT,
                id_card_number TEXT
            )`);
            
            // Bookings Table
            db.run(`CREATE TABLE IF NOT EXISTS bookings (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER,
                rider_id INTEGER,
                pickup TEXT,
                dropoff TEXT,
                distance REAL,
                vehicle_type TEXT,
                price REAL,
                status TEXT DEFAULT 'pending',
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY(user_id) REFERENCES users(id),
                FOREIGN KEY(rider_id) REFERENCES users(id)
            )`);
            
            // Pre-seed some colleges for the frontend to use
            db.run(`CREATE TABLE IF NOT EXISTS colleges (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT UNIQUE
            )`);
            
            const stmt = db.prepare('INSERT OR IGNORE INTO colleges (name) VALUES (?)');
            const colleges = [
                'RV College of Engineering',
                'BMS College of Engineering',
                'PES University',
                'MS Ramaiah Institute of Technology',
                'Jain University',
                'Christ University',
                'NITK Surathkal',
                'Manipal Institute of Technology'
            ];
            for (const college of colleges) {
                stmt.run(college);
            }
            stmt.finalize();

        });
    }
});

module.exports = db;
