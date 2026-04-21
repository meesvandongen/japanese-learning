import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'
import { storage } from './storage'
import type { CardState } from '../types'

/** Returns the date string (YYYY-MM-DD) for a given timestamp in local time. */
function toDateString(ts: number): string {
  const d = new Date(ts)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

interface AppState {
  cards: Record<string, CardState>
  selectedLanguageId: string | null
  selectedLevelId: string | null
  /** Current streak length in days */
  streakCount: number
  /** ISO date string (YYYY-MM-DD) of the last day the user studied */
  streakLastDate: string | null
  setLanguage: (id: string) => void
  setLevel: (id: string) => void
  applyCardReview: (kana: string, updated: CardState) => void
  /** Record that the user studied today — updates the streak accordingly. */
  recordStudyDay: () => void
  /** Import a streak value (and set lastDate to today so it continues). */
  importStreak: (count: number) => void
  reset: () => void
}

const initialState = {
  cards: {} as Record<string, CardState>,
  selectedLanguageId: null as string | null,
  selectedLevelId: null as string | null,
  streakCount: 0,
  streakLastDate: null as string | null,
}

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      ...initialState,
      setLanguage: (id) => set({ selectedLanguageId: id, selectedLevelId: null }),
      setLevel: (id) => set({ selectedLevelId: id }),
      applyCardReview: (kana, updated) =>
        set((s) => ({ cards: { ...s.cards, [kana]: updated } })),
      recordStudyDay: () =>
        set((s) => {
          const today = toDateString(Date.now())
          if (s.streakLastDate === today) return s // already recorded today

          const yesterday = toDateString(Date.now() - 86_400_000)
          const newCount = s.streakLastDate === yesterday ? s.streakCount + 1 : 1
          return { streakCount: newCount, streakLastDate: today }
        }),
      importStreak: (count) =>
        set({ streakCount: Math.max(0, Math.round(count)), streakLastDate: toDateString(Date.now()) }),
      reset: () => set(initialState),
    }),
    { name: 'jp-flashcards-srs-v1', storage: createJSONStorage(() => storage) }
  )
)
