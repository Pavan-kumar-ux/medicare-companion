// backend/server.js
const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = 3001;

// Middleware
app.use(cors()); // Enable CORS for all routes
app.use(express.json()); // Parse JSON request bodies

// Initialize SQLite database
const dbPath = process.env.NODE_ENV === 'production'
               ? '/opt/render/project/src/medicare.db-data/medicare.db' 
               : path.resolve(__dirname, 'medicare.db'); 
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Error opening database:', err.message);
  } else {
    console.log('Connected to the SQLite database.');
    // Create tables if they don't exist
    db.serialize(() => {
      // Users table to store role
      db.run(`
        CREATE TABLE IF NOT EXISTS users (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          role TEXT NOT NULL DEFAULT 'patient'
        )
      `, (err) => {
        if (err) console.error('Error creating users table:', err.message);
        else {
          // Insert a default user if none exists for demonstration
          db.get("SELECT COUNT(*) as count FROM users", (err, row) => {
            if (err) {
              console.error('Error counting users:', err.message);
              return;
            }
            if (row.count === 0) {
              db.run("INSERT INTO users (role) VALUES (?)", ['patient'], (err) => {
                if (err) console.error('Error inserting default user:', err.message);
                else console.log('Default user (patient) created.');
              });
            }
          });
        }
      });

      // Medications table for patients
      db.run(`
        CREATE TABLE IF NOT EXISTS medications (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          userId INTEGER,
          name TEXT NOT NULL,
          time TEXT NOT NULL,
          status TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'taken', 'missed'
          date TEXT NOT NULL, -- YYYY-MM-DD
          FOREIGN KEY (userId) REFERENCES users(id)
        )
      `, (err) => {
        if (err) console.error('Error creating medications table:', err.message);
        else {
          // Add some dummy medication data if none exists
          db.get("SELECT COUNT(*) as count FROM medications", (err, row) => {
            if (err) {
              console.error('Error counting medications:', err.message);
              return;
            }
            if (row.count === 0) {
              const today = new Date();
              const yyyy = today.getFullYear();
              const mm = String(today.getMonth() + 1).padStart(2, '0'); // Months are 0-based
              const dd = String(today.getDate()).padStart(2, '0');
              const formattedDate = `${yyyy}-${mm}-${dd}`;

              const insertMedications = [
                [1, 'Daily Medication Set', '8:00 AM', 'pending', formattedDate],
                [1, 'Vitamin D', '12:00 PM', 'taken', formattedDate],
                [1, 'Pain Reliever', '6:00 PM', 'pending', formattedDate],
              ];
              insertMedications.forEach(med => {
                db.run("INSERT INTO medications (userId, name, time, status, date) VALUES (?, ?, ?, ?, ?)", med, (err) => {
                  if (err) console.error('Error inserting dummy medication:', err.message);
                });
              });
              console.log('Dummy medication data added.');
            }
          });
        }
      });
    });
  }
});

// API Endpoints

// Get/Set User Role
app.get('/api/user/role', (req, res) => {
  // For simplicity, we'll assume a single user (ID 1)
  db.get('SELECT role FROM users WHERE id = 1', (err, row) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    res.json({ role: row ? row.role : 'patient' });
  });
});

app.post('/api/user/role', (req, res) => {
  const { role } = req.body;
  if (!role || (role !== 'patient' && role !== 'caretaker')) {
    return res.status(400).json({ error: 'Invalid role provided.' });
  }
  db.run('UPDATE users SET role = ? WHERE id = 1', [role], function (err) {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    res.json({ message: 'Role updated successfully', newRole: role });
  });
});

// Patient Dashboard Data
app.get('/api/patient/dashboard', (req, res) => {
  // For simplicity, hardcode userId to 1
  const userId = 1;
  const today = new Date();
  const yyyy = today.getFullYear();
  const mm = String(today.getMonth() + 1).padStart(2, '0');
  const dd = String(today.getDate()).padStart(2, '0');
  const formattedDate = `${yyyy}-${mm}-${dd}`;

  db.all(
    'SELECT * FROM medications WHERE userId = ? AND date = ?',
    [userId, formattedDate],
    (err, medications) => {
      if (err) {
        return res.status(500).json({ error: err.message });
      }

      // Calculate monthly rate (mock data for now)
      // In a real app, you'd calculate this based on a month's adherence
      const monthlyRate = 80; // Placeholder

      // Calculate Day Streak (mock data for now)
      const dayStreak = 5; // Placeholder

      // Calculate Today's Status (mock data for now)
      const totalToday = medications.length;
      const takenToday = medications.filter(m => m.status === 'taken').length;
      const todayStatus = totalToday > 0 ? (takenToday / totalToday) * 100 : 0;

      res.json({
        dailyMedications: medications,
        monthlyRate: `${monthlyRate}%`,
        dayStreak: dayStreak,
        todayStatus: `${Math.round(todayStatus)}%`,
        // Mock calendar data
        calendarData: getMockCalendarData(),
      });
    }
  );
});

// Helper to generate mock calendar data
function getMockCalendarData() {
  const today = new Date();
  const calendar = {};

  for (let i = -15; i <= 15; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() + i);
    const dateKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    const status = Math.random() > 0.7 ? 'missed' : 'taken'; // Randomly taken or missed
    calendar[dateKey] = status;
  }
  return calendar;
}


// Mark Medication as Taken
app.post('/api/patient/mark-taken', (req, res) => {
  const { medicationId } = req.body;
  if (!medicationId) {
    return res.status(400).json({ error: 'Medication ID is required.' });
  }

  db.run(
    'UPDATE medications SET status = ? WHERE id = ?',
    ['taken', medicationId],
    function (err) {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      if (this.changes === 0) {
        return res.status(404).json({ message: 'Medication not found.' });
      }
      res.json({ message: 'Medication marked as taken.', medicationId: medicationId });
    }
  );
});

// Caretaker Dashboard Data
app.get('/api/caretaker/dashboard', (req, res) => {
  // For simplicity, provide mock data
  const adherenceRate = 85;
  const currentStreak = 5;
  const missedThisMonth = 3;
  const takenThisWeek = 4;

  const today = new Date();
  const yyyy = today.getFullYear();
  const mm = String(today.getMonth() + 1).padStart(2, '0');
  const dd = String(today.getDate()).padStart(2, '0');
  const formattedDate = `${yyyy}-${mm}-${dd}`;

  // Get today's medication status for the patient (assuming ID 1)
  db.all(
    'SELECT * FROM medications WHERE userId = 1 AND date = ?',
    [formattedDate],
    (err, medications) => {
      if (err) {
        return res.status(500).json({ error: err.message });
      }

      const dailyMedicationStatus = medications.map(med => ({
        id: med.id,
        name: med.name,
        time: med.time,
        status: med.status,
      }));

      res.json({
        adherenceRate: adherenceRate,
        currentStreak: currentStreak,
        missedThisMonth: missedThisMonth,
        takenThisWeek: takenThisWeek,
        todayStatus: dailyMedicationStatus, // Can be used to show "Pending" etc.
        monthlyAdherenceProgress: {
          overall: 85,
          takenDays: 22,
          missedDays: 5,
          remainingDays: 5,
        },
      });
    }
  );
});

// Start the server
app.listen(PORT, () => {
  console.log(`Backend server running on http://localhost:${PORT}`);
  console.log('You can find the database file at:', dbPath);
});

