// src/server.js
// The Express application: middleware, API routes, static files, and startup.
// This is the file `npm start` runs.

require('dotenv').config();
const path = require('path');
const express = require('express');
const session = require('express-session');

const { initSchema } = require('./db'); // creates the database tables on startup

// Route modules. auth.js exports { router, requireLogin }, so we pull out
// just the router here.
const { router: authRouter } = require('./routes/auth');
const postsRouter = require('./routes/posts');
const usersRouter = require('./routes/users');

const app = express();

// --- Core middleware ------------------------------------------------
// Parse JSON request bodies so that req.body is filled in on POST requests.
// We raise the limit to 2mb because a profile photo is uploaded as a base64
// "data URL" inside the JSON body, and the default limit (100kb) is too small.
app.use(express.json({ limit: "2mb" }));

// Sessions: remembers who is logged in via a signed cookie.
// NOTE: the default store keeps sessions in memory. That's fine for a
// class project or a single Render instance, but sessions reset whenever
// the server restarts. A production app would use a database-backed store.
app.use(
  session({
    secret: process.env.SESSION_SECRET || 'dev-secret-change-me',
    resave: false, // don't re-save a session that didn't change
    saveUninitialized: false, // don't create a session until we store something
    cookie: {
      httpOnly: true, // browser JavaScript can't read the cookie (safer)
      maxAge: 1000 * 60 * 60 * 24 * 7, // keep the user logged in for 1 week
    },
  })
);

// --- API routes -----------------------------------------------------
// Each module handles one group of endpoints. Mounting them here keeps
// the URL prefixes in one obvious place.
app.use('/api/auth', authRouter);
app.use('/api/posts', postsRouter);
app.use('/api/users', usersRouter);

// --- Static frontend ------------------------------------------------
// Serve everything in /public (index.html, style.css, app.js) so the whole
// app — frontend and backend — runs from this single server.
app.use(express.static(path.join(__dirname, '..', 'public')));

// --- Start the server ----------------------------------------------
// Render provides PORT; locally we default to 3000.
const PORT = process.env.PORT || 3000;

// Make sure the database tables exist BEFORE we start accepting requests.
// If the schema can't be set up (e.g. the database is unreachable), we log the
// error and exit so the platform can restart us, instead of serving an app that
// would fail on every request.
initSchema()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`TheTweeter running at http://localhost:${PORT}`);
    });
  })
  .catch((err) => {
    console.error('Could not initialize the database schema:', err);
    process.exit(1);
  });
