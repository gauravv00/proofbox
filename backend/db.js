const path = require('path');
const fs = require('fs');
const Database = require('better-sqlite3');

// On serverless environments like Vercel, filesystem is read-only except /tmp
const isVercel = process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME;
const dbDir = isVercel ? '/tmp' : __dirname;
const dbPath = path.join(dbDir, 'proofbox.db');

const db = new Database(dbPath);

// Enable WAL mode and foreign key constraints
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

// Initialize database schema
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    password_hash TEXT NOT NULL,
    plan TEXT DEFAULT 'free',
    created_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS cases (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    title TEXT NOT NULL,
    dispute_type TEXT,
    opposing_party TEXT,
    claim_amount TEXT,
    status TEXT DEFAULT 'Active File',
    bates_prefix TEXT DEFAULT 'PB-',
    jurisdiction TEXT,
    description TEXT,
    notes TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS exhibits (
    id TEXT PRIMARY KEY,
    case_id TEXT NOT NULL,
    bates_number TEXT,
    title TEXT NOT NULL,
    category TEXT,
    timestamp TEXT,
    source_type TEXT,
    file_name TEXT,
    file_path TEXT,
    file_size TEXT,
    sha256 TEXT,
    sender TEXT,
    recipient TEXT,
    summary TEXT,
    relevance TEXT,
    exif_json TEXT,
    verified INTEGER DEFAULT 1,
    preview_type TEXT,
    created_at TEXT NOT NULL,
    FOREIGN KEY (case_id) REFERENCES cases(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS claims (
    id TEXT PRIMARY KEY,
    case_id TEXT NOT NULL,
    title TEXT NOT NULL,
    category TEXT,
    amount REAL DEFAULT 0,
    date TEXT,
    linked_exhibit_id TEXT,
    notes TEXT,
    is_deduction INTEGER DEFAULT 0,
    created_at TEXT NOT NULL,
    FOREIGN KEY (case_id) REFERENCES cases(id) ON DELETE CASCADE
  );

  CREATE INDEX IF NOT EXISTS idx_cases_user ON cases(user_id);
  CREATE INDEX IF NOT EXISTS idx_exhibits_case ON exhibits(case_id);
  CREATE INDEX IF NOT EXISTS idx_claims_case ON claims(case_id);
`);

// Seed default All-Access demo user: demo@proofboxlaw.in / demo123
try {
  const existingDemo = db.prepare('SELECT id FROM users WHERE email = ?').get('demo@proofboxlaw.in');
  if (!existingDemo) {
    const bcrypt = require('bcryptjs');
    const salt = bcrypt.genSaltSync(10);
    const hash = bcrypt.hashSync('demo123', salt);
    db.prepare(`
      INSERT INTO users (id, email, name, password_hash, plan, created_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run('user-demo-all-access', 'demo@proofboxlaw.in', 'Aisha Khan (Full Demo)', hash, 'professional', new Date().toISOString());
  }

  // Also maintain backwards compatibility for aisha@proofbox.app / password123
  const existingAisha = db.prepare('SELECT id FROM users WHERE email = ?').get('aisha@proofbox.app');
  if (!existingAisha) {
    const bcrypt = require('bcryptjs');
    const salt = bcrypt.genSaltSync(10);
    const hash = bcrypt.hashSync('password123', salt);
    db.prepare(`
      INSERT INTO users (id, email, name, password_hash, plan, created_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run('user-demo-001', 'aisha@proofbox.app', 'Aisha Khan', hash, 'pro', new Date().toISOString());
  }
} catch (e) {
  console.warn('Seeding demo accounts error:', e.message);
}

module.exports = db;
