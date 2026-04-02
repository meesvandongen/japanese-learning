import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export const useSettingsStore = create(
  persist(
    () => ({
      autoListen: false,        // true = auto-start listening each card; false = hold-to-speak
      autoStartDelay: 500,      // ms to wait before auto-starting recognition
      maxListenDuration: 10000, // ms max listen time (0 = browser default)
      feedbackText: true,       // show the answer on screen
      feedbackVoice: true,      // speak the answer aloud
      phoneticSoundex: true,    // enable Soundex phonetic matching
      phoneticMetaphone: false, // enable Metaphone phonetic matching
      showTranscript: false,    // show what the microphone heard after result
    }),
    { name: 'jp-flashcards-settings-v1' }
  )
)
