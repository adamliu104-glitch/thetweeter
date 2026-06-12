// src/routes/users.js
// Public profile pages: a user's basic info plus the tweets they wrote.

const express = require('express');
const db = require('../db');
const { requireLogin } = require('./auth'); // reuse the "must be logged in" guard

const router = express.Router();

// GET /api/users/:username  -> the profile for one user, newest tweets first.
// Anyone can view a profile, so this route does NOT require login.
router.get('/:username', async (req, res) => {
  try {
    // 1) Look up the user by their (unique) username.
    const userResult = await db.query(
      'SELECT id, username, bio, avatar, created_at FROM users WHERE username = $1',
      [req.params.username]
    );
    if (userResult.rowCount === 0) {
      return res.status(404).json({ error: 'User not found.' });
    }
    const user = userResult.rows[0];

    // 2) Load that user's posts, with like counts, newest first.
    //    Same shape as the main feed so the frontend can reuse its renderer.
    const postsResult = await db.query(
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
       WHERE posts.user_id = $1
       GROUP BY posts.id, users.username, users.avatar
       ORDER BY posts.created_at DESC`,
      [user.id]
    );

    res.json({ user, posts: postsResult.rows });
  } catch (err) {
    console.error('Failed to load profile:', err);
    res.status(500).json({ error: 'Could not load the profile.' });
  }
});

// PUT /api/users/me/avatar  -> set (or clear) the logged-in user's photo.
//
// The frontend reads the chosen image file in the browser and turns it into a
// base64 "data URL" string (e.g. "data:image/png;base64,iVBORw0..."). We store
// that whole string in the users.avatar column and later use it directly as an
// <img src>. No files on disk, so it also survives Render's redeploys.
//
// The largest the data URL may be. Base64 is ~33% bigger than the raw image,
// so ~1.4 million characters is roughly a 1 MB photo. This protects the
// database from giant uploads. (The frontend also checks the file size.)
const MAX_AVATAR_CHARS = 1_400_000;

router.put('/me/avatar', requireLogin, async (req, res) => {
  const { avatar } = req.body;

  // Sending null or an empty string means "remove my photo".
  if (avatar === null || avatar === '') {
    await db.query('UPDATE users SET avatar = NULL WHERE id = $1', [req.session.userId]);
    return res.json({ avatar: null });
  }

  // Otherwise it must look like an image data URL, and not be too large.
  if (typeof avatar !== 'string' || !avatar.startsWith('data:image/')) {
    return res.status(400).json({ error: 'Avatar must be an image.' });
  }
  if (avatar.length > MAX_AVATAR_CHARS) {
    return res.status(400).json({ error: 'Image is too large. Please pick one under 1 MB.' });
  }

  try {
    const result = await db.query(
      'UPDATE users SET avatar = $1 WHERE id = $2 RETURNING avatar',
      [avatar, req.session.userId]
    );
    res.json({ avatar: result.rows[0].avatar });
  } catch (err) {
    console.error('Failed to save avatar:', err);
    res.status(500).json({ error: 'Could not save your photo.' });
  }
});

module.exports = router;
