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
app.use(express.json({ limit: '10mb' })); // or higher if needed

// Connect to Turso
const db = createClient({
  url: process.env.DATABASE_URL,
  authToken: process.env.DATABASE_AUTH_TOKEN
});

app.get('/ping', (req, res) => res.send('pong'));

// Helper function to log errors to the error_logs table
async function logError({ endpoint, method, requestBody, error, userId, statusCode }) {
  // Truncate photo field if present
  let safeBody = { ...requestBody };
  if (safeBody.photo && typeof safeBody.photo === 'string') {
    safeBody.photo = safeBody.photo.substring(0, 100) + '...';
  }
  try {
    await db.execute({
      sql: `INSERT INTO error_logs (timestamp, endpoint, method, request_body, error_message, stack_trace, user_id, status_code)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [
        new Date().toISOString(),
        endpoint,
        method,
        JSON.stringify(safeBody),
        error.message || String(error),
        error.stack || null,
        userId ?? null,
        statusCode ?? null,
      ],
    });
  } catch (logErr) {
    console.error('Failed to log error:', logErr);
  }
}

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
    await logError({
      endpoint: '/api/register',
      method: 'POST',
      requestBody: req.body,
      error: err,
      statusCode: err.message.includes('UNIQUE') ? 400 : 500,
    });
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
    await logError({
      endpoint: '/api/login',
      method: 'POST',
      requestBody: req.body,
      error: err,
      statusCode: 500,
    });
    res.status(500).json({ message: err.message });
  }
});

// --- CLOCK-IN ---
app.post('/api/clock-in', async (req, res) => {
  const { userId, latitude, longitude, clockedInTime, photo } = req.body;
  try {
    // Log incoming payload for debugging
    console.log('Clock-in payload:', req.body);

    // Validate required fields
    if (!userId || !clockedInTime) {
      await logError({
        endpoint: '/api/clock-in',
        method: 'POST',
        requestBody: req.body,
        error: new Error('Missing required fields'),
        userId,
        statusCode: 400,
      });
      return res.status(400).json({ message: 'Missing required fields' });
    }

    // Check if user exists
    const userCheck = await db.execute({
      sql: 'SELECT id, photo FROM users WHERE id = ?',
      args: [userId],
    });
    if (userCheck.rows.length === 0) {
      await logError({
        endpoint: '/api/clock-in',
        method: 'POST',
        requestBody: req.body,
        error: new Error('User not found'),
        userId,
        statusCode: 404,
      });
      return res.status(404).json({ message: 'User not found' });
    }

    // Check if photo is present and matches (basic check: not null/empty)
    if (!photo || typeof photo !== 'string' || photo.length < 100) {
      await logError({
        endpoint: '/api/clock-in',
        method: 'POST',
        requestBody: req.body,
        error: new Error('Invalid or missing photo'),
        userId,
        statusCode: 400,
      });
      return res.status(400).json({ message: 'Invalid or missing photo' });
    }

    // Optionally: Compare uploaded photo with user's stored photo (basic string comparison)
    if (userCheck.rows[0].photo !== photo) {
      await logError({
        endpoint: '/api/clock-in',
        method: 'POST',
        requestBody: req.body,
        error: new Error('Uploaded photo does not match user profile photo'),
        userId,
        statusCode: 401,
      });
      return res.status(401).json({ message: 'Photo does not match user profile' });
    }

    await db.execute({
      sql: 'INSERT INTO clock_events (userId, type, latitude, longitude, clockedInTime, photo) VALUES (?, ?, ?, ?, ?, ?)',
      args: [
        Number(userId),
        "IN",
        Number(latitude),
        Number(longitude),
        String(clockedInTime),
        photo,
      ],
    });
    res.status(200).json({ message: 'Clock-in recorded!' });
  } catch (err) {
    await logError({
      endpoint: '/api/clock-in',
      method: 'POST',
      requestBody: req.body,
      error: err,
      userId,
      statusCode: 500,
    });
    res.status(500).json({ message: 'Database error', details: err.message });
  }
});

// --- CLOCK-OUT ---
app.post('/api/clock-out', async (req, res) => {
  const { userId, clockedOutTime, photo } = req.body;
  try {
    console.log('Clock-out payload:', req.body);

    if (!userId || !clockedOutTime) {
      await logError({
        endpoint: '/api/clock-out',
        method: 'POST',
        requestBody: req.body,
        error: new Error('Missing required fields'),
        userId,
        statusCode: 400,
      });
      return res.status(400).json({ message: 'Missing required fields' });
    }

    const userCheck = await db.execute({
      sql: 'SELECT id, photo FROM users WHERE id = ?',
      args: [userId],
    });
    if (userCheck.rows.length === 0) {
      await logError({
        endpoint: '/api/clock-out',
        method: 'POST',
        requestBody: req.body,
        error: new Error('User not found'),
        userId,
        statusCode: 404,
      });
      return res.status(404).json({ message: 'User not found' });
    }

    if (!photo || typeof photo !== 'string' || photo.length < 100) {
      await logError({
        endpoint: '/api/clock-out',
        method: 'POST',
        requestBody: req.body,
        error: new Error('Invalid or missing photo'),
        userId,
        statusCode: 400,
      });
      return res.status(400).json({ message: 'Invalid or missing photo' });
    }

    if (userCheck.rows[0].photo !== photo) {
      await logError({
        endpoint: '/api/clock-out',
        method: 'POST',
        requestBody: req.body,
        error: new Error('Uploaded photo does not match user profile photo'),
        userId,
        statusCode: 401,
      });
      return res.status(401).json({ message: 'Photo does not match user profile' });
    }

    await db.execute({
      sql: 'INSERT INTO clock_events (userId, type, clockedInTime, photo) VALUES (?, ?, ?, ?)',
      args: [
        Number(userId),
        'OUT',
        String(clockedOutTime),
        photo,
      ],
    });
    res.status(200).json({ message: 'Clock-out recorded!' });
  } catch (err) {
    await logError({
      endpoint: '/api/clock-out',
      method: 'POST',
      requestBody: req.body,
      error: err,
      userId,
      statusCode: 500,
    });
    res.status(500).json({ message: 'Database error', details: err.message });
  }
});

// --- CHECK USER ---
app.post('/api/check-user', async (req, res) => {
  const { email, passwordHash } = req.body;
  try {
    const result = await db.execute({
      sql: 'SELECT id, photo FROM users WHERE email = ? AND passwordHash = ?',
      args: [email, passwordHash],
    });
    if (result.rows.length > 0) {
      const user = result.rows[0];
      res.json({ exists: true, photo: user.photo });
    } else {
      res.json({ exists: false });
    }
  } catch (err) {
    await logError({
      endpoint: '/api/check-user',
      method: 'POST',
      requestBody: req.body,
      error: err,
      statusCode: 500,
    });
    res.status(500).json({ exists: false });
  }
});

// --- ADD PHOTO ---
app.post('/api/add-photo', async (req, res) => {
  const { email, photo } = req.body;
  console.log('Received photo base64:', photo ? photo.substring(0, 100) + '...' : 'null'); // Log first 100 chars
  try {
    const result = await db.execute({
      sql: 'UPDATE users SET photo = ? WHERE email = ?',
      args: [photo, email],
    });
    console.log('Add photo result:', result);
    if (result.rowsAffected === 0) {
      await logError({
        endpoint: '/api/add-photo',
        method: 'POST',
        requestBody: req.body,
        error: new Error('User not found'),
        statusCode: 404,
      });
      return res.status(404).json({ message: 'User not found.' });
    }
    res.status(200).json({ message: 'Photo added!' });
  } catch (err) {
    await logError({
      endpoint: '/api/add-photo',
      method: 'POST',
      requestBody: req.body,
      error: err,
      statusCode: 500,
    });
    res.status(500).json({ message: 'Could not add photo.' });
  }
});

app.listen(port, () => {
  console.log(`Backend running at http://192.168.0.185:${port}`);
});

