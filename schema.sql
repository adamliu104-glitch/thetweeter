-- schema.sql
-- TheTweeter database schema.
--
-- SAFE TO RUN REPEATEDLY: every statement uses "IF NOT EXISTS", so it creates
-- the tables the first time and does nothing afterward. The app runs this file
-- automatically on startup (see src/db.js), which means a brand-new database —
-- including a fresh one on Render — sets itself up with NO manual steps.
--
-- To reset your LOCAL database to an empty state, drop and recreate it:
--   dropdb boontweet && createdb boontweet      (then start the app again)

-- USERS --------------------------------------------------------------
-- One row per account.
-- We store a bcrypt *hash* of the password, never the password itself,
-- so that a database leak can't expose anyone's real password.
CREATE TABLE IF NOT EXISTS users (
  id            SERIAL PRIMARY KEY,
  username      TEXT NOT NULL UNIQUE,          -- UNIQUE: no two accounts share a name
  password_hash TEXT NOT NULL,                 -- bcrypt hash (created in routes/auth.js)
  bio           TEXT NOT NULL DEFAULT '',      -- shown on the profile page; optional
  avatar        TEXT,                          -- profile photo as a base64 "data URL"; NULL means none
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- POSTS --------------------------------------------------------------
-- One row per tweet. `user_id` links each post to its author.
-- ON DELETE CASCADE means: if a user is deleted, their posts go too.
-- The CHECK constraint enforces the 1..280 length rule at the database
-- level as a safety net, even though the API validates it as well.
CREATE TABLE IF NOT EXISTS posts (
  id         SERIAL PRIMARY KEY,
  user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  content    TEXT NOT NULL CHECK (char_length(content) BETWEEN 1 AND 280),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- LIKES --------------------------------------------------------------
-- One row means "this user liked this post".
-- UNIQUE(user_id, post_id) means a user can like a given post at most
-- once. That single constraint is what makes like / unlike correct
-- without any extra bookkeeping in our code.
CREATE TABLE IF NOT EXISTS likes (
  id         SERIAL PRIMARY KEY,
  user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  post_id    INTEGER NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, post_id)
);

-- An index on created_at makes the "newest first" feed query fast once
-- there are lots of posts.
CREATE INDEX IF NOT EXISTS idx_posts_created_at ON posts (created_at DESC);
