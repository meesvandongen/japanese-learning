import { useCallback } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import type { CardState } from '../types'
import { openDatabase } from '../db/openDatabase'
import { getAllCardStates, putCardState } from '../db/cardState'

/**
 * Hook: returns all card states for a language and an async mutator to save
 * reviews. Card state has moved out of Zustand/localStorage into SQLite — the
 * per-review writes are fast enough (<10ms) that the UI can wait on them.
 *
 * Returns `undefined` (not `{}`) while the initial query is loading so callers
 * can tell the difference between "not loaded yet" and "no cards reviewed yet".
 */
export function useCardStates(languageId: string | null): {
  cards: Record<string, CardState> | undefined
  isLoading: boolean
  applyCardReview: (kana: string, updated: CardState) => Promise<void>
} {
  const queryClient = useQueryClient()

  const { data: cards, isLoading } = useQuery({
    queryKey: ['card_state', languageId],
    queryFn: async () => {
      const db = await openDatabase()
      return getAllCardStates(db, languageId!)
    },
    enabled: !!languageId,
    staleTime: Infinity,
  })

  const applyCardReview = useCallback(async (kana: string, updated: CardState) => {
    if (!languageId) return
    const db = await openDatabase()
    await putCardState(db, languageId, kana, updated)
    queryClient.setQueryData<Record<string, CardState>>(['card_state', languageId], (prev) => ({
      ...(prev ?? {}),
      [kana]: updated,
    }))
  }, [languageId, queryClient])

  return { cards, isLoading, applyCardReview }
}
