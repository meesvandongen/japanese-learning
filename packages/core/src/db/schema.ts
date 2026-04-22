/**
 * Canonical SQLite schema for the vocab database. Shared verbatim between
 * the build-time generator (scripts/generate-vocab-db.mjs) and the runtime
 * setup that initialises tables used for session state (card_state, kv).
 *
 * The `words` + `words_fts` tables are populated at build time and shipped
 * as a read-only bundle. The `card_state` + `kv` tables are created on
 * first launch and are read-write.
 */
export const SCHEMA_SQL = `
CREATE TABLE IF NOT EXISTS words (
  id INTEGER PRIMARY KEY,
  language_id TEXT NOT NULL,
  level_id TEXT NOT NULL,
  japanese TEXT NOT NULL,
  kana TEXT NOT NULL,
  english TEXT NOT NULL,          -- JSON array
  hint TEXT,
  alt TEXT,                        -- JSON array
  jlpt INTEGER,
  freq INTEGER
);
CREATE INDEX IF NOT EXISTS idx_words_lang_level ON words(language_id, level_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_words_lang_level_kana ON words(language_id, level_id, kana);

CREATE VIRTUAL TABLE IF NOT EXISTS words_fts USING fts5(
  english, kana, japanese,
  content='words', content_rowid='id'
);

CREATE TABLE IF NOT EXISTS card_state (
  language_id TEXT NOT NULL,
  kana TEXT NOT NULL,
  ease REAL NOT NULL,
  interval INTEGER NOT NULL,
  repetitions INTEGER NOT NULL,
  due_date INTEGER,
  last_review INTEGER,
  PRIMARY KEY (language_id, kana)
);

CREATE TABLE IF NOT EXISTS kv (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS languages (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS levels (
  language_id TEXT NOT NULL,
  id TEXT NOT NULL,
  label TEXT NOT NULL,
  description TEXT NOT NULL,
  PRIMARY KEY (language_id, id)
);
`

/**
 * Write-side tables (card_state, kv) — emitted even when bundling an empty DB,
 * so the runtime doesn't need to branch on "is this a fresh asset DB?".
 */
export const WRITE_TABLES_SQL = `
CREATE TABLE IF NOT EXISTS card_state (
  language_id TEXT NOT NULL,
  kana TEXT NOT NULL,
  ease REAL NOT NULL,
  interval INTEGER NOT NULL,
  repetitions INTEGER NOT NULL,
  due_date INTEGER,
  last_review INTEGER,
  PRIMARY KEY (language_id, kana)
);

CREATE TABLE IF NOT EXISTS kv (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);
`
