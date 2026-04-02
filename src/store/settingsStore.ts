import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { Settings } from '../types'

export const useSettingsStore = create<Settings>()(
  persist(
    (): Settings => ({
      autoListen: false,
      autoStartDelay: 500,
      maxListenDuration: 10000,
      feedbackText: true,
      feedbackVoice: true,
      phoneticSoundex: true,
      phoneticMetaphone: false,
      showTranscript: false,
    }),
    { name: 'jp-flashcards-settings-v1' }
  )
)
