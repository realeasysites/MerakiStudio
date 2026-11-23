'use strict';
const path = require('path');
const fs = require('fs');
const Database = require('better-sqlite3');

const file = process.env.DB_PATH || path.join(__dirname, '..', 'db', 'meraki.sqlite');
fs.mkdirSync(path.dirname(file), { recursive: true });

const db = new Database(file);
db.pragma('journal_mode = WAL');

db.exec(`
  CREATE TABLE IF NOT EXISTS bookings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    name TEXT NOT NULL,
    phone TEXT,
    email TEXT,
    artist TEXT,
    services TEXT,
    client_type TEXT,
    preferred_days TEXT,
    preferred_time TEXT,
    notes TEXT,
    contact_pref TEXT,
    source TEXT,
    status TEXT NOT NULL DEFAULT 'new',
    admin_note TEXT
  );
  CREATE TABLE IF NOT EXISTS applications (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    name TEXT NOT NULL,
    phone TEXT,
    email TEXT,
    specialty TEXT,
    years TEXT,
    licensed TEXT,
    instagram TEXT,
    message TEXT,
    status TEXT NOT NULL DEFAULT 'new',
    admin_note TEXT
  );
`);

module.exports = db;
