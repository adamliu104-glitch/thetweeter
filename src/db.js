// src/db.js
// A single shared Postgres connection pool for the whole app.
//
// Why a POOL instead of a new connection per request?
// Opening a database connection is slow. A pool keeps a small set of
// connections open and lends them out as requests come in, then reuses
// them. This is the standard, efficient way to talk to Postgres.

require('dotenv').config(); // load variables from .env into process.env
const { Pool } = require('pg');

// Read the connection string from the environment.
// Locally we fall back to a sensible default so the app runs with zero
// extra config. On Render, DATABASE_URL is provided for you.
const connectionString =
  process.env.DATABASE_URL || 'postgres://localhost:5432/boontweet';

// Hosted Postgres (like Render's) requires an SSL connection; a local
// database does not. We enable SSL only when we're NOT talking to localhost.
const isLocal =
  connectionString.includes('localhost') || connectionString.includes('127.0.0.1');

const pool = new Pool({
  connectionString,
  ssl: isLocal ? false : { rejectUnauthorized: false },
});

// We export a small `query` helper used everywhere in the app.
// IMPORTANT: always call it as query(text, params) with PARAMETERIZED
// placeholders ($1, $2, ...). The values in `params` are sent to Postgres
// separately from the SQL text, so user input can never be treated as
// SQL code. That makes SQL injection impossible by default.
module.exports = {
  query: (text, params) => pool.query(text, params),
  pool,
};
