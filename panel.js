require('dotenv').config();
const express = require('express');
const session = require('express-session');
const SQLiteStore = require('connect-sqlite3')(session);
const path = require('path');
const fs = require('fs');

const app = express();

// Ensure session directory exists
const sessionDir = path.join(__dirname, 'session_db');
if (!fs.existsSync(sessionDir)) {
  fs.mkdirSync(sessionDir, { recursive: true });
}

// Middleware
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

app.use(session({
  key: 'shadow.sid',
  secret: process.env.SESSION_SECRET || 'fallbacksecret',
  resave: false,
  saveUninitialized: false,
  store: new SQLiteStore({
    db: 'sessions.db',
    dir: sessionDir,
    concurrentDB: true,
  }),
}));

// View engine setup
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Routes
app.use('/auth/login', require('./routes/auth/login'));
app.get('/', (req, res) => res.redirect('/auth/login'));
app.use('/dashboard', require('./routes/dashboard'));
app.use('/my/account', require('./routes/account'));
  process.on('exit', (code) => {
  console.log('Process exit event with code:', code);
});
process.on('uncaughtException', (err) => {
  console.error('Uncaught exception:', err);
});
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled rejection:', reason);
});
// Start server
const port = process.env.PORT || 90;
app.listen(port, () => {
  console.log(`ShadowPanel running on http://localhost:${port}`);
setInterval(() => {}, 1000);


});
