import { createClient } from '@libsql/client';
import cors from 'cors';
import dotenv from 'dotenv';
import express from 'express';

dotenv.config();

console.log('DATABASE_URL:', process.env.DATABASE_URL);

const app = express();
const port = 8081;

app.listen(8081, '0.0.0.0', () => {
  console.log('Backend running on port 8081');
});

// Middleware
app.use(cors());
app.use(express.json()); // built-in parser, replaces body-parser

// Connect to Turso
const db = createClient({
  url: process.env.DATABASE_URL,
  authToken: process.env.DATABASE_AUTH_TOKEN
});

app.get('/ping', (req, res) => res.send('pong'));

// --- REGISTER ---
app.post('/api/register', async (req, res) => {
  const { name, email, passwordHash } = req.body;
  console.log('Register request body:', req.body);

  try {
    await db.execute({
      sql: 'INSERT INTO users (name, email, passwordHash) VALUES (?, ?, ?)',
      args: [name, email, passwordHash],
    });
    res.status(200).json({ message: 'Account created!' });
  } catch (err) {
    if (err.message.includes('UNIQUE')) {
        console.error('Network error:', err);
      res.status(400).json({ message: 'Email already exists' });
    } else {
        console.error('Network error:', err);
      res.status(500).json({ message: err.message });
    }
  }
});

// --- LOGIN ---
app.post('/api/login', async (req, res) => {
  const { email, passwordHash } = req.body;

  try {
    const result = await db.execute({
      sql: 'SELECT id, name FROM users WHERE email = ? AND passwordHash = ?',
      args: [email, passwordHash],
    });

    if (result.rows.length > 0) {
      const user = result.rows[0];
      res.json({ userId: user.id, userName: user.name });
    } else {
      res.status(400).json({ message: 'Invalid email or password' });
    }
  } catch (err) {
      console.error('Network error:', err);
    res.status(500).json({ message: err.message });
  }
});

// --- CLOCK-IN ---
app.post('/api/clock-in', async (req, res) => {
  const { userId, latitude, longitude, clockedInTime, type } = req.body;

  try {
    await db.execute({
      sql: 'INSERT INTO clock_events (userId, type, latitude, longitude, clockedInTime) VALUES (?, ?, ?, ?, ?)',
      args: [
        Number(userId),
        type ?? "IN", // or pass null if not provided
        Number(latitude),
        Number(longitude),
        String(clockedInTime),
      ],
    });
    res.status(200).json({ message: 'Clock-in recorded!' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Database error' });
  }
});

app.listen(port, () => {
  console.log(`Backend running at http://192.168.0.185:${port}`);
});
