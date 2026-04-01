import { createStore, localStorageAdapter } from './index'

const DEFAULT_SETTINGS = {
  autoListen: false,         // true = auto-start listening each card; false = hold-to-speak
  autoStartDelay: 500,       // ms to wait before auto-starting recognition
  maxListenDuration: 10000,  // ms max listen time (0 = browser default)
  feedbackText: true,        // show the answer on screen
  feedbackVoice: true,       // speak the answer aloud
  phoneticSoundex: true,     // enable Soundex phonetic matching
  phoneticMetaphone: false,  // enable Metaphone phonetic matching
  showTranscript: false,     // show what the microphone heard after result
}

export const settingsStore = createStore(
  DEFAULT_SETTINGS,
  localStorageAdapter('jp-flashcards-settings-v1')
)
