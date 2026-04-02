import { describe, it, expect } from 'vitest'
import { applyReview, formatDue, INITIAL_CARD_STATE } from './sm2'

describe('applyReview', () => {
  it('first correct answer (q4): interval=1, reps=1', () => {
    const result = applyReview(null, 4)
    expect(result.repetitions).toBe(1)
    expect(result.interval).toBe(1)
    expect(result.easeFactor).toBeCloseTo(2.5) // q4 is neutral on ease factor
    expect(result.dueDate).toBeGreaterThan(Date.now())
  })

  it('second correct answer (q4): interval=6, reps=2', () => {
    const state = applyReview(null, 4) // reps=1
    const result = applyReview(state, 4)
    expect(result.repetitions).toBe(2)
    expect(result.interval).toBe(6)
  })

  it('third correct answer (q4): interval = prev * easeFactor', () => {
    let state = applyReview(null, 4)  // reps=1, interval=1
    state = applyReview(state, 4)     // reps=2, interval=6
    const result = applyReview(state, 4)
    expect(result.repetitions).toBe(3)
    expect(result.interval).toBe(Math.round(6 * state.easeFactor))
  })

  it('incorrect answer (q1): resets repetitions and interval', () => {
    let state = applyReview(null, 4)
    state = applyReview(state, 4)
    const result = applyReview(state, 1)
    expect(result.repetitions).toBe(0)
    expect(result.interval).toBe(1)
  })

  it('ease factor floors at 1.3 after repeated wrong answers', () => {
    let state = null
    for (let i = 0; i < 20; i++) state = applyReview(state, 1)
    expect(state.easeFactor).toBeGreaterThanOrEqual(1.3)
  })

  it('easy answer (q5) increases ease factor more than good (q4)', () => {
    const good = applyReview(null, 4)
    const easy = applyReview(null, 5)
    expect(easy.easeFactor).toBeGreaterThan(good.easeFactor)
  })

  it('null card state treated as INITIAL_CARD_STATE', () => {
    const fromNull = applyReview(null, 4)
    const fromInitial = applyReview(INITIAL_CARD_STATE, 4)
    expect(fromNull.repetitions).toBe(fromInitial.repetitions)
    expect(fromNull.interval).toBe(fromInitial.interval)
  })

  it('sets lastReview to approximately now', () => {
    const before = Date.now()
    const result = applyReview(null, 4)
    expect(result.lastReview).toBeGreaterThanOrEqual(before)
    expect(result.lastReview).toBeLessThanOrEqual(Date.now())
  })
})

describe('formatDue', () => {
  it('returns "new" for null dueDate', () => {
    expect(formatDue(null)).toBe('new')
  })

  it('returns "overdue" for past dueDate', () => {
    expect(formatDue(Date.now() - 1000)).toBe('overdue')
  })

  it('returns minutes for < 1 hour', () => {
    const result = formatDue(Date.now() + 30 * 60 * 1000)
    expect(result).toMatch(/^\d+m$/)
  })

  it('returns hours + minutes for < 24 hours', () => {
    const result = formatDue(Date.now() + 3 * 60 * 60 * 1000)
    expect(result).toMatch(/^\d+h \d+m$/)
  })

  it('returns days for >= 24 hours', () => {
    const result = formatDue(Date.now() + 3 * 24 * 60 * 60 * 1000)
    expect(result).toMatch(/^\d+d$/)
  })
})
