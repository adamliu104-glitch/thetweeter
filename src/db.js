// src/db.js
// A single shared Postgres connection pool for the whole app.
//
// Why a POOL instead of a new connection per request?
// Opening a database connection is slow. A pool keeps a small set of
// connections open and lends them out as requests come in, then reuses
// them. This is the standard, efficient way to talk to Postgres.

require('dotenv').config(); // load variables from .env into process.env
const fs = require('fs');
const path = require('path');
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

// Create the tables if they don't exist yet by running schema.sql.
// Because schema.sql uses "CREATE TABLE IF NOT EXISTS", this is safe to run on
// every startup: it sets up a brand-new database and does nothing once the
// tables already exist. server.js calls this before the app starts listening,
// so a fresh deploy (e.g. on Render) needs no manual schema step.
async function initSchema() {
  const schemaPath = path.join(__dirname, '..', 'schema.sql');
  const sql = fs.readFileSync(schemaPath, 'utf8');

  // On a fresh deploy the database can take a few seconds to start accepting
  // connections, so we retry a few times before giving up.
  const attempts = 5;
  for (let attempt = 1; attempt <= attempts; attempt++) {
    try {
      await pool.query(sql); // a query with no params can run many statements at once
      return;
    } catch (err) {
      if (attempt === attempts) throw err;
      console.log(`Database not ready (attempt ${attempt}/${attempts}); retrying in 2s...`);
      await new Promise((resolve) => setTimeout(resolve, 2000));
    }
  }
}

// We export a small `query` helper used everywhere in the app, the pool, and
// the one-time `initSchema` used at startup.
// IMPORTANT: always call query(text, params) with PARAMETERIZED placeholders
// ($1, $2, ...). The values in `params` are sent to Postgres separately from
// the SQL text, so user input can never be treated as SQL code. That makes
// SQL injection impossible by default.
module.exports = {
  query: (text, params) => pool.query(text, params),
  pool,
  initSchema,
};
