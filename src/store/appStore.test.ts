import { describe, it, expect, beforeEach } from 'vitest'
import { useAppStore } from './appStore'

// Reset store to initial state before each test
beforeEach(() => {
  useAppStore.getState().reset()
})

describe('initial state', () => {
  it('starts with empty cards', () => {
    expect(useAppStore.getState().cards).toEqual({})
  })

  it('starts with null language and level', () => {
    const { selectedLanguageId, selectedLevelId } = useAppStore.getState()
    expect(selectedLanguageId).toBeNull()
    expect(selectedLevelId).toBeNull()
  })
})

describe('setLanguage', () => {
  it('sets selectedLanguageId and clears selectedLevelId', () => {
    useAppStore.getState().setLevel('n5')
    useAppStore.getState().setLanguage('ja')
    const { selectedLanguageId, selectedLevelId } = useAppStore.getState()
    expect(selectedLanguageId).toBe('ja')
    expect(selectedLevelId).toBeNull()
  })
})

describe('setLevel', () => {
  it('sets selectedLevelId without touching other fields', () => {
    useAppStore.getState().setLanguage('ja')
    useAppStore.getState().setLevel('n5')
    const { selectedLanguageId, selectedLevelId } = useAppStore.getState()
    expect(selectedLanguageId).toBe('ja')
    expect(selectedLevelId).toBe('n5')
  })
})

describe('applyCardReview — regression test for state-wipe bug', () => {
  it('merges cards without wiping selectedLanguageId or selectedLevelId', () => {
    useAppStore.getState().setLanguage('ja')
    useAppStore.getState().setLevel('n5')

    const updated = { repetitions: 1, easeFactor: 2.5, interval: 1, dueDate: Date.now() + 86400000, lastReview: Date.now() }
    useAppStore.getState().applyCardReview('たべる', updated)

    const state = useAppStore.getState()
    // The critical assertion: language/level must survive a card review
    expect(state.selectedLanguageId).toBe('ja')
    expect(state.selectedLevelId).toBe('n5')
    // Card was stored correctly
    expect(state.cards['たべる']).toEqual(updated)
  })

  it('merges new card into existing cards without losing other cards', () => {
    const card1 = { repetitions: 1, easeFactor: 2.5, interval: 1, dueDate: 0, lastReview: 0 }
    const card2 = { repetitions: 2, easeFactor: 2.6, interval: 6, dueDate: 0, lastReview: 0 }
    useAppStore.getState().applyCardReview('いぬ', card1)
    useAppStore.getState().applyCardReview('ねこ', card2)

    const { cards } = useAppStore.getState()
    expect(cards['いぬ']).toEqual(card1)
    expect(cards['ねこ']).toEqual(card2)
  })
})

describe('reset', () => {
  it('clears all state back to initial values', () => {
    useAppStore.getState().setLanguage('ja')
    useAppStore.getState().setLevel('n5')
    const updated = { repetitions: 1, easeFactor: 2.5, interval: 1, dueDate: 0, lastReview: 0 }
    useAppStore.getState().applyCardReview('いぬ', updated)

    useAppStore.getState().reset()

    const state = useAppStore.getState()
    expect(state.cards).toEqual({})
    expect(state.selectedLanguageId).toBeNull()
    expect(state.selectedLevelId).toBeNull()
  })
})
