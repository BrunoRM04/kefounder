import { DatabaseSync } from 'node:sqlite';
import fs from 'node:fs';
import path from 'node:path';

const SCHEMA = `
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  email TEXT NOT NULL UNIQUE COLLATE NOCASE,
  password_hash TEXT NOT NULL,
  name TEXT NOT NULL,
  headline TEXT NOT NULL DEFAULT '',
  photo TEXT NOT NULL DEFAULT '',
  accent TEXT NOT NULL DEFAULT '#D4E0DA',
  city TEXT NOT NULL DEFAULT '',
  country TEXT NOT NULL DEFAULT '',
  bio TEXT NOT NULL DEFAULT '',
  goal TEXT NOT NULL DEFAULT '',
  roles TEXT NOT NULL DEFAULT '[]',
  skills TEXT NOT NULL DEFAULT '[]',
  interests TEXT NOT NULL DEFAULT '[]',
  languages TEXT NOT NULL DEFAULT '[]',
  availability TEXT NOT NULL DEFAULT '',
  compensation TEXT NOT NULL DEFAULT '',
  looking_for TEXT NOT NULL DEFAULT '',
  work_mode TEXT NOT NULL DEFAULT 'remote',
  experience_years INTEGER,
  experience TEXT NOT NULL DEFAULT '[]',
  age INTEGER,
  show_age INTEGER NOT NULL DEFAULT 1,
  linkedin TEXT NOT NULL DEFAULT '',
  github TEXT NOT NULL DEFAULT '',
  portfolio TEXT NOT NULL DEFAULT '',
  timezone TEXT NOT NULL DEFAULT '',
  plan TEXT NOT NULL DEFAULT 'free',
  plan_period TEXT,
  plan_renews_at TEXT,
  onboarded INTEGER NOT NULL DEFAULT 0,
  email_verified INTEGER NOT NULL DEFAULT 0,
  identity_verified INTEGER NOT NULL DEFAULT 0,
  visible INTEGER NOT NULL DEFAULT 1,
  settings TEXT NOT NULL DEFAULT '{}',
  is_demo INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL,
  last_active_at TEXT
);

CREATE TABLE IF NOT EXISTS sessions (
  token_hash TEXT PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TEXT NOT NULL,
  expires_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS projects (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  owner_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  tagline TEXT NOT NULL DEFAULT '',
  description TEXT NOT NULL DEFAULT '',
  problem TEXT NOT NULL DEFAULT '',
  solution TEXT NOT NULL DEFAULT '',
  stage TEXT NOT NULL DEFAULT 'idea',
  industry TEXT NOT NULL DEFAULT '',
  city TEXT NOT NULL DEFAULT '',
  country TEXT NOT NULL DEFAULT '',
  work_mode TEXT NOT NULL DEFAULT 'remote',
  website TEXT NOT NULL DEFAULT '',
  cover TEXT NOT NULL DEFAULT '',
  logo TEXT NOT NULL DEFAULT '',
  accent TEXT NOT NULL DEFAULT '#D4E0DA',
  roles_needed TEXT NOT NULL DEFAULT '[]',
  dedication TEXT NOT NULL DEFAULT 'exploring',
  compensation TEXT NOT NULL DEFAULT 'talk',
  stack TEXT NOT NULL DEFAULT '[]',
  team TEXT NOT NULL DEFAULT '[]',
  has_users INTEGER NOT NULL DEFAULT 0,
  has_revenue INTEGER NOT NULL DEFAULT 0,
  has_investment INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'draft',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  published_at TEXT
);
CREATE INDEX IF NOT EXISTS idx_projects_owner ON projects(owner_id);
CREATE INDEX IF NOT EXISTS idx_projects_status ON projects(status);

CREATE TABLE IF NOT EXISTS views (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  viewer_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  target_type TEXT NOT NULL,
  target_id INTEGER NOT NULL,
  created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_views_target ON views(target_type, target_id, created_at);
CREATE INDEX IF NOT EXISTS idx_views_viewer ON views(viewer_id, created_at);

CREATE TABLE IF NOT EXISTS passes (
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  target_type TEXT NOT NULL,
  target_id INTEGER NOT NULL,
  created_at TEXT NOT NULL,
  PRIMARY KEY (user_id, target_type, target_id)
);

CREATE TABLE IF NOT EXISTS saves (
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  target_type TEXT NOT NULL,
  target_id INTEGER NOT NULL,
  created_at TEXT NOT NULL,
  PRIMARY KEY (user_id, target_type, target_id)
);
CREATE INDEX IF NOT EXISTS idx_saves_target ON saves(target_type, target_id);

CREATE TABLE IF NOT EXISTS interests (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  from_user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  to_user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  target_type TEXT NOT NULL,
  target_id INTEGER NOT NULL,
  project_id INTEGER REFERENCES projects(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  note TEXT NOT NULL DEFAULT '',
  pipeline TEXT NOT NULL DEFAULT 'new',
  created_at TEXT NOT NULL,
  responded_at TEXT,
  UNIQUE (from_user_id, target_type, target_id)
);
CREATE INDEX IF NOT EXISTS idx_interests_to ON interests(to_user_id, status);

CREATE TABLE IF NOT EXISTS matches (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_a INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  user_b INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  project_id INTEGER REFERENCES projects(id) ON DELETE SET NULL,
  origin TEXT NOT NULL DEFAULT 'match',
  initiator_id INTEGER,
  created_at TEXT NOT NULL,
  last_message_at TEXT,
  archived_a INTEGER NOT NULL DEFAULT 0,
  archived_b INTEGER NOT NULL DEFAULT 0,
  blocked_by INTEGER,
  UNIQUE (user_a, user_b)
);

CREATE TABLE IF NOT EXISTS messages (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  match_id INTEGER NOT NULL REFERENCES matches(id) ON DELETE CASCADE,
  sender_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  kind TEXT NOT NULL DEFAULT 'text',
  body TEXT NOT NULL DEFAULT '',
  meta TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL,
  read_at TEXT
);
CREATE INDEX IF NOT EXISTS idx_messages_match ON messages(match_id, id);

CREATE TABLE IF NOT EXISTS notifications (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  actor_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  project_id INTEGER REFERENCES projects(id) ON DELETE CASCADE,
  match_id INTEGER REFERENCES matches(id) ON DELETE CASCADE,
  data TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL,
  read_at TEXT
);
CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id, created_at);

CREATE TABLE IF NOT EXISTS blocks (
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  blocked_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TEXT NOT NULL,
  PRIMARY KEY (user_id, blocked_id)
);

CREATE TABLE IF NOT EXISTS reports (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  reporter_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  target_type TEXT NOT NULL,
  target_id INTEGER NOT NULL,
  reason TEXT NOT NULL,
  details TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS subscriptions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  plan TEXT NOT NULL,
  period TEXT NOT NULL,
  amount REAL NOT NULL,
  status TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS uploads (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  filename TEXT NOT NULL,
  original_name TEXT NOT NULL,
  mime TEXT NOT NULL,
  size INTEGER NOT NULL,
  created_at TEXT NOT NULL
);
`;

// node:sqlite no acepta booleanos ni undefined como parámetros.
const normalize = (value) => {
  if (value === undefined) return null;
  if (typeof value === 'boolean') return value ? 1 : 0;
  return value;
};

const normalizeParams = (params) => {
  if (params === undefined) return [];
  if (Array.isArray(params)) return params.map(normalize);
  const out = {};
  for (const [key, value] of Object.entries(params)) out[key] = normalize(value);
  return [out];
};

// Migraciones versionadas: cada una corre una sola vez, en orden, y queda registrada en
// schema_migrations. Para cambiar la estructura se agrega una nueva al final; nunca se editan.
const MIGRATIONS = [
  {
    id: '2026-10-01-administracion',
    up: `
      ALTER TABLE users ADD COLUMN role TEXT NOT NULL DEFAULT 'user';
      ALTER TABLE users ADD COLUMN segment TEXT NOT NULL DEFAULT 'real';
      ALTER TABLE users ADD COLUMN status TEXT NOT NULL DEFAULT 'active';
      ALTER TABLE users ADD COLUMN status_reason TEXT NOT NULL DEFAULT '';
      ALTER TABLE users ADD COLUMN status_changed_at TEXT;
      UPDATE users SET segment = 'bot' WHERE is_demo = 1;
      UPDATE users SET segment = 'demo' WHERE is_demo = 0 AND (email LIKE '%@kefounder.demo' OR email LIKE '%@found.demo');

      ALTER TABLE projects ADD COLUMN moderation TEXT NOT NULL DEFAULT 'ok';
      ALTER TABLE projects ADD COLUMN moderation_reason TEXT NOT NULL DEFAULT '';

      ALTER TABLE reports ADD COLUMN status TEXT NOT NULL DEFAULT 'open';
      ALTER TABLE reports ADD COLUMN resolution TEXT NOT NULL DEFAULT '';
      ALTER TABLE reports ADD COLUMN handled_by INTEGER REFERENCES users(id) ON DELETE SET NULL;
      ALTER TABLE reports ADD COLUMN handled_at TEXT;

      ALTER TABLE subscriptions ADD COLUMN ended_at TEXT;

      CREATE TABLE IF NOT EXISTS admin_audit (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        admin_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
        action TEXT NOT NULL,
        target_type TEXT,
        target_id INTEGER,
        summary TEXT NOT NULL DEFAULT '',
        data TEXT NOT NULL DEFAULT '{}',
        created_at TEXT NOT NULL
      );
      CREATE TABLE IF NOT EXISTS admin_notes (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        target_type TEXT NOT NULL,
        target_id INTEGER NOT NULL,
        admin_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
        body TEXT NOT NULL,
        created_at TEXT NOT NULL
      );
      CREATE TABLE IF NOT EXISTS admin_tasks (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT NOT NULL,
        detail TEXT NOT NULL DEFAULT '',
        status TEXT NOT NULL DEFAULT 'todo',
        priority TEXT NOT NULL DEFAULT 'normal',
        due_at TEXT,
        target_type TEXT,
        target_id INTEGER,
        created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        done_at TEXT
      );

      CREATE INDEX IF NOT EXISTS idx_users_created ON users(created_at);
      CREATE INDEX IF NOT EXISTS idx_users_active ON users(last_active_at);
      CREATE INDEX IF NOT EXISTS idx_users_segment ON users(segment, status);
      CREATE INDEX IF NOT EXISTS idx_users_plan ON users(plan);
      CREATE INDEX IF NOT EXISTS idx_users_identity ON users(json_extract(settings, '$.identity.status'));
      CREATE INDEX IF NOT EXISTS idx_projects_created ON projects(created_at);
      CREATE INDEX IF NOT EXISTS idx_interests_from ON interests(from_user_id, created_at);
      CREATE INDEX IF NOT EXISTS idx_interests_created ON interests(created_at);
      CREATE INDEX IF NOT EXISTS idx_matches_created ON matches(created_at);
      CREATE INDEX IF NOT EXISTS idx_matches_b ON matches(user_b);
      CREATE INDEX IF NOT EXISTS idx_messages_sender ON messages(sender_id, created_at);
      CREATE INDEX IF NOT EXISTS idx_messages_created ON messages(created_at);
      CREATE INDEX IF NOT EXISTS idx_views_created ON views(created_at);
      CREATE INDEX IF NOT EXISTS idx_reports_status ON reports(status, created_at);
      CREATE INDEX IF NOT EXISTS idx_reports_target ON reports(target_type, target_id);
      CREATE INDEX IF NOT EXISTS idx_subscriptions_user ON subscriptions(user_id, created_at);
      CREATE INDEX IF NOT EXISTS idx_audit_created ON admin_audit(created_at);
      CREATE INDEX IF NOT EXISTS idx_audit_target ON admin_audit(target_type, target_id);
      CREATE INDEX IF NOT EXISTS idx_notes_target ON admin_notes(target_type, target_id);
      CREATE INDEX IF NOT EXISTS idx_tasks_status ON admin_tasks(status, due_at);
      CREATE INDEX IF NOT EXISTS idx_tasks_target ON admin_tasks(target_type, target_id);
    `
  }
];

function migrate(raw) {
  raw.exec('CREATE TABLE IF NOT EXISTS schema_migrations (id TEXT PRIMARY KEY, applied_at TEXT NOT NULL)');
  const applied = new Set(raw.prepare('SELECT id FROM schema_migrations').all().map((row) => row.id));
  for (const migration of MIGRATIONS) {
    if (applied.has(migration.id)) continue;
    // IMMEDIATE toma el lock de escritura antes de mirar: si otro proceso la aplicó mientras tanto, se saltea.
    raw.exec('BEGIN IMMEDIATE');
    try {
      if (!raw.prepare('SELECT 1 FROM schema_migrations WHERE id = ?').get(migration.id)) {
        raw.exec(migration.up);
        raw.prepare('INSERT INTO schema_migrations (id, applied_at) VALUES (?, ?)').run(migration.id, new Date().toISOString());
      }
      raw.exec('COMMIT');
    } catch (error) {
      raw.exec('ROLLBACK');
      throw new Error(`La migración ${migration.id} falló: ${error.message}`);
    }
  }
}

export const MIGRATION_IDS = MIGRATIONS.map((m) => m.id);

export function openDb(file) {
  if (file !== ':memory:') fs.mkdirSync(path.dirname(file), { recursive: true });
  const raw = new DatabaseSync(file);
  raw.exec('PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON; PRAGMA busy_timeout = 5000;');
  // Orden alfabético en español: sin distinguir mayúsculas ni tildes (Martín antes que Martina).
  raw.function('fold', { deterministic: true }, (value) => (value == null ? '' : String(value).normalize('NFD').replace(/\p{M}/gu, '').toLowerCase()));
  raw.exec(SCHEMA);
  migrate(raw);

  const cache = new Map();
  const prepare = (sql) => {
    let stmt = cache.get(sql);
    if (!stmt) { stmt = raw.prepare(sql); cache.set(sql, stmt); }
    return stmt;
  };

  let depth = 0;
  const db = {
    raw,
    get: (sql, params) => prepare(sql).get(...normalizeParams(params)),
    all: (sql, params) => prepare(sql).all(...normalizeParams(params)),
    run: (sql, params) => prepare(sql).run(...normalizeParams(params)),
    exec: (sql) => raw.exec(sql),
    tx(fn) {
      if (depth > 0) return fn();
      depth += 1;
      raw.exec('BEGIN');
      try {
        const result = fn();
        raw.exec('COMMIT');
        return result;
      } catch (error) {
        raw.exec('ROLLBACK');
        throw error;
      } finally {
        depth -= 1;
      }
    },
    close: () => raw.close()
  };
  return db;
}

export const now = () => new Date().toISOString();
export const parseJson = (value, fallback) => {
  if (value === null || value === undefined || value === '') return fallback;
  try { return JSON.parse(value); } catch { return fallback; }
};
