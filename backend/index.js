import { createClient } from '@libsql/client';
import bodyParser from 'body-parser';
import cors from 'cors';
import dotenv from 'dotenv';
import express from 'express';

dotenv.config();

const app = express();
const port = 8081;

app.use(cors());
app.use(bodyParser.json());

// Connect to Turso
const db = createClient({ url: process.env.DATABASE_URL });

// --- REGISTER ---
app.post('/api/register', async (req, res) => {
  const { name, email, passwordHash } = req.body;

  try {
    await db.execute({
      sql: 'INSERT INTO users (name, email, passwordHash) VALUES (?, ?, ?)',
      args: [name, email, passwordHash],
    });
    res.status(200).json({ message: 'Account created!' });
  } catch (err) {
    if (err.message.includes('UNIQUE')) {
      res.status(400).json({ message: 'Email already exists' });
    } else {
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
    res.status(500).json({ message: err.message });
  }
});

// --- CLOCK-IN ---
app.post('/api/clock-in', async (req, res) => {
  const { userId, timestamp, latitude, longitude } = req.body;

  try {
    await db.execute({
      sql: 'INSERT INTO clock_events (userId, timestamp, latitude, longitude) VALUES (?, ?, ?, ?)',
      args: [userId, timestamp, latitude, longitude],
    });
    res.json({ message: 'Clock-in recorded!' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

app.listen(port, '0.0.0.0', () => {
  console.log(`Backend running at http://0.0.0.0:${port}`);
});

