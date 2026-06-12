// src/routes/posts.js
// The tweet feed plus all actions on tweets (create, delete, like, unlike).
//
// Every query below is PARAMETERIZED ($1, $2, ...). User input is passed
// separately from the SQL text, so it can never be run as SQL. This is our
// default defense against SQL injection.

const express = require('express');
const db = require('../db');
const { requireLogin } = require('./auth');

const router = express.Router();

const MAX_LENGTH = 280; // a tweet must be non-empty and at most this many chars

// GET /api/posts  -> the feed: every post, newest first.
// Each row includes the author's username and the number of likes.
router.get('/', async (req, res) => {
  try {
    // We JOIN users to get the author's name, and LEFT JOIN likes so that
    // posts with zero likes still appear. COUNT(likes.id) is the like total.
    const result = await db.query(
      `SELECT
         posts.id,
         posts.content,
         posts.created_at,
         users.username,
         users.avatar,
         COUNT(likes.id)::int AS like_count
       FROM posts
       JOIN users ON users.id = posts.user_id
       LEFT JOIN likes ON likes.post_id = posts.id
       GROUP BY posts.id, users.username, users.avatar
       ORDER BY posts.created_at DESC`
    );
    res.json(result.rows);
  } catch (err) {
    console.error('Failed to load feed:', err);
    res.status(500).json({ error: 'Could not load the feed.' });
  }
});

// POST /api/posts  -> create a tweet. Must be logged in.
router.post('/', requireLogin, async (req, res) => {
  // Trim so a tweet of only spaces counts as empty.
  const text = (req.body.content || '').trim();

  // Validate: non-empty AND within the length limit. 400 = bad input.
  if (text.length === 0) {
    return res.status(400).json({ error: 'A tweet cannot be empty.' });
  }
  if (text.length > MAX_LENGTH) {
    return res
      .status(400)
      .json({ error: `A tweet must be ${MAX_LENGTH} characters or fewer.` });
  }

  try {
    const result = await db.query(
      'INSERT INTO posts (user_id, content) VALUES ($1, $2) RETURNING id, content, created_at',
      [req.session.userId, text]
    );
    // 201 = created. Return the new post so the frontend can show it.
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('Failed to create post:', err);
    res.status(500).json({ error: 'Could not create the tweet.' });
  }
});

// DELETE /api/posts/:id  -> delete a tweet. You may only delete your own.
router.delete('/:id', requireLogin, async (req, res) => {
  try {
    // Delete only if the post exists AND belongs to the logged-in user.
    // RETURNING id lets us tell "we deleted something" from "nothing matched".
    const result = await db.query(
      'DELETE FROM posts WHERE id = $1 AND user_id = $2 RETURNING id',
      [req.params.id, req.session.userId]
    );
    if (result.rowCount === 0) {
      // The post doesn't exist, or it isn't yours: 404 not found.
      return res.status(404).json({ error: 'Tweet not found.' });
    }
    res.status(204).end(); // 204 = success, no content to return
  } catch (err) {
    console.error('Failed to delete post:', err);
    res.status(500).json({ error: 'Could not delete the tweet.' });
  }
});

// POST /api/posts/:id/like  -> like a tweet. Must be logged in.
router.post('/:id/like', requireLogin, async (req, res) => {
  try {
    // Make sure the post exists first, so we can return a clean 404.
    const post = await db.query('SELECT id FROM posts WHERE id = $1', [req.params.id]);
    if (post.rowCount === 0) {
      return res.status(404).json({ error: 'Tweet not found.' });
    }

    // ON CONFLICT DO NOTHING: if the user already liked this post, the
    // UNIQUE(user_id, post_id) constraint blocks a duplicate row and we
    // simply treat it as success (liking twice should be harmless).
    await db.query(
      `INSERT INTO likes (user_id, post_id) VALUES ($1, $2)
       ON CONFLICT (user_id, post_id) DO NOTHING`,
      [req.session.userId, req.params.id]
    );
    res.status(201).json({ liked: true });
  } catch (err) {
    console.error('Failed to like post:', err);
    res.status(500).json({ error: 'Could not like the tweet.' });
  }
});

// DELETE /api/posts/:id/like  -> unlike a tweet. Must be logged in.
router.delete('/:id/like', requireLogin, async (req, res) => {
  try {
    const result = await db.query(
      'DELETE FROM likes WHERE user_id = $1 AND post_id = $2 RETURNING id',
      [req.session.userId, req.params.id]
    );
    if (result.rowCount === 0) {
      // There was no like to remove (the user hadn't liked it).
      return res.status(404).json({ error: 'You had not liked this tweet.' });
    }
    res.status(204).end();
  } catch (err) {
    console.error('Failed to unlike post:', err);
    res.status(500).json({ error: 'Could not unlike the tweet.' });
  }
});

module.exports = router;
