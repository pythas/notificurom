import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import * as schema from './schema';
import path from 'path';
import fs from 'fs';

const dbPath = process.env.DATABASE_URL || path.join(process.cwd(), 'data', 'notificurom.db');

// Ensure data directory exists
const dbDir = path.dirname(dbPath);
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

const sqlite = new Database(dbPath);
// Enable WAL mode for better concurrency in local/hosted environments
sqlite.pragma('journal_mode = WAL');

export const db = drizzle(sqlite, { schema });

// Helper to auto-create tables if running without prior migration
export function initializeDb() {
  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS tasks (
      id TEXT PRIMARY KEY,
      source TEXT NOT NULL,
      source_type TEXT NOT NULL,
      source_id TEXT NOT NULL UNIQUE,
      title TEXT NOT NULL,
      url TEXT NOT NULL,
      repository TEXT,
      author TEXT,
      author_avatar_url TEXT,
      status TEXT NOT NULL DEFAULT 'inbox',
      sort_order INTEGER NOT NULL DEFAULT 0,
      is_closed INTEGER NOT NULL DEFAULT 0,
      metadata TEXT,
      source_created_at TEXT NOT NULL,
      source_updated_at TEXT,
      status_updated_at TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);
    CREATE INDEX IF NOT EXISTS idx_tasks_source_id ON tasks(source_id);
  `);
}

// Ensure DB is initialized
initializeDb();
