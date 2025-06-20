const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const cors = require('cors');
const path = require('path');
const fs = require('fs'); // <--- NEW: Import Node.js File System module

const app = express();
const PORT = 3001;

// CORS configuration - allowing only your Netlify frontend
const corsOptions = {
  origin: 'https://symphonious-cassata-30a7f9.netlify.app', // IMPORTANT: Keep your exact Netlify URL here
  methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
  credentials: true,
  optionsSuccessStatus: 204
};
app.use(cors(corsOptions)); // <--- CORRECT: Only one cors middleware line here

app.use(express.json()); // Parse JSON request bodies

// --- Database Initialization ---
let dbPath;
let dbDirectory;

// Determine database path based on environment
if (process.env.NODE_ENV === 'production') {
    // This is the mount path for your persistent disk on Render
    dbDirectory = '/opt/render/project/src/medicare.db-data';
    dbPath = path.join(dbDirectory, 'medicare.db'); // Safely join path segments
} else {
    // Local development path
    dbDirectory = path.resolve(__dirname);
    dbPath = path.join(dbDirectory, 'medicare.db');
}

// <--- NEW FUNCTION: To ensure the directory for the database file exists
function ensureDirectoryExistence(filePath) {
    const dirname = path.dirname(filePath); // Get the directory path from the full file path
    if (fs.existsSync(dirname)) { // Check if the directory already exists
        return true;
    }
    // If directory doesn't exist, create it recursively
    fs.mkdirSync(dirname, { recursive: true });
    console.log(`[DB Setup] Created directory: ${dirname}`); // Log for debugging on Render
}

// <--- NEW CALL: Execute the function BEFORE initializing the database
ensureDirectoryExistence(dbPath);

// Initialize SQLite database connection
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Error opening database:', err.message);
    // Provide more context for SQLITE_CANTOPEN errors
    if (err.code === 'SQLITE_CANTOPEN') {
        console.error('[DB Setup] SQLITE_CANTOPEN error: Possible permission issue or target directory not writable/found.');
        console.error('[DB Setup] Attempted DB Path:', dbPath);
        console.error('[DB Setup] Does DB directory exist before connection?', fs.existsSync(path.dirname(dbPath)));
    }
  } else {
    console.log('Connected to the SQLite database.');
    console.log('Database file is located at:', dbPath); // Confirm actual path being used
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
          db.get("SELECT COUNT(*) as count FROM medications", (err, row) => {
            if (err) {
              console.error('Error counting medications:', err.message);
              return;
            }
            if (row.count === 0) {
              const today = new Date();
              const yyyy = today.getFullYear();
              const mm = String(today.getMonth() + 1).padStart(2, '0');
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

      const monthlyRate = 80;
      const dayStreak = 5;
      const totalToday = medications.length;
      const takenToday = medications.filter(m => m.status === 'taken').length;
      const todayStatus = totalToday > 0 ? (takenToday / totalToday) * 100 : 0;

      res.json({
        dailyMedications: medications,
        monthlyRate: `${monthlyRate}%`,
        dayStreak: dayStreak,
        todayStatus: `${Math.round(todayStatus)}%`,
        calendarData: getMockCalendarData(),
      });
    }
  );
});

function getMockCalendarData() {
  const today = new Date();
  const calendar = {};

  for (let i = -15; i <= 15; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() + i);
    const dateKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    const status = Math.random() > 0.7 ? 'missed' : 'taken';
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
  const adherenceRate = 85;
  const currentStreak = 5;
  const missedThisMonth = 3;
  const takenThisWeek = 4;

  const today = new Date();
  const yyyy = today.getFullYear();
  const mm = String(today.getMonth() + 1).padStart(2, '0');
  const dd = String(today.getDate()).padStart(2, '0');
  const formattedDate = `${yyyy}-${mm}-${dd}`;

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
        todayStatus: dailyMedicationStatus,
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