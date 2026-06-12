# TheTweeter

A minimal Twitter clone built for a class project. The goal is **clarity and
learnability**: plain HTML/CSS/vanilla JavaScript on the front end, Node.js +
Express + PostgreSQL on the back end, and generous comments throughout that
explain *why*, not just *what*.

[![Deploy to Render](https://render.com/images/deploy-to-render-button.svg)](https://render.com/deploy?repo=https://github.com/adamliu104-glitch/thetweeter)

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

# 3. Create your local environment file from the example
cp .env.example .env
#    The defaults in .env already work for a standard local Postgres.
#    Open .env and adjust DATABASE_URL only if your setup is different.

# 4. Start the server — it creates the tables automatically on first run
npm start
```

Now open **http://localhost:3000**. Because there are no seeded accounts,
**sign up first** (pick any username + password), then start tweeting.

> **No manual schema step needed.** On startup the app runs `schema.sql` for
> you (it uses `CREATE TABLE IF NOT EXISTS`, so it's safe every time). If you'd
> rather load it by hand, you still can: `psql boontweet -f schema.sql`.
> To wipe your local data, drop and recreate: `dropdb boontweet && createdb boontweet`.

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
> Now `createdb` and `psql` will be found, and you can run the steps above.

---

## Project structure

```
thetweeter/
├── public/              # Front end (served as static files by Express)
│   ├── index.html       # Page layout: auth form, compose box, feed
│   ├── style.css        # Hand-written CSS, no framework
│   └── app.js           # All client logic (fake data + real fetch calls)
├── src/
│   ├── server.js        # Express app: middleware, routes, static files, start
│   ├── db.js            # Shared PostgreSQL pool + startup schema setup
│   └── routes/
│       ├── auth.js      # signup / login / logout / me  + the login guard
│       ├── posts.js     # the feed and all tweet actions
│       └── users.js     # public profiles + avatar upload
├── schema.sql           # CREATE TABLE statements (auto-loaded on startup)
├── render.yaml          # Render Blueprint: web service + database, auto-wired
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

This repo includes a [`render.yaml`](render.yaml) **Blueprint**, so Render can
create the web service *and* the PostgreSQL database for you, already wired
together — and the app sets up its own tables on first boot.

### Deploy with the Blueprint (recommended)

**One click:**
[![Deploy to Render](https://render.com/images/deploy-to-render-button.svg)](https://render.com/deploy?repo=https://github.com/adamliu104-glitch/thetweeter)
— opens Render with this repo's blueprint pre-loaded; review the plan and click
**Apply**. It creates the web service + database and wires `DATABASE_URL` for you.

Or step by step:

1. Push this repo to GitHub (already done if you cloned it from there).
2. In the [Render dashboard](https://dashboard.render.com): **New + → Blueprint**.
3. Connect this repository. Render reads `render.yaml` and shows you a plan: a
   web service (`thetweeter`) and a database (`thetweeter-db`).
4. Click **Apply**. Render then:
   - creates the database,
   - builds the web service (`npm install`),
   - injects `DATABASE_URL` (from the database) and a generated `SESSION_SECRET`,
   - starts it (`npm start`), at which point **the app creates its own tables**.
5. Open the web service's URL, sign up, and you're live.

> Both services are pinned to the **same region** (`oregon`) in `render.yaml` so
> they talk over Render's fast private network — change both together if you
> want a different one. The free database tier is perfect for a demo but expires
> after ~30 days.

### Manual alternative (no Blueprint)

Prefer to click through it yourself? Create a **Postgres** instance and a **Web
Service** from the same repo, in the **same region**, then on the web service set:

- **Build Command:** `npm install`
- **Start Command:** `npm start`
- **Environment →** `DATABASE_URL` = the database's **Internal Database URL**,
  and `SESSION_SECRET` = any long random string. (Leave `PORT` alone — Render
  sets it.)

You do **not** need to load `schema.sql` by hand — the app does it on startup.

> **Notes for the curious:**
> - `src/db.js` turns on SSL automatically for any non-localhost database (which
>   Render's managed Postgres requires) and runs `schema.sql` on boot — safe to
>   repeat thanks to `CREATE TABLE IF NOT EXISTS`.
> - Login sessions are kept in memory, so they reset whenever the service
>   restarts (fine for a class project). A production app would store sessions
>   in the database instead.
