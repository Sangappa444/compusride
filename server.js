const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const path = require('path');
const db = require('./database');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, 'public')));

// Basic Rates per km
const RATES = {
    'Bike': { base: 20, perKm: 10 },
    'Auto': { base: 30, perKm: 15 },
    'Car': { base: 50, perKm: 25 }
};

// --- AUTHENTICATION ENDPOINTS ---

// Register
app.post('/api/register', (req, res) => {
    const { username, password, role, college_name, id_card_number } = req.body;
    db.run(
        `INSERT INTO users (username, password, role, college_name, id_card_number) VALUES (?, ?, ?, ?, ?)`,
        [username, password, role, college_name, id_card_number],
        function (err) {
            if (err) {
                return res.status(400).json({ error: 'Username already exists or invalid data.' });
            }
            res.json({ id: this.lastID, username, role });
        }
    );
});

// Login
app.post('/api/login', (req, res) => {
    const { username, password } = req.body;
    db.get(
        `SELECT * FROM users WHERE username = ? AND password = ?`,
        [username, password],
        (err, row) => {
            if (err || !row) {
                return res.status(401).json({ error: 'Invalid credentials.' });
            }
            res.json({ id: row.id, username: row.username, role: row.role, id_card_number: row.id_card_number });
        }
    );
});

// Fetch Colleges
app.get('/api/colleges', (req, res) => {
    db.all(`SELECT name FROM colleges ORDER BY name ASC`, [], (err, rows) => {
        if (err) return res.status(500).json({ error: 'Failed to fetch colleges.' });
        res.json(rows.map(r => r.name));
    });
});

// --- RIDE ENDPOINTS ---

// Calculate Price (Preview)
app.post('/api/calculate-price', (req, res) => {
    const { distance, vehicle_type, role, id_card_number } = req.body;
    if (!RATES[vehicle_type]) return res.status(400).json({ error: 'Invalid vehicle type.' });

    let price = RATES[vehicle_type].base + (RATES[vehicle_type].perKm * distance);
    let appliedDiscount = 0;

    // Festival / ID Card Offer Logic
    if (id_card_number && id_card_number.length > 3) {
        if (role === 'student') {
            appliedDiscount = 0.20; // 20% discount for students
        } else if (role === 'professor') {
            appliedDiscount = 0.10; // 10% discount for professors
        }
    }

    const discountAmount = price * appliedDiscount;
    const finalPrice = price - discountAmount;

    res.json({
        original_price: Math.round(price),
        discount_amount: Math.round(discountAmount),
        final_price: Math.round(finalPrice)
    });
});

// Book a Ride
app.post('/api/book', (req, res) => {
    const { user_id, pickup, dropoff, distance, vehicle_type, price } = req.body;
    db.run(
        `INSERT INTO bookings (user_id, pickup, dropoff, distance, vehicle_type, price) VALUES (?, ?, ?, ?, ?, ?)`,
        [user_id, pickup, dropoff, distance, vehicle_type, price],
        function (err) {
            if (err) return res.status(500).json({ error: 'Booking failed.' });
            res.json({ booking_id: this.lastID, status: 'pending' });
        }
    );
});

// Get Pending Rides (For Riders)
app.get('/api/rides/pending', (req, res) => {
    db.all(`SELECT b.*, u.username, u.college_name FROM bookings b JOIN users u ON b.user_id = u.id WHERE b.status = 'pending'`, [], (err, rows) => {
        if (err) return res.status(500).json({ error: 'Failed to fetch rides.' });
        res.json(rows);
    });
});

// Accept Ride (For Riders)
app.post('/api/rides/accept', (req, res) => {
    const { booking_id, rider_id } = req.body;
    db.run(
        `UPDATE bookings SET status = 'accepted', rider_id = ? WHERE id = ? AND status = 'pending'`,
        [rider_id, booking_id],
        function (err) {
            if (err || this.changes === 0) return res.status(400).json({ error: 'Could not accept ride. It may have been taken.' });
            res.json({ success: true, status: 'accepted' });
        }
    );
});

// Update Ride Status
app.post('/api/rides/update', (req, res) => {
    const { booking_id, status } = req.body;
    db.run(
        `UPDATE bookings SET status = ? WHERE id = ?`,
        [status, booking_id],
        function (err) {
            if (err) return res.status(500).json({ error: 'Failed to update.' });
            res.json({ success: true, status });
        }
    );
});

// Check Ride Status (For Users)
app.get('/api/rides/status/:id', (req, res) => {
    db.get(
        `SELECT b.*, u.username as rider_name FROM bookings b LEFT JOIN users u ON b.rider_id = u.id WHERE b.id = ?`,
        [req.params.id],
        (err, row) => {
            if (err || !row) return res.status(404).json({ error: 'Not found.' });
            res.json(row);
        }
    );
});

app.listen(PORT, () => {
    console.log(`CampusCruze server running on http://localhost:${PORT}`);
});
