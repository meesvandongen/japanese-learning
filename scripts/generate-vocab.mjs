/**
 * Generates static JSON vocabulary files served to the app at runtime.
 *
 * Source data lives in scripts/sources/<lang>/<level>.json — these are the
 * human-editable files you update when expanding the word list.
 *
 * Output (committed to public/vocab/ so Vite and Cloudflare serve them):
 *   public/vocab/manifest.json
 *   public/vocab/ja/n5.json
 *   public/vocab/ja/n4.json   (future)
 *   ...
 *
 * Run:  node scripts/generate-vocab.mjs
 * Also runs automatically as `prebuild` before `vite build`.
 */

import { readFileSync, writeFileSync, mkdirSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __dirname = dirname(fileURLToPath(import.meta.url))
const root = join(__dirname, '..')
const sourcesDir = join(__dirname, 'sources')
const vocabDir = join(root, 'public', 'vocab')

// ---------------------------------------------------------------------------
// Language / level definitions
//
// To add a new language or level:
//   1. Create scripts/sources/<lang>/<level>.json with the word data
//   2. Add an entry to LANGUAGES below — no other file needs changing.
// ---------------------------------------------------------------------------

const LANGUAGES = [
  {
    id: 'ja',
    name: 'Japanese',
    levels: [
      {
        id: 'n5',
        label: 'JLPT N5',
        description: 'Beginner — everyday basics',
        sourceFile: 'ja/n5.json',
        outputFile: 'ja/n5.json',
      },
      // Future: { id: 'n4', label: 'JLPT N4', description: 'Elementary', sourceFile: 'ja/n4.json', outputFile: 'ja/n4.json' },
    ],
  },
  // Future: { id: 'ko', name: 'Korean', levels: [...] },
]

// ---------------------------------------------------------------------------
// Build
// ---------------------------------------------------------------------------

const manifestLevels = []

for (const lang of LANGUAGES) {
  const langLevels = []

  for (const level of lang.levels) {
    const srcPath = join(sourcesDir, level.sourceFile)
    const words = JSON.parse(readFileSync(srcPath, 'utf-8'))

    // Normalise: ensure every word has a stable `id` (= kana for Japanese)
    const normalised = words.map((w) => ({
      id: w.kana,
      kana: w.kana,
      japanese: w.japanese,
      english: Array.isArray(w.english) ? w.english : [w.english],
      ...(w.jlpt != null ? { jlpt: w.jlpt } : {}),
      ...(w.freq != null ? { freq: w.freq } : {}),
    }))

    const outPath = join(vocabDir, level.outputFile)
    mkdirSync(dirname(outPath), { recursive: true })
    writeFileSync(
      outPath,
      JSON.stringify({ language: lang.id, level: level.id, words: normalised }, null, 2)
    )
    console.log(`✓ public/vocab/${level.outputFile} (${normalised.length} words)`)

    langLevels.push({
      id: level.id,
      label: level.label,
      description: level.description,
      wordCount: normalised.length,
      file: level.outputFile,
    })
  }

  manifestLevels.push({ id: lang.id, name: lang.name, levels: langLevels })
}

const manifest = { version: 1, languages: manifestLevels }
writeFileSync(join(vocabDir, 'manifest.json'), JSON.stringify(manifest, null, 2))
console.log(`✓ public/vocab/manifest.json (${manifest.languages.length} language(s))`)
