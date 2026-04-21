import type { DB, Row } from './types'
import type { Word } from '../types'

interface WordRow extends Row {
  id: number
  language_id: string
  level_id: string
  japanese: string
  kana: string
  english: string
  hint: string | null
  alt: string | null
  jlpt: number | null
  freq: number | null
}

function rowToWord(r: WordRow): Word {
  const english = safeParseArray(r.english)
  const alt = r.alt ? safeParseArray(r.alt) : undefined
  return {
    kana: r.kana,
    japanese: r.japanese,
    english,
    ...(r.hint ? { hint: r.hint } : {}),
    ...(alt && alt.length > 0 ? { alt } : {}),
  }
}

function safeParseArray(s: string): string[] {
  try {
    const v = JSON.parse(s)
    return Array.isArray(v) ? v : [String(v)]
  } catch {
    return [s]
  }
}

export async function getWords(db: DB, languageId: string, levelId: string): Promise<Word[]> {
  const rows = await db.all<WordRow>(
    'SELECT * FROM words WHERE language_id = ? AND level_id = ? ORDER BY freq IS NULL, freq ASC, id ASC',
    [languageId, levelId]
  )
  return rows.map(rowToWord)
}

export async function getWord(db: DB, languageId: string, kana: string): Promise<Word | null> {
  const row = await db.first<WordRow>(
    'SELECT * FROM words WHERE language_id = ? AND kana = ?',
    [languageId, kana]
  )
  return row ? rowToWord(row) : null
}

export async function searchEnglish(db: DB, query: string): Promise<Word[]> {
  const rows = await db.all<WordRow>(
    `SELECT w.* FROM words_fts f
      JOIN words w ON w.id = f.rowid
     WHERE f.english MATCH ?
     ORDER BY rank
     LIMIT 50`,
    [query]
  )
  return rows.map(rowToWord)
}
