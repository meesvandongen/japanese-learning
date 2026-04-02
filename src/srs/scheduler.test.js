import { describe, it, expect } from 'vitest'
import { getNextCard, getSessionStats } from './scheduler'

const MS_PER_DAY = 24 * 60 * 60 * 1000

// Helpers
function makeVocab(kanas) {
  return kanas.map((kana) => ({ kana, english: kana, japanese: kana }))
}

function dueState(daysAgo = 1) {
  return {
    repetitions: 1,
    easeFactor: 2.5,
    interval: 1,
    dueDate: Date.now() - daysAgo * MS_PER_DAY,
    lastReview: Date.now() - daysAgo * MS_PER_DAY,
  }
}

function futureState(daysAhead = 1) {
  return {
    repetitions: 1,
    easeFactor: 2.5,
    interval: 1,
    dueDate: Date.now() + daysAhead * MS_PER_DAY,
    lastReview: Date.now() - 1000,
  }
}

describe('getNextCard', () => {
  it('picks due card over new card', () => {
    const vocab = makeVocab(['new-card', 'due-card'])
    const cardStates = { 'due-card': dueState() }
    const { card, cardType } = getNextCard(vocab, cardStates, null)
    expect(card.kana).toBe('due-card')
    expect(cardType).toBe('due')
  })

  it('picks new card over upcoming (extra)', () => {
    const vocab = makeVocab(['upcoming-card', 'new-card'])
    const cardStates = { 'upcoming-card': futureState() }
    const { card, cardType } = getNextCard(vocab, cardStates, null)
    expect(card.kana).toBe('new-card')
    expect(cardType).toBe('new')
  })

  it('falls back to extra practice when all cards have future due dates', () => {
    const vocab = makeVocab(['a', 'b'])
    const cardStates = { a: futureState(2), b: futureState(1) }
    const { card, cardType } = getNextCard(vocab, cardStates, null)
    expect(cardType).toBe('extra')
    // Should pick soonest-due first
    expect(card.kana).toBe('b')
  })

  it('skips lastShownId and picks a different card', () => {
    const vocab = makeVocab(['a', 'b'])
    const cardStates = { a: dueState(), b: dueState() }
    const { card } = getNextCard(vocab, cardStates, 'a')
    expect(card.kana).toBe('b')
  })

  it('falls back to lastShownId card if it is the only option', () => {
    const vocab = makeVocab(['only'])
    const cardStates = { only: dueState() }
    const { card } = getNextCard(vocab, cardStates, 'only')
    expect(card.kana).toBe('only')
  })

  it('picks most-overdue card first when multiple are due', () => {
    const vocab = makeVocab(['overdue-1', 'overdue-2'])
    const cardStates = {
      'overdue-1': dueState(1),
      'overdue-2': dueState(3), // more overdue
    }
    const { card } = getNextCard(vocab, cardStates, null)
    expect(card.kana).toBe('overdue-2')
  })
})

describe('getSessionStats', () => {
  it('counts new cards (no dueDate)', () => {
    const vocab = makeVocab(['a', 'b', 'c'])
    const cardStates = { a: dueState() } // b and c are new
    const { newCount } = getSessionStats(vocab, cardStates)
    expect(newCount).toBe(2)
  })

  it('counts due cards (dueDate in past)', () => {
    const vocab = makeVocab(['a', 'b', 'c'])
    const cardStates = { a: dueState(), b: dueState() }
    const { dueCount } = getSessionStats(vocab, cardStates)
    expect(dueCount).toBe(2)
  })

  it('does not count future cards in due or new', () => {
    const vocab = makeVocab(['a'])
    const cardStates = { a: futureState() }
    const { dueCount, newCount } = getSessionStats(vocab, cardStates)
    expect(dueCount).toBe(0)
    expect(newCount).toBe(0)
  })

  it('returns zeros for empty vocab', () => {
    const { dueCount, newCount } = getSessionStats([], {})
    expect(dueCount).toBe(0)
    expect(newCount).toBe(0)
  })
})
