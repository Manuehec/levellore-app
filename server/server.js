const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Middlewares
app.use(cors());
app.use(express.json({ limit: '10mb' }));

// Serve static front‑end from /client directory
app.use(express.static(path.join(__dirname, '..', 'client')));

// Persistent store file
const DATA_FILE = path.join(__dirname, 'data.json');
// In‑memory session tokens { token: username }
const sessions = {};

// Load data from file or initialize
let store = { users: {}, messages: [] };
try {
  if (fs.existsSync(DATA_FILE)) {
    const raw = fs.readFileSync(DATA_FILE, 'utf8');
    store = JSON.parse(raw);
  }
} catch (err) {
  console.error('Could not load data file:', err);
}

function saveStore() {
  try {
    fs.writeFileSync(DATA_FILE, JSON.stringify(store, null, 2));
  } catch (err) {
    console.error('Error saving store:', err);
  }
}

// Helper: compute level given total XP
function computeLevel(totalXP) {
  const BASE_XP = 100;
  let level = 1;
  let threshold = BASE_XP;
  let xp = totalXP;
  while (xp >= threshold) {
    xp -= threshold;
    level++;
    threshold += BASE_XP;
  }
  return { level, xpRemaining: xp, nextThreshold: threshold };
}

// Middleware: authenticate token
function authenticate(req, res, next) {
  const authHeader = req.headers.authorization || '';
  const token = authHeader.replace('Bearer ', '');
  if (!token || !sessions[token]) {
    return res.status(401).json({ message: 'Unauthorized' });
  }
  const username = sessions[token];
  const user = store.users[username];
  if (!user) {
    return res.status(401).json({ message: 'Unauthorized' });
  }
  req.user = user;
  req.username = username;
  req.token = token;
  next();
}

// POST /api/register { username, password }
app.post('/api/register', async (req, res) => {
  const { username, password } = req.body || {};
  if (!username || !password) {
    return res.status(400).json({ message: 'Username and password are required.' });
  }
  if (store.users[username]) {
    return res.status(409).json({ message: 'Username already exists.' });
  }
  // Hash password
  const salt = bcrypt.genSaltSync(10);
  const hashed = bcrypt.hashSync(password, salt);
  store.users[username] = {
    password: hashed,
    xp: 0,
    lastLoginDate: null,
    lastQuizDate: null,
    // Use an embedded coloured square as default profile picture. This avoids
    // missing asset errors when deploying without static image files.
    profilePic: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAADIAAAAyCAIAAACRXR/mAAAAT0lEQVR4nO3OMQHAIADAMJh/A3hCFAb29IIjUZA51h7v+W4H/mkVWoVWoVVoFVqFVqFVaBVahVahVWgVWoVWoVVoFVqFVqFVaBVahVahVRz/7AHJNzgsxgAAAABJRU5ErkJggg==',
  };
  saveStore();
  res.json({ message: 'Account created successfully.' });
});

// POST /api/login { username, password }
app.post('/api/login', (req, res) => {
  const { username, password } = req.body || {};
  const user = store.users[username];
  if (!user) {
    return res.status(401).json({ message: 'Invalid credentials.' });
  }
  const valid = bcrypt.compareSync(password, user.password);
  if (!valid) {
    return res.status(401).json({ message: 'Invalid credentials.' });
  }
  const token = uuidv4();
  sessions[token] = username;
  res.json({ token });
});

// GET /api/user
app.get('/api/user', authenticate, (req, res) => {
  const { xp, lastLoginDate, lastQuizDate, profilePic } = req.user;
  const levelInfo = computeLevel(xp);
  res.json({ username: req.username, xp, level: levelInfo.level, lastLoginDate, lastQuizDate, profilePic });
});

// Constants for XP amounts to avoid magic numbers inside handlers
const DAILY_LOGIN_XP = 10;
const QUIZ_XP = 50;

// POST /api/xp/daily-login
app.post('/api/xp/daily-login', authenticate, (req, res) => {
  const today = new Date().toISOString().slice(0, 10);
  if (req.user.lastLoginDate !== today) {
    req.user.xp += DAILY_LOGIN_XP;
    req.user.lastLoginDate = today;
    saveStore();
  }
  const levelInfo = computeLevel(req.user.xp);
  res.json({ xp: req.user.xp, level: levelInfo.level });
});

// POST /api/xp/quiz
app.post('/api/xp/quiz', authenticate, (req, res) => {
  const today = new Date().toISOString().slice(0, 10);
  if (req.user.lastQuizDate !== today) {
    req.user.xp += QUIZ_XP;
    req.user.lastQuizDate = today;
    saveStore();
    const levelInfo = computeLevel(req.user.xp);
    return res.json({ xp: req.user.xp, level: levelInfo.level, awarded: true });
  }
  const levelInfo = computeLevel(req.user.xp);
  res.json({ xp: req.user.xp, level: levelInfo.level, awarded: false });
});

// GET /api/chat
app.get('/api/chat', authenticate, (req, res) => {
  res.json(store.messages.slice(-100));
});

// POST /api/chat { text }
app.post('/api/chat', authenticate, (req, res) => {
  const { text } = req.body || {};
  if (!text || typeof text !== 'string' || text.trim() === '') {
    return res.status(400).json({ message: 'Message cannot be empty.' });
  }
  const message = { id: uuidv4(), username: req.username, text: text.trim(), timestamp: Date.now() };
  store.messages.push(message);
  saveStore();
  res.json({ message: 'Sent', data: message });
});

// POST /api/avatar { image } (base64 string)
app.post('/api/avatar', authenticate, (req, res) => {
  const { image } = req.body || {};
  if (!image || typeof image !== 'string') {
    return res.status(400).json({ message: 'Image data is required.' });
  }
  // Save base64 string directly to user record
  req.user.profilePic = image;
  saveStore();
  res.json({ profilePic: req.user.profilePic });
});

// Catch‑all to serve client index for unknown routes (for SPA)
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'client', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
