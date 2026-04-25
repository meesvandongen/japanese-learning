/**
 * Builds `vocab.db` — a SQLite file shipped to both platforms as the single
 * source of truth for vocabulary data.
 *
 * Output locations:
 *   apps/mobile/public/vocab.db    — Metro web copies this into dist/, where
 *                                    OPFS fetches it on first launch.
 *   apps/mobile/assets/vocab.db    — bundled into the Expo native APK.
 *   packages/core/assets/vocab.db  — required by openDatabase.native.ts so
 *                                    Metro bundles it as an asset and
 *                                    Asset.fromModule() can materialise it
 *                                    onto the device's filesystem.
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

// Single Expo app serves both web and native. Three outputs:
//   public/    — copied into Metro's web export root, fetched as /vocab.db
//   assets/    — bundled into the APK's assets/ folder
//   core/      — Metro asset import resolution requires the file to live
//                next to the importing source (packages/core/src/db/).
const OUTPUT_PATHS = [
  join(root, 'apps', 'mobile', 'public', 'vocab.db'),
  join(root, 'apps', 'mobile', 'assets', 'vocab.db'),
  join(root, 'packages', 'core', 'assets', 'vocab.db'),
]

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
    -- Kana alone isn't unique across levels: some words are re-used between
    -- JLPT levels. Uniqueness is scoped to (language, level, kana).
    CREATE UNIQUE INDEX idx_words_lang_level_kana ON words(language_id, level_id, kana);

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

// Build once, then duplicate to every target path.
const [primary, ...mirrors] = OUTPUT_PATHS
buildDatabase(primary)

for (const target of mirrors) {
  mkdirSync(dirname(target), { recursive: true })
  writeFileSync(target, readFileSync(primary))
  const size = (readFileSync(target).byteLength / 1024).toFixed(1)
  console.log(`✓ ${target} (${size} KB)`)
}

console.log(`\nManifest version: ${MANIFEST_VERSION}`)
