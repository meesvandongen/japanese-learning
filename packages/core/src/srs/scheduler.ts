/**
 * Card scheduler
 *
 * Priority order each pick:
 *   1. Overdue cards   (dueDate <= now), sorted most-overdue first
 *   2. New cards       (dueDate === null), in vocab order
 *   3. Extra practice  (dueDate > now),   sorted soonest-due first
 *
 * `lastShownId` prevents the same card from appearing twice in a row.
 * Extra practice is offered unconditionally — unlimited exercises per session.
 */

import type { CardState, Word } from '../types'

/**
 * @param vocab          — full vocabulary list (each has .kana as ID)
 * @param cardStates    — persisted SRS state keyed by card.kana
 * @param lastShownId — kana of the card shown most recently
 */
export function getNextCard(
  vocab: Word[],
  cardStates: Record<string, CardState>,
  lastShownId: string | null = null
): { card: Word; cardType: 'due' | 'new' | 'extra' } {
  const now = Date.now()

  // Partition vocab by category
  const due: Word[] = []
  const newCards: Word[] = []
  const upcoming: Word[] = []

  for (const v of vocab) {
    const s = cardStates[v.kana]
    if (!s?.dueDate) {
      newCards.push(v)
    } else if (s.dueDate <= now) {
      due.push(v)
    } else {
      upcoming.push(v)
    }
  }

  // Sort due: most overdue first
  due.sort((a, b) => cardStates[a.kana].dueDate! - cardStates[b.kana].dueDate!)
  // Sort upcoming: soonest due first
  upcoming.sort(
    (a, b) => cardStates[a.kana].dueDate! - cardStates[b.kana].dueDate!
  )

  // Pick first candidate that isn't the last shown card (fallback if only 1 card)
  function pick(list: Word[], cardType: 'due' | 'new' | 'extra'): { card: Word; cardType: 'due' | 'new' | 'extra' } {
    const preferred = list.filter((v) => v.kana !== lastShownId)
    const chosen = preferred.length > 0 ? preferred[0] : list[0]
    return { card: chosen, cardType }
  }

  if (due.length > 0) return pick(due, 'due')
  if (newCards.length > 0) return pick(newCards, 'new')
  return pick(upcoming, 'extra')
}

/**
 * Counts for the session stats banner.
 */
export function getSessionStats(
  vocab: Word[],
  cardStates: Record<string, CardState>
): { dueCount: number; newCount: number } {
  const now = Date.now()
  let dueCount = 0
  let newCount = 0

  for (const v of vocab) {
    const s = cardStates[v.kana]
    if (!s?.dueDate) newCount++
    else if (s.dueDate <= now) dueCount++
  }

  return { dueCount, newCount }
}
