// src/routes/auth.js
// Account + session routes: sign up, log in, log out, and "who am I".
//
// How login works here:
// We use express-session. When a user logs in we store their id in
// req.session.userId. express-session saves that on the server and gives
// the browser a signed cookie. On every later request the cookie lets us
// look the session back up, so we know who is logged in.

const express = require('express');
const bcrypt = require('bcryptjs');
const db = require('../db');

const router = express.Router();

// ---- Shared login guard -------------------------------------------
// Reusable middleware that blocks a request unless someone is logged in.
// posts.js imports this to protect actions like posting, deleting, liking.
function requireLogin(req, res, next) {
  if (!req.session.userId) {
    return res.status(401).json({ error: 'You must be logged in to do that.' });
  }
  next(); // logged in — let the request continue to the route handler
}

// POST /api/auth/signup  -> create a new account, then log it in.
router.post('/signup', async (req, res) => {
  const { username, password } = req.body;

  // Validate input BEFORE touching the database.
  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password are required.' });
  }
  if (username.length > 30) {
    return res.status(400).json({ error: 'Username must be 30 characters or fewer.' });
  }
  if (password.length < 6) {
    return res.status(400).json({ error: 'Password must be at least 6 characters.' });
  }

  try {
    // Hash the password so the real password is never stored.
    // The number 10 is the "cost": higher = slower to compute = harder
    // for an attacker to brute-force a stolen hash.
    const passwordHash = await bcrypt.hash(password, 10);

    const result = await db.query(
      'INSERT INTO users (username, password_hash) VALUES ($1, $2) RETURNING id, username',
      [username, passwordHash]
    );
    const user = result.rows[0];

    // Log the new user in right away by saving their id in the session.
    req.session.userId = user.id;
    res.status(201).json({ id: user.id, username: user.username });
  } catch (err) {
    // Postgres error code 23505 = unique_violation: the username is taken.
    if (err.code === '23505') {
      return res.status(409).json({ error: 'That username is already taken.' });
    }
    console.error('Signup failed:', err);
    res.status(500).json({ error: 'Something went wrong creating your account.' });
  }
});

// POST /api/auth/login  -> start a session for an existing user.
router.post('/login', async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password are required.' });
  }

  try {
    const result = await db.query(
      'SELECT id, username, password_hash FROM users WHERE username = $1',
      [username]
    );
    const user = result.rows[0];

    // We give the SAME vague message whether the username doesn't exist or
    // the password is wrong, so we don't reveal which usernames are real.
    if (!user || !(await bcrypt.compare(password, user.password_hash))) {
      return res.status(401).json({ error: 'Invalid username or password.' });
    }

    req.session.userId = user.id;
    res.json({ id: user.id, username: user.username });
  } catch (err) {
    console.error('Login failed:', err);
    res.status(500).json({ error: 'Something went wrong logging in.' });
  }
});

// POST /api/auth/logout  -> end the session.
router.post('/logout', (req, res) => {
  // destroy() removes the session on the server; the cookie becomes useless.
  req.session.destroy(() => {
    res.status(204).end();
  });
});

// GET /api/auth/me  -> who is logged in right now.
// The frontend calls this on page load to decide what to show.
router.get('/me', async (req, res) => {
  if (!req.session.userId) {
    return res.status(401).json({ error: 'Not logged in.' });
  }
  const result = await db.query(
    'SELECT id, username, bio, avatar, created_at FROM users WHERE id = $1',
    [req.session.userId]
  );
  res.json(result.rows[0]);
});

// Export the router AND the guard so other route files can reuse the guard.
module.exports = { router, requireLogin };
