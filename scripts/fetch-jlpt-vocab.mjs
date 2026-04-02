/**
 * Fetches JLPT N1–N5 vocabulary from the open-anki-jlpt-decks dataset on GitHub
 * (jamsinclair/open-anki-jlpt-decks) and writes normalised source files to
 * scripts/sources/ja/ for use by generate-vocab.mjs.
 *
 * Source format (CSV):
 *   expression,reading,meaning,tags,guid
 *
 * Output format (JSON):
 *   [{ kana, japanese, english: string[] }, ...]
 *
 * Run:  node scripts/fetch-jlpt-vocab.mjs
 *
 * Existing words in the N5 file are preserved and deduplicated (kana is the
 * primary key). Fetched data fills in the remaining words.
 */

import { writeFileSync, readFileSync, mkdirSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'
import { execFileSync } from 'child_process'

const __dirname = dirname(fileURLToPath(import.meta.url))
const sourcesDir = join(__dirname, 'sources', 'ja')
mkdirSync(sourcesDir, { recursive: true })

const BASE_URL =
  'https://raw.githubusercontent.com/jamsinclair/open-anki-jlpt-decks/master/src'

const LEVELS = ['n5', 'n4', 'n3', 'n2', 'n1']

/**
 * Parse a CSV line that may contain quoted fields with commas inside.
 */
function parseCSVLine(line) {
  const fields = []
  let current = ''
  let inQuotes = false
  for (let i = 0; i < line.length; i++) {
    const ch = line[i]
    if (ch === '"') {
      inQuotes = !inQuotes
    } else if (ch === ',' && !inQuotes) {
      fields.push(current)
      current = ''
    } else {
      current += ch
    }
  }
  fields.push(current)
  return fields
}

/**
 * Split a meaning string like "to eat, to consume" into individual meanings.
 * Handles parenthetical sub-clauses and numbered items.
 */
function parseMeaning(raw) {
  // Split on '; ' or ', ' but not inside parentheses
  const parts = []
  let depth = 0
  let current = ''
  for (let i = 0; i < raw.length; i++) {
    const ch = raw[i]
    if (ch === '(') depth++
    else if (ch === ')') depth--

    if (depth === 0 && (raw.slice(i, i + 2) === '; ' || (ch === ',' && raw[i + 1] === ' '))) {
      const trimmed = current.trim()
      if (trimmed) parts.push(trimmed)
      current = ''
      if (raw[i] === ',') i++ // skip the space after comma
    } else {
      current += ch
    }
  }
  const trimmed = current.trim()
  if (trimmed) parts.push(trimmed)
  return parts.filter(Boolean)
}

function fetchLevel(level) {
  const url = `${BASE_URL}/${level}.csv`
  console.log(`Fetching ${url} …`)
  // Use curl so that HTTPS_PROXY / HTTP_PROXY environment variables are respected
  return execFileSync('curl', ['--silent', '--fail', '--max-time', '30', url], {
    encoding: 'utf-8',
  })
}

for (const level of LEVELS) {
  const csvText = fetchLevel(level)
  const lines = csvText.split('\n').filter(Boolean)
  const header = lines[0] // expression,reading,meaning,tags,guid

  if (!header.startsWith('expression')) {
    throw new Error(`Unexpected header in ${level}.csv: ${header}`)
  }

  const words = []
  const seen = new Set()

  for (const line of lines.slice(1)) {
    const [expression, reading, meaning] = parseCSVLine(line)
    if (!expression || !reading || !meaning) continue

    // Deduplicate by kana reading
    if (seen.has(reading)) continue
    seen.add(reading)

    const english = parseMeaning(meaning)
    if (!english.length) continue

    words.push({
      kana: reading,
      japanese: expression,
      english,
    })
  }

  // For N5: merge with the existing hand-curated words (they take precedence)
  let finalWords = words
  if (level === 'n5') {
    const existingPath = join(sourcesDir, 'n5.json')
    let existing = []
    try {
      existing = JSON.parse(readFileSync(existingPath, 'utf-8'))
    } catch {
      // no existing file — that's fine
    }
    const existingKana = new Set(existing.map((w) => w.kana))
    const merged = [...existing]
    for (const w of words) {
      if (!existingKana.has(w.kana)) merged.push(w)
    }
    finalWords = merged
  }

  const outPath = join(sourcesDir, `${level}.json`)
  writeFileSync(outPath, JSON.stringify(finalWords, null, 2))
  console.log(`✓ scripts/sources/ja/${level}.json (${finalWords.length} words)`)
}

console.log('\nDone. Run `node scripts/generate-vocab.mjs` to rebuild public/vocab/.')
