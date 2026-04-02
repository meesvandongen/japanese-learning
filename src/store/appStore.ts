import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { CardState } from '../types'

interface AppState {
  cards: Record<string, CardState>
  selectedLanguageId: string | null
  selectedLevelId: string | null
  setLanguage: (id: string) => void
  setLevel: (id: string) => void
  applyCardReview: (kana: string, updated: CardState) => void
  reset: () => void
}

const initialState = {
  cards: {} as Record<string, CardState>,
  selectedLanguageId: null as string | null,
  selectedLevelId: null as string | null,
}

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      ...initialState,
      setLanguage: (id) => set({ selectedLanguageId: id, selectedLevelId: null }),
      setLevel: (id) => set({ selectedLevelId: id }),
      applyCardReview: (kana, updated) =>
        set((s) => ({ cards: { ...s.cards, [kana]: updated } })),
      reset: () => set(initialState),
    }),
    { name: 'jp-flashcards-srs-v1' }
  )
)
