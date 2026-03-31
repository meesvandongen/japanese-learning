import { createStore, localStorageAdapter } from './index'

const initialState = {
  listeningMode: 'hold', // 'hold' | 'auto'
  feedbackMode: 'both',  // 'text' | 'voice' | 'both'
  autoStartDelay: 500,   // ms to wait before auto-starting recognition
  maxListenDuration: 10000, // ms max listen time (0 = browser default)
}

export const settingsStore = createStore(
  initialState,
  localStorageAdapter('jp-flashcards-settings-v1')
)
