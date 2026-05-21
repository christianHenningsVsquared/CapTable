import Database from "better-sqlite3";

export type DB = Database.Database;

/**
 * The entire MVP schema — three tables, exactly as specified in
 * docs/stream-a-ingestion.md. Rounds and investors are NOT normalized into
 * their own tables; they live inside `extractions.raw_json`. One source of
 * truth, no sync bugs.
 */
export const SCHEMA = `
CREATE TABLE IF NOT EXISTS companies (
  id   INTEGER PRIMARY KEY,
  name TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS extractions (
  id         INTEGER PRIMARY KEY,
  company_id INTEGER NOT NULL REFERENCES companies(id),
  raw_json   TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS waterfall_runs (
  id          INTEGER PRIMARY KEY,
  company_id  INTEGER NOT NULL REFERENCES companies(id),
  exit_value  REAL NOT NULL,
  result_json TEXT NOT NULL,
  created_at  TEXT NOT NULL
);
`;

/**
 * Open (and migrate) a SQLite database. Defaults to an in-memory DB, which is
 * what the tests use; pass a file path for the real app.
 */
export function openDb(path = ":memory:"): DB {
  const db = new Database(path);
  db.pragma("foreign_keys = ON");
  db.exec(SCHEMA);
  return db;
}
