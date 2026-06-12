-- schema.sql
-- BoonTweet database schema.
--
-- Run this ONCE against your Postgres database to create all tables.
--   Local example:  psql "$DATABASE_URL" -f schema.sql
--
-- We DROP the tables first so this file is safe to re-run while you're
-- developing (it resets the database to a clean state every time).
-- Order matters: drop the "child" tables (likes, posts) before the
-- "parent" table (users) because of the foreign-key references.
-- CASCADE tells Postgres to also remove anything that depends on them.
DROP TABLE IF EXISTS likes CASCADE;
DROP TABLE IF EXISTS posts CASCADE;
DROP TABLE IF EXISTS users CASCADE;

-- USERS --------------------------------------------------------------
-- One row per account.
-- We store a bcrypt *hash* of the password, never the password itself,
-- so that a database leak can't expose anyone's real password.
CREATE TABLE users (
  id            SERIAL PRIMARY KEY,
  username      TEXT NOT NULL UNIQUE,          -- UNIQUE: no two accounts share a name
  password_hash TEXT NOT NULL,                 -- bcrypt hash (created in routes/auth.js)
  bio           TEXT NOT NULL DEFAULT '',      -- shown on the profile page; optional
  avatar        TEXT,                          -- profile photo as a base64 "data URL"; NULL means no photo
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- POSTS --------------------------------------------------------------
-- One row per tweet. `user_id` links each post to its author.
-- REFERENCES users(id) means a post must belong to a real user.
-- ON DELETE CASCADE means: if a user is deleted, their posts go too.
-- The CHECK constraint enforces the 1..280 length rule at the database
-- level as a safety net, even though the API validates it as well.
CREATE TABLE posts (
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
CREATE TABLE likes (
  id         SERIAL PRIMARY KEY,
  user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  post_id    INTEGER NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, post_id)
);

-- An index on created_at makes the "newest first" feed query fast once
-- there are lots of posts. (Optional for a small demo, good habit to show.)
CREATE INDEX idx_posts_created_at ON posts (created_at DESC);
