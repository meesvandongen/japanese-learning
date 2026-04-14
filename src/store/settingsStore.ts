import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { Settings } from '../types'

export const useSettingsStore = create<Settings>()(
  persist(
    (): Settings => ({
      autoListen: false,
      autoStartDelay: 500,
      maxListenDuration: 10000,
      keepScreenAwake: false,
      feedbackText: true,
      feedbackVoice: true,
      feedbackSound: true,
      phoneticSoundex: true,
      phoneticMetaphone: false,
      showTranscript: false,
      japaneseExerciseMode: 'audio',
      englishExerciseMode: 'audio',
      manualGrading: false,
      speakToCorrect: false,
    }),
    { name: 'jp-flashcards-settings-v1' }
  )
)
