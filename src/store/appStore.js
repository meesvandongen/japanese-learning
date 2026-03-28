import { createStore, localStorageAdapter } from './index'

const initialState = {
  /**
   * SRS state per card, keyed by card.kana.
   * Each entry: { repetitions, easeFactor, interval, dueDate, lastReview }
   */
  cards: {},
}

export const appStore = createStore(
  initialState,
  localStorageAdapter('jp-flashcards-srs-v1')
)
