# BoonTweet

A minimal Twitter clone built for a class project. The goal is **clarity and
learnability**: plain HTML/CSS/vanilla JavaScript on the front end, Node.js +
Express + PostgreSQL on the back end, and generous comments throughout that
explain *why*, not just *what*.

## Features

- Post a tweet (1–280 characters)
- A feed of all tweets, newest first, showing the author and like count
- Like / unlike a tweet
- Sign up, log in, log out (passwords stored as bcrypt hashes)
- User profiles (a user's tweets at `/api/users/:username`)

---

## Two ways to run it

This project is built so you can demo the front end **before** the back end
exists, then switch to the real server by flipping a single flag.

### A) Front end only — no backend, no database

Just open the page in a browser:

```bash
open public/index.html        # macOS
# or double-click public/index.html in your file explorer
```

It runs on a hardcoded array of fake tweets (see the top of
[`public/app.js`](public/app.js)). You can post, like, delete, and view
profiles — all in memory. Great for showing the UI on its own.

### B) The full app — Express + PostgreSQL

This is the real thing. Follow the setup below, then flip the data source:

> In [`public/app.js`](public/app.js), change the flag near the top:
>
> ```js
> const USE_FAKE_DATA = false;   // was true
> ```
>
> That one line is the moment the app stops using fake data and starts
> talking to the live server. Every data function has a fake path and a real
> `fetch()` path side by side, so you can read exactly what changes.

---

## Local setup (full app)

**Prerequisites:** [Node.js](https://nodejs.org) (v18+) and
[PostgreSQL](https://www.postgresql.org/download/) installed and running.

Run these commands from the project root, in order:

```bash
# 1. Install the dependencies listed in package.json
npm install

# 2. Create the database (Postgres must be running)
createdb boontweet

# 3. Load the schema — creates the users, posts, and likes tables
psql boontweet -f schema.sql

# 4. Create your local environment file from the example
cp .env.example .env
#    The defaults in .env already work for a standard local Postgres.
#    Open .env and adjust DATABASE_URL only if your setup is different.

# 5. Start the server
npm start
```

Now open **http://localhost:3000**. Because there are no seeded accounts,
**sign up first** (pick any username + password), then start tweeting.

> **Don't have PostgreSQL yet? (macOS + Homebrew)**
>
> ```bash
> brew install postgresql@16
> brew services start postgresql@16          # starts it now + on every login
> # postgresql@16 is "keg-only", so add its tools to your PATH:
> echo 'export PATH="/opt/homebrew/opt/postgresql@16/bin:$PATH"' >> ~/.zshrc
> source ~/.zshrc                             # or open a new terminal
> ```
>
> Now `createdb` and `psql` will be found, and you can run steps 2–3 above.

---

## Project structure

```
boontweet/
├── public/              # Front end (served as static files by Express)
│   ├── index.html       # Page layout: auth form, compose box, feed
│   ├── style.css        # Hand-written CSS, no framework
│   └── app.js           # All client logic (fake data + real fetch calls)
├── src/
│   ├── server.js        # Express app: middleware, routes, static files, start
│   ├── db.js            # One shared PostgreSQL connection pool
│   └── routes/
│       ├── auth.js      # signup / login / logout / me  + the login guard
│       ├── posts.js     # the feed and all tweet actions
│       └── users.js     # public profiles
├── schema.sql           # CREATE TABLE statements (run once)
├── .env.example         # Template for PORT, DATABASE_URL, SESSION_SECRET
├── package.json         # Dependencies + the "start" script
└── README.md
```

---

## API reference

All responses are JSON. Actions that change data require you to be logged in
(the server reads your identity from the session cookie, so the client never
sends a user id).

| Method   | Route                    | Purpose                                   | Success | Errors          |
| -------- | ------------------------ | ----------------------------------------- | ------- | --------------- |
| `POST`   | `/api/auth/signup`       | Create an account and log in              | 201     | 400, 409        |
| `POST`   | `/api/auth/login`        | Log in                                    | 200     | 400, 401        |
| `POST`   | `/api/auth/logout`       | Log out                                   | 204     |                 |
| `GET`    | `/api/auth/me`           | Who am I?                                  | 200     | 401             |
| `GET`    | `/api/posts`             | Feed, newest first (username + like_count) | 200     |                 |
| `POST`   | `/api/posts`             | Create a tweet (non-empty, ≤280 chars)    | 201     | 400, 401        |
| `DELETE` | `/api/posts/:id`         | Delete your own tweet                     | 204     | 401, 404        |
| `POST`   | `/api/posts/:id/like`    | Like a tweet                              | 201     | 401, 404        |
| `DELETE` | `/api/posts/:id/like`    | Unlike a tweet                            | 204     | 401, 404        |
| `GET`    | `/api/users/:username`   | A user's profile + their tweets           | 200     | 404             |

---

## Deploy to Render

Render gives you a web service and a managed PostgreSQL database that talk to
each other. The two **must be in the same region**.

### 1. Push your code to GitHub

Render deploys from a Git repository, so commit and push this project to a
GitHub repo first.

### 2. Create the PostgreSQL database

1. In the [Render dashboard](https://dashboard.render.com), click
   **New → Postgres**.
2. Give it a name (e.g. `boontweet-db`) and **note the Region** you pick —
   you'll use the same one for the web service.
3. Create it, then open it and copy two things from the **Connections** panel:
   - the **Internal Database URL** (used by your web service)
   - the **External Database URL** (used once, from your laptop, to load the schema)

### 3. Load the schema once

From your own machine, run the schema against the new database using the
**External** URL you just copied:

```bash
psql "PASTE_EXTERNAL_DATABASE_URL_HERE" -f schema.sql
```

This creates the `users`, `posts`, and `likes` tables. You only do this once.

### 4. Create the web service

1. Click **New → Web Service** and connect your GitHub repo.
2. **Region:** choose the **same region** as your database (important — this
   lets them use the fast internal network).
3. **Build Command:** `npm install`
4. **Start Command:** `npm start`
5. Under **Environment**, add these variables:
   - `DATABASE_URL` → paste the **Internal Database URL** from step 2.
   - `SESSION_SECRET` → any long, random string.
   - (You do **not** set `PORT` — Render provides it automatically, and the
     app already reads it.)
6. Click **Create Web Service**.

Render installs the dependencies, starts the server, and gives you a public
URL. Open it, sign up, and you're live.

> **Notes for the curious:**
> - `src/db.js` turns on SSL automatically for any non-localhost database, which
>   is what Render's managed Postgres requires.
> - Login sessions are kept in memory, so they reset whenever the service
>   restarts (fine for a class project). A production app would store sessions
>   in the database instead.
