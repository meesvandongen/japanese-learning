import { createStore, localStorageAdapter } from './index'

const initialState = {
  /**
   * SRS state per card, keyed by card.kana.
   * Each entry: { repetitions, easeFactor, interval, dueDate, lastReview }
   */
  cards: {},

  /**
   * User's chosen language and level, discovered from the manifest.
   * Both start as null — the onboarding flow sets them on first launch.
   */
  selectedLanguageId: null,
  selectedLevelId: null,
}

export const appStore = createStore(
  initialState,
  localStorageAdapter('jp-flashcards-srs-v1')
)
