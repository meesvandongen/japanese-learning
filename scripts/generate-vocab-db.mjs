/**
 * Builds `vocab.db` — a SQLite file shipped to both platforms as the single
 * source of truth for vocabulary data.
 *
 * Output locations:
 *   apps/web/public/vocab.db       — web fetches and caches into OPFS
 *   apps/mobile/assets/vocab.db    — bundled into the Expo app
 *
 * The older JSON generator (`generate-vocab.mjs`) continues to exist for the
 * transition period — apps that haven't switched to SQLite yet still consume
 * its output. Once all call sites use the DB, delete that script and its
 * outputs.
 *
 * Run:  node scripts/generate-vocab-db.mjs
 */

import { readFileSync, writeFileSync, mkdirSync, rmSync, existsSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'
import sqlite3 from 'better-sqlite3'

const __dirname = dirname(fileURLToPath(import.meta.url))
const root = join(__dirname, '..')
const sourcesDir = join(__dirname, 'sources')

const WEB_OUTPUT = join(root, 'apps', 'web', 'public', 'vocab.db')
const NATIVE_OUTPUT = join(root, 'apps', 'mobile', 'assets', 'vocab.db')

const MANIFEST_VERSION = 2 // bump when the schema or data format changes

const LANGUAGES = [
  {
    id: 'ja',
    name: 'Japanese',
    levels: [
      { id: 'n5', label: 'JLPT N5', description: 'Beginner — everyday basics (~700 words)', source: 'ja/n5.json' },
      { id: 'n4', label: 'JLPT N4', description: 'Elementary — basic grammar & vocabulary (~650 words)', source: 'ja/n4.json' },
      { id: 'n3', label: 'JLPT N3', description: 'Intermediate — everyday situations (~1800 words)', source: 'ja/n3.json' },
      { id: 'n2', label: 'JLPT N2', description: 'Upper-intermediate — broad topics (~1800 words)', source: 'ja/n2.json' },
      { id: 'n1', label: 'JLPT N1', description: 'Advanced — near-native fluency (~2600 words)', source: 'ja/n1.json' },
    ],
  },
]

function buildDatabase(outputPath) {
  if (existsSync(outputPath)) rmSync(outputPath)
  mkdirSync(dirname(outputPath), { recursive: true })

  const db = sqlite3(outputPath)
  db.pragma('journal_mode = DELETE') // avoid -wal / -shm files in the shipped asset
  db.pragma('foreign_keys = OFF')

  db.exec(`
    CREATE TABLE words (
      id INTEGER PRIMARY KEY,
      language_id TEXT NOT NULL,
      level_id TEXT NOT NULL,
      japanese TEXT NOT NULL,
      kana TEXT NOT NULL,
      english TEXT NOT NULL,
      hint TEXT,
      alt TEXT,
      jlpt INTEGER,
      freq INTEGER
    );
    CREATE INDEX idx_words_lang_level ON words(language_id, level_id);
    CREATE UNIQUE INDEX idx_words_kana ON words(language_id, kana);

    CREATE VIRTUAL TABLE words_fts USING fts5(
      english, kana, japanese,
      content='words', content_rowid='id'
    );

    CREATE TABLE languages (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL
    );
    CREATE TABLE levels (
      language_id TEXT NOT NULL,
      id TEXT NOT NULL,
      label TEXT NOT NULL,
      description TEXT NOT NULL,
      PRIMARY KEY (language_id, id)
    );

    CREATE TABLE card_state (
      language_id TEXT NOT NULL,
      kana TEXT NOT NULL,
      ease REAL NOT NULL,
      interval INTEGER NOT NULL,
      repetitions INTEGER NOT NULL,
      due_date INTEGER,
      last_review INTEGER,
      PRIMARY KEY (language_id, kana)
    );

    CREATE TABLE kv (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );
  `)

  const insertLang = db.prepare('INSERT INTO languages(id, name) VALUES (?, ?)')
  const insertLevel = db.prepare('INSERT INTO levels(language_id, id, label, description) VALUES (?, ?, ?, ?)')
  const insertWord = db.prepare(`
    INSERT INTO words(language_id, level_id, japanese, kana, english, hint, alt, jlpt, freq)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `)

  const tx = db.transaction(() => {
    for (const lang of LANGUAGES) {
      insertLang.run(lang.id, lang.name)
      for (const level of lang.levels) {
        insertLevel.run(lang.id, level.id, level.label, level.description)
        const words = JSON.parse(readFileSync(join(sourcesDir, level.source), 'utf-8'))
        for (const w of words) {
          const english = Array.isArray(w.english) ? w.english : [w.english]
          const alt = Array.isArray(w.alt) && w.alt.length > 0 ? JSON.stringify(w.alt) : null
          insertWord.run(
            lang.id,
            level.id,
            w.japanese,
            w.kana,
            JSON.stringify(english),
            w.hint ?? null,
            alt,
            w.jlpt ?? null,
            w.freq ?? null
          )
        }
        console.log(`  + ${lang.id}/${level.id}: ${words.length} words`)
      }
    }

    db.prepare(`INSERT INTO words_fts(words_fts) VALUES ('rebuild')`).run()
    db.prepare(`INSERT INTO kv(key, value) VALUES ('manifest_version', ?)`).run(String(MANIFEST_VERSION))
  })
  tx()

  db.exec('VACUUM')
  db.close()
  const size = (readFileSync(outputPath).byteLength / 1024).toFixed(1)
  console.log(`✓ ${outputPath} (${size} KB)`)
}

buildDatabase(WEB_OUTPUT)

// Copy to the native asset dir if it exists (apps/mobile may not be
// scaffolded yet; skip silently in that case).
const mobileDir = dirname(NATIVE_OUTPUT)
if (existsSync(mobileDir)) {
  writeFileSync(NATIVE_OUTPUT, readFileSync(WEB_OUTPUT))
  const size = (readFileSync(NATIVE_OUTPUT).byteLength / 1024).toFixed(1)
  console.log(`✓ ${NATIVE_OUTPUT} (${size} KB)`)
} else {
  mkdirSync(mobileDir, { recursive: true })
  writeFileSync(NATIVE_OUTPUT, readFileSync(WEB_OUTPUT))
  console.log(`✓ ${NATIVE_OUTPUT} (created)`)
}

console.log(`\nManifest version: ${MANIFEST_VERSION}`)
