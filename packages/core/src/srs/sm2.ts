/**
 * SM-2 Spaced Repetition Algorithm
 *
 * Quality scale (pass to applyReview):
 *   1 — incorrect (complete blackout or wrong)
 *   3 — correct but hard
 *   4 — correct, good recall  (default for "Correct")
 *   5 — correct, very easy
 *
 * Card state shape:
 *   { repetitions, easeFactor, interval, dueDate, lastReview }
 */

import type { CardState } from '../types'

export const INITIAL_CARD_STATE: CardState = {
  repetitions: 0,
  easeFactor: 2.5,
  interval: 0,      // days
  dueDate: null,    // null = new card, never seen
  lastReview: null,
}

const MS_PER_DAY = 24 * 60 * 60 * 1000

/**
 * Apply a review result to a card state and return the updated state.
 */
export function applyReview(card: CardState | null, quality: number): CardState {
  let { repetitions, easeFactor, interval } = {
    ...INITIAL_CARD_STATE,
    ...card,
  }

  if (quality >= 3) {
    // Correct response
    if (repetitions === 0) {
      interval = 1
    } else if (repetitions === 1) {
      interval = 6
    } else {
      interval = Math.round(interval * easeFactor)
    }
    repetitions++
  } else {
    // Wrong — reset to beginning
    repetitions = 0
    interval = 1
  }

  // Update ease factor (clamped to minimum 1.3)
  const ef =
    easeFactor + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02))
  easeFactor = Math.max(1.3, ef)

  const now = Date.now()

  return {
    repetitions,
    easeFactor,
    interval,
    dueDate: now + interval * MS_PER_DAY,
    lastReview: now,
  }
}

/**
 * Format the duration until a card is due, e.g. "2h 30m", "3 days", "now".
 */
export function formatDue(dueDate: number | null): string {
  if (!dueDate) return 'new'
  const diff = dueDate - Date.now()
  if (diff <= 0) return 'overdue'
  const mins = Math.floor(diff / 60_000)
  if (mins < 60) return `${mins}m`
  const hours = Math.floor(diff / 3_600_000)
  if (hours < 24) return `${hours}h ${Math.floor((diff % 3_600_000) / 60_000)}m`
  return `${Math.round(diff / MS_PER_DAY)}d`
}
