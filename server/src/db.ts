import { Database } from "bun:sqlite";

const DB_PATH = process.env.DATABASE_URL?.replace("file:", "") ?? "dev.db";

export const db = new Database(DB_PATH, { create: true });

// Enable WAL for better concurrent read performance
db.run("PRAGMA journal_mode = WAL");
db.run("PRAGMA foreign_keys = ON");

// --- Schema init ---
db.run(`
  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    username TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
  )
`);

db.run(`
  CREATE TABLE IF NOT EXISTS bookmarks (
    id TEXT PRIMARY KEY,
    parent_id TEXT,
    title TEXT NOT NULL,
    type TEXT NOT NULL,
    url TEXT,
    favicon_url TEXT,
    favicon_base64 TEXT,
    favicon_mime TEXT,
    favicon_expires_at TEXT,
    icon_failed_at TEXT,
    sort_order INTEGER NOT NULL DEFAULT 0,
    read_permission TEXT NOT NULL DEFAULT 'public',
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (parent_id) REFERENCES bookmarks(id) ON DELETE SET NULL ON UPDATE CASCADE
  )
`);

// Create indexes
db.run(`
  CREATE INDEX IF NOT EXISTS idx_bookmarks_parent_sort
  ON bookmarks (parent_id, sort_order)
`);

// --- Helpers ---
export function generateId(): string {
  // Simple CUID-like ID
  const t = Date.now().toString(36);
  const r = Math.random().toString(36).slice(2, 10);
  return `${t}${r}`;
}

export function nowISO(): string {
  return new Date().toISOString();
}
