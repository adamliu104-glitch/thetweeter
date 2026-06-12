// app.js — all of BoonTweet's frontend logic, in one readable file.
//
// HOW THIS FILE IS ORGANIZED (read top to bottom):
//   1. FAKE DATA      – hardcoded tweets so the app works with NO backend.
//   2. DATA LAYER     – every function has a FAKE path and a REAL path.
//   3. APP STATE      – the few variables that describe "what's on screen".
//   4. RENDERING      – turn data into DOM elements.
//   5. ACTIONS        – respond to clicks/typing, then re-render.
//   6. STARTUP        – wire everything together when the page loads.

// =====================================================================
// 1. FAKE DATA
// ---------------------------------------------------------------------
// 👇👇👇  THE MOST IMPORTANT LINE IN THIS DEMO  👇👇👇
// While this is `true`, the whole app runs on the fake arrays below and
// never calls the server. Flip it to `false` and the SAME app suddenly
// talks to the real Express + Postgres backend. That single switch is the
// "fake data becomes live data" moment.
const USE_FAKE_DATA = false;
// 👆👆👆  now false: the app talks to the real Express + Postgres backend  👆👆👆

// A few pretend tweets. `let` (not `const`) because in fake mode we add to
// and remove from this array as you post, delete, and like.
// Shape matches exactly what GET /api/posts returns from the real server.
let FAKE_TWEETS = [
  {
    id: 3,
    username: "grace",
    content: "Just deployed my first app to Render 🎉",
    created_at: "2026-06-12T09:30:00Z",
    like_count: 4,
  },
  {
    id: 2,
    username: "ada",
    content: "Loops are just controlled repetition. Nothing scary about them.",
    created_at: "2026-06-12T08:15:00Z",
    like_count: 7,
  },
  {
    id: 1,
    username: "linus",
    content: "Talk is cheap. Show me the code.",
    created_at: "2026-06-11T20:00:00Z",
    like_count: 12,
  },
];

// In fake mode we pretend you're already logged in as this user, so the
// compose box works immediately with no server. The real backend replaces
// this with whoever actually logged in.
const FAKE_CURRENT_USER = { id: 99, username: "you", avatar: null };

// =====================================================================
// 2. DATA LAYER
// ---------------------------------------------------------------------
// These functions are the ONLY place the app reads or writes data.
// Each one is written twice: the fake version (in-memory arrays) and the
// real version (fetch() to our API). Keeping both side by side is what
// lets us flip USE_FAKE_DATA and watch the app go live.

// Small helper: pull a friendly message out of a failed API response.
async function readError(res) {
  try {
    const data = await res.json();
    return new Error(data.error || "Request failed.");
  } catch {
    return new Error("Request failed.");
  }
}

// ----- Auth -----------------------------------------------------------

// Who is logged in? Returns a user object, or null if nobody is.
async function apiMe() {
  if (USE_FAKE_DATA) {
    return FAKE_CURRENT_USER; // pretend we're already logged in
  }
  const res = await fetch("/api/auth/me");
  if (res.status === 401) return null; // not logged in is normal, not an error
  if (!res.ok) throw await readError(res);
  return res.json();
}

async function apiSignup(username, password) {
  if (USE_FAKE_DATA) {
    return { id: 99, username }; // pretend the account was created
  }
  const res = await fetch("/api/auth/signup", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password }),
  });
  if (!res.ok) throw await readError(res);
  return res.json();
}

async function apiLogin(username, password) {
  if (USE_FAKE_DATA) {
    return { id: 99, username };
  }
  const res = await fetch("/api/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password }),
  });
  if (!res.ok) throw await readError(res);
  return res.json();
}

async function apiLogout() {
  if (USE_FAKE_DATA) return;
  await fetch("/api/auth/logout", { method: "POST" });
}

// ----- Posts ----------------------------------------------------------

// Get the feed: every post, newest first.
async function apiGetFeed() {
  if (USE_FAKE_DATA) {
    // Return a copy so callers can't accidentally mutate our source array.
    return [...FAKE_TWEETS];
  }
  const res = await fetch("/api/posts");
  if (!res.ok) throw await readError(res);
  return res.json();
}

// Create a new tweet.
async function apiCreatePost(content) {
  if (USE_FAKE_DATA) {
    const newPost = {
      // next id = (highest existing id) + 1
      id: Math.max(0, ...FAKE_TWEETS.map((t) => t.id)) + 1,
      username: currentUser.username,
      content,
      created_at: new Date().toISOString(),
      like_count: 0,
    };
    FAKE_TWEETS.unshift(newPost); // add to the FRONT so it's newest-first
    return newPost;
  }
  const res = await fetch("/api/posts", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ content }),
  });
  if (!res.ok) throw await readError(res);
  return res.json();
}

// Delete one of your own tweets.
async function apiDeletePost(id) {
  if (USE_FAKE_DATA) {
    FAKE_TWEETS = FAKE_TWEETS.filter((t) => t.id !== id);
    return;
  }
  const res = await fetch(`/api/posts/${id}`, { method: "DELETE" });
  if (!res.ok) throw await readError(res);
}

// Like a tweet.
async function apiLike(id) {
  if (USE_FAKE_DATA) {
    const post = FAKE_TWEETS.find((t) => t.id === id);
    if (post) post.like_count += 1;
    return;
  }
  const res = await fetch(`/api/posts/${id}/like`, { method: "POST" });
  if (!res.ok) throw await readError(res);
}

// Unlike a tweet.
async function apiUnlike(id) {
  if (USE_FAKE_DATA) {
    const post = FAKE_TWEETS.find((t) => t.id === id);
    if (post) post.like_count = Math.max(0, post.like_count - 1);
    return;
  }
  const res = await fetch(`/api/posts/${id}/like`, { method: "DELETE" });
  if (!res.ok) throw await readError(res);
}

// Get one user's profile + their tweets.
async function apiGetProfile(username) {
  if (USE_FAKE_DATA) {
    const posts = FAKE_TWEETS.filter((t) => t.username === username);
    return {
      user: { username, bio: "", created_at: "2026-01-01T00:00:00Z" },
      posts,
    };
  }
  const res = await fetch(`/api/users/${encodeURIComponent(username)}`);
  if (!res.ok) throw await readError(res);
  return res.json();
}

// Set the current user's profile photo (pass a base64 data URL), or remove it
// (pass null). Returns { avatar } — the value now stored on the server.
async function apiSetAvatar(avatar) {
  if (USE_FAKE_DATA) {
    currentUser.avatar = avatar; // just update our pretend user
    return { avatar };
  }
  const res = await fetch("/api/users/me/avatar", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ avatar }),
  });
  if (!res.ok) throw await readError(res);
  return res.json();
}

// =====================================================================
// 3. APP STATE
// ---------------------------------------------------------------------
// currentUser  : the logged-in user object, or null.
// currentView  : what's on screen — the main feed, or someone's profile.
// likedPostIds : which posts THIS user has liked, so we can fill the heart.
//   (Note: this resets on a full page reload — a deliberate simplification.
//    The like COUNT always comes from the server and is always correct.)
let currentUser = null;
let currentView = { type: "feed" };
const likedPostIds = new Set();

// Grab the page elements we'll use repeatedly, once, up front.
const el = {
  userArea: document.getElementById("user-area"),
  authPanel: document.getElementById("auth-panel"),
  authForm: document.getElementById("auth-form"),
  authUsername: document.getElementById("auth-username"),
  authPassword: document.getElementById("auth-password"),
  authError: document.getElementById("auth-error"),
  signupBtn: document.getElementById("signup-btn"),
  compose: document.getElementById("compose"),
  tweetInput: document.getElementById("tweet-input"),
  charCount: document.getElementById("char-count"),
  postButton: document.getElementById("post-button"),
  feed: document.getElementById("feed"),
  profileHeader: document.getElementById("profile-header"),
  backHome: document.getElementById("back-home"),
  homeLink: document.getElementById("home-link"),
  banner: document.getElementById("banner"),
};

const MAX_LENGTH = 280;

// =====================================================================
// 4. RENDERING
// ---------------------------------------------------------------------
// These functions take data and update the page. They never call the
// server themselves — they just draw whatever they're given.

// Show a short message at the bottom of the screen, then fade it out.
let bannerTimer = null;
function showBanner(message, isError = false) {
  el.banner.textContent = message;
  el.banner.classList.toggle("error", isError);
  el.banner.classList.remove("hidden");
  clearTimeout(bannerTimer);
  bannerTimer = setTimeout(() => el.banner.classList.add("hidden"), 3000);
}

// Turn an ISO timestamp into a short, human label like "5m" or "2h".
function timeAgo(iso) {
  const seconds = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d`;
  return new Date(iso).toLocaleDateString(); // older than a week: show the date
}

// Read a chosen image File into a base64 "data URL" string. That string can be
// stored as-is and used directly as an <img src>. FileReader is callback-based,
// so we wrap it in a Promise to use it with async/await.
function fileToDataURL(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(new Error("Could not read that file."));
    reader.readAsDataURL(file);
  });
}

// Build a round avatar for a user. If they have a photo, show it; otherwise
// show a colored circle with their first initial.
//   user      : needs { username, avatar }
//   sizeClass : "" | "avatar-sm" | "avatar-lg"
function avatarElement(user, sizeClass = "") {
  if (user.avatar) {
    const img = document.createElement("img");
    img.className = `avatar ${sizeClass}`;
    img.src = user.avatar;
    img.alt = `${user.username}'s photo`;
    return img;
  }
  const circle = document.createElement("div");
  circle.className = `avatar avatar-placeholder ${sizeClass}`;
  circle.textContent = user.username[0] || "?";
  return circle;
}

// Build the "change your photo" controls shown only on your OWN profile:
// a file picker (+ a Remove button if you already have a photo).
function buildAvatarUploader(user) {
  const wrap = document.createElement("div");
  wrap.className = "avatar-upload";

  const input = document.createElement("input");
  input.type = "file";
  input.accept = "image/*"; // hint the OS to show images only

  const status = document.createElement("span");
  status.className = "muted";

  // Largest file we'll accept. The server enforces its own limit too, but
  // checking here gives instant feedback and avoids a wasted upload.
  const MAX_FILE_BYTES = 1024 * 1024; // 1 MB

  input.addEventListener("change", async () => {
    const file = input.files[0];
    if (!file) return;
    if (file.size > MAX_FILE_BYTES) {
      status.textContent = "That image is over 1 MB — please pick a smaller one.";
      input.value = "";
      return;
    }
    try {
      status.textContent = "Uploading…";
      const dataUrl = await fileToDataURL(file); // image -> base64 string
      const saved = await apiSetAvatar(dataUrl); // store it on the server
      currentUser.avatar = saved.avatar; // keep our local copy in sync
      renderUserArea(); // refresh the top-bar avatar
      await showProfile(user.username); // redraw the profile with the new photo
      showBanner("Photo updated.");
    } catch (err) {
      status.textContent = err.message;
    }
  });

  wrap.append(input, status);

  // Only offer "Remove" when there's actually a photo to remove.
  if (user.avatar) {
    const remove = document.createElement("button");
    remove.className = "secondary";
    remove.textContent = "Remove photo";
    remove.addEventListener("click", async () => {
      try {
        await apiSetAvatar(null);
        currentUser.avatar = null;
        renderUserArea();
        await showProfile(user.username);
        showBanner("Photo removed.");
      } catch (err) {
        status.textContent = err.message;
      }
    });
    wrap.append(remove);
  }

  return wrap;
}

// Update the top-right area based on whether someone is logged in.
function renderUserArea() {
  el.userArea.innerHTML = ""; // clear whatever was there

  if (currentUser) {
    // A small avatar that also links to your own profile.
    const pic = avatarElement(currentUser, "avatar-sm");
    pic.style.cursor = "pointer";
    pic.addEventListener("click", () => showProfile(currentUser.username));

    // "@username" links to your own profile.
    const name = document.createElement("a");
    name.className = "tweet-author";
    name.textContent = "@" + currentUser.username;
    name.href = "#";
    name.addEventListener("click", (e) => {
      e.preventDefault();
      showProfile(currentUser.username);
    });

    const logout = document.createElement("button");
    logout.className = "secondary";
    logout.textContent = "Log out";
    logout.addEventListener("click", handleLogout);

    el.userArea.append(pic, name, logout);
  }

  // Logged in -> show compose, hide the login form (and vice-versa).
  el.compose.classList.toggle("hidden", !currentUser);
  el.authPanel.classList.toggle("hidden", !!currentUser);
}

// Build the DOM for a single tweet.
//
// IMPORTANT: we set user text with .textContent, never .innerHTML. That
// way, if someone tweets "<script>...", it shows up as literal text instead
// of running as code. (This is the browser-side cousin of the parameterized
// queries we use on the server — never treat user input as code.)
function renderTweet(post) {
  const article = document.createElement("article");
  article.className = "tweet";

  // --- head: @author + timestamp ---
  const head = document.createElement("div");
  head.className = "tweet-head";

  const author = document.createElement("a");
  author.className = "tweet-author";
  author.textContent = "@" + post.username;
  author.href = "#";
  author.addEventListener("click", (e) => {
    e.preventDefault();
    showProfile(post.username);
  });

  const time = document.createElement("span");
  time.className = "tweet-time";
  time.textContent = timeAgo(post.created_at);

  // Small avatar at the start of the row. `post` carries { username, avatar }
  // straight from the feed query, so avatarElement can use it directly.
  const pic = avatarElement(post, "avatar-sm");
  pic.style.cursor = "pointer";
  pic.addEventListener("click", () => showProfile(post.username));

  head.append(pic, author, time);

  // --- content ---
  const content = document.createElement("p");
  content.className = "tweet-content";
  content.textContent = post.content;

  // --- actions: like (+ delete on your own posts) ---
  const actions = document.createElement("div");
  actions.className = "tweet-actions";

  const likeButton = document.createElement("button");
  likeButton.className = "like-button";
  const liked = likedPostIds.has(post.id);
  likeButton.classList.toggle("liked", liked);
  likeButton.textContent = `${liked ? "♥" : "♡"} ${post.like_count}`;
  likeButton.addEventListener("click", () => handleLikeToggle(post.id));
  actions.append(likeButton);

  // Only show Delete on tweets the logged-in user wrote.
  if (currentUser && currentUser.username === post.username) {
    const deleteButton = document.createElement("button");
    deleteButton.className = "delete-button";
    deleteButton.textContent = "Delete";
    deleteButton.addEventListener("click", () => handleDelete(post.id));
    actions.append(deleteButton);
  }

  article.append(head, content, actions);
  return article;
}

// Draw a list of tweets into the feed area (replacing what was there).
function renderFeed(posts) {
  el.feed.innerHTML = "";
  if (posts.length === 0) {
    const empty = document.createElement("p");
    empty.className = "empty";
    empty.textContent = "No tweets yet. Be the first!";
    el.feed.append(empty);
    return;
  }
  for (const post of posts) {
    el.feed.append(renderTweet(post));
  }
}

// =====================================================================
// 5. ACTIONS
// ---------------------------------------------------------------------
// Event handlers. Each one calls the DATA LAYER, then refreshes the view.

// Show the main feed (home).
async function showFeed() {
  currentView = { type: "feed" };
  el.profileHeader.classList.add("hidden");
  el.backHome.classList.add("hidden");
  el.compose.classList.toggle("hidden", !currentUser);
  try {
    const posts = await apiGetFeed();
    renderFeed(posts);
  } catch (err) {
    showBanner(err.message, true);
  }
}

// Show one user's profile and their tweets.
async function showProfile(username) {
  currentView = { type: "profile", username };
  try {
    const { user, posts } = await apiGetProfile(username);

    // Profile header: big avatar next to the handle + tweet count.
    el.profileHeader.innerHTML = "";

    const top = document.createElement("div");
    top.className = "profile-top";

    const pic = avatarElement(user, "avatar-lg");

    const info = document.createElement("div");
    const title = document.createElement("h2");
    title.textContent = "@" + user.username;
    const meta = document.createElement("p");
    meta.className = "muted";
    meta.textContent = `${posts.length} tweet${posts.length === 1 ? "" : "s"}`;
    info.append(title, meta);

    top.append(pic, info);
    el.profileHeader.append(top);

    // Only on your OWN profile: show the controls to change your photo.
    if (currentUser && currentUser.username === user.username) {
      el.profileHeader.append(buildAvatarUploader(user));
    }

    el.profileHeader.classList.remove("hidden");

    // On a profile we hide the compose box and show the "back" link.
    el.compose.classList.add("hidden");
    el.backHome.classList.remove("hidden");

    renderFeed(posts);
  } catch (err) {
    showBanner(err.message, true);
  }
}

// After any change (new post, like, delete) re-draw whatever view we're on,
// so counts and lists always reflect the latest data.
async function refreshCurrentView() {
  if (currentView.type === "profile") {
    await showProfile(currentView.username);
  } else {
    await showFeed();
  }
}

// Log in OR sign up (same form, two buttons). `mode` is "login" or "signup".
async function handleAuth(mode) {
  const username = el.authUsername.value.trim();
  const password = el.authPassword.value;
  el.authError.textContent = "";

  if (!username || !password) {
    el.authError.textContent = "Please enter a username and password.";
    return;
  }

  try {
    // First establish the session (this sets the login cookie)...
    if (mode === "signup") {
      await apiSignup(username, password);
    } else {
      await apiLogin(username, password);
    }
    // ...then load the full user record, which includes their avatar.
    currentUser = await apiMe();
    el.authPassword.value = "";
    renderUserArea();
    await showFeed();
    showBanner(mode === "signup" ? "Account created!" : "Welcome back!");
  } catch (err) {
    el.authError.textContent = err.message;
  }
}

async function handleLogout() {
  try {
    await apiLogout();
  } finally {
    // Whether or not the request succeeded, drop the user locally.
    currentUser = null;
    likedPostIds.clear();
    renderUserArea();
    await showFeed();
  }
}

async function handlePost() {
  const content = el.tweetInput.value.trim();
  if (!content) {
    showBanner("A tweet cannot be empty.", true);
    return;
  }
  try {
    await apiCreatePost(content);
    el.tweetInput.value = "";
    updateCharCount(); // reset the counter back to 280
    await showFeed(); // posting always happens from the home feed
  } catch (err) {
    showBanner(err.message, true);
  }
}

async function handleLikeToggle(postId) {
  if (!currentUser) {
    showBanner("Log in to like tweets.", true);
    return;
  }
  try {
    if (likedPostIds.has(postId)) {
      await apiUnlike(postId);
      likedPostIds.delete(postId);
    } else {
      await apiLike(postId);
      likedPostIds.add(postId);
    }
    await refreshCurrentView();
  } catch (err) {
    showBanner(err.message, true);
  }
}

async function handleDelete(postId) {
  if (!confirm("Delete this tweet?")) return;
  try {
    await apiDeletePost(postId);
    await refreshCurrentView();
    showBanner("Tweet deleted.");
  } catch (err) {
    showBanner(err.message, true);
  }
}

// Keep the "characters left" counter in sync as the user types.
function updateCharCount() {
  const remaining = MAX_LENGTH - el.tweetInput.value.length;
  el.charCount.textContent = remaining;
  // Warn (turn red) when getting close to the limit.
  el.charCount.classList.toggle("warn", remaining <= 20);
}

// =====================================================================
// 6. STARTUP
// ---------------------------------------------------------------------
// Connect the page's buttons/inputs to the handlers above, then load data.

function wireUpEvents() {
  // Auth form: Enter or the "Log in" button logs in; "Sign up" signs up.
  el.authForm.addEventListener("submit", (e) => {
    e.preventDefault(); // stop the browser from reloading the page
    handleAuth("login");
  });
  el.signupBtn.addEventListener("click", () => handleAuth("signup"));

  // Compose.
  el.postButton.addEventListener("click", handlePost);
  el.tweetInput.addEventListener("input", updateCharCount);

  // Navigation: the logo and the back link both return to the feed.
  el.homeLink.addEventListener("click", showFeed);
  el.backHome.addEventListener("click", (e) => {
    e.preventDefault();
    showFeed();
  });
}

// The app's entry point: figure out who's logged in, then show the feed.
async function init() {
  wireUpEvents();
  try {
    currentUser = await apiMe();
  } catch {
    currentUser = null; // treat any error as "logged out"
  }
  renderUserArea();
  await showFeed();
}

init();
