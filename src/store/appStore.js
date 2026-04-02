import { create } from 'zustand'
import { persist } from 'zustand/middleware'

const initialState = {
  cards: {},
  selectedLanguageId: null,
  selectedLevelId: null,
}

export const useAppStore = create(
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
