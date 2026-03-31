import { createStore, localStorageAdapter } from './index'

const DEFAULT_SETTINGS = {
  listeningMode: 'hold',    // 'hold' | 'auto'
  feedbackMode: 'both',     // 'text' | 'voice' | 'both'
  autoStartDelay: 500,      // ms to wait before auto-starting recognition
  maxListenDuration: 10000, // ms max listen time (0 = browser default)

  /**
   * Which phonetic algorithm to use when comparing STT output to expected answers.
   * 'off'       — spelling/fuzzy only, no phonetic encoding
   * 'soundex'   — catches vowel variations (hot/hut) and same-consonant homophones (two/too)
   * 'metaphone' — better for silent-letter homophones (write/right, know/no, phone/fone)
   * 'both'      — union of Soundex and Metaphone; most permissive
   */
  phoneticAlgorithm: 'soundex',

  /**
   * Whether to show what the microphone/STT actually heard.
   * 'off'       — never shown (clean default)
   * 'on-result' — shown after the answer is evaluated (useful for debugging misses)
   */
  showTranscript: 'off',
}

export const settingsStore = createStore(
  DEFAULT_SETTINGS,
  localStorageAdapter('jp-flashcards-settings-v1')
)
