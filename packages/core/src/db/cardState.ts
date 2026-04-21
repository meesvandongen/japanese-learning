import type { DB, Row } from './types'
import type { CardState } from '../types'

interface CardStateRow extends Row {
  language_id: string
  kana: string
  ease: number
  interval: number
  repetitions: number
  due_date: number | null
  last_review: number | null
}

function rowToState(r: CardStateRow): CardState {
  return {
    repetitions: r.repetitions,
    easeFactor: r.ease,
    interval: r.interval,
    dueDate: r.due_date,
    lastReview: r.last_review,
  }
}

export async function getCardState(db: DB, languageId: string, kana: string): Promise<CardState | null> {
  const row = await db.first<CardStateRow>(
    'SELECT * FROM card_state WHERE language_id = ? AND kana = ?',
    [languageId, kana]
  )
  return row ? rowToState(row) : null
}

export async function putCardState(db: DB, languageId: string, kana: string, state: CardState): Promise<void> {
  await db.run(
    `INSERT INTO card_state(language_id, kana, ease, interval, repetitions, due_date, last_review)
     VALUES (?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(language_id, kana) DO UPDATE SET
       ease=excluded.ease,
       interval=excluded.interval,
       repetitions=excluded.repetitions,
       due_date=excluded.due_date,
       last_review=excluded.last_review`,
    [languageId, kana, state.easeFactor, state.interval, state.repetitions, state.dueDate, state.lastReview]
  )
}

export async function getAllCardStates(db: DB, languageId: string): Promise<Record<string, CardState>> {
  const rows = await db.all<CardStateRow>(
    'SELECT * FROM card_state WHERE language_id = ?',
    [languageId]
  )
  const out: Record<string, CardState> = {}
  for (const r of rows) out[r.kana] = rowToState(r)
  return out
}

export async function deleteCardState(db: DB, languageId: string, kana: string): Promise<void> {
  await db.run(
    'DELETE FROM card_state WHERE language_id = ? AND kana = ?',
    [languageId, kana]
  )
}
