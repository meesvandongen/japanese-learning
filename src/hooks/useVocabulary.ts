import { useEffect } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import type { Manifest, Language, Level, Word } from '../types'

async function fetchManifest(): Promise<Manifest> {
  const res = await fetch('/vocab/manifest.json')
  if (!res.ok) throw new Error('Failed to load vocabulary manifest')
  return res.json() as Promise<Manifest>
}

async function fetchLevel(file: string, version: number): Promise<Word[]> {
  const res = await fetch(`/vocab/${file}?v=${version}`)
  if (!res.ok) throw new Error(`Failed to load vocabulary: /vocab/${file}`)
  const data = await res.json() as { words: Word[] }
  return data.words
}

interface UseVocabularyResult {
  words: Word[]
  isManifestLoading: boolean
  isManifestError: boolean
  isVocabLoading: boolean
  isVocabError: boolean
  manifest: Manifest | undefined
  activeLang: Language | undefined
  activeLevel: Level | undefined
}

/**
 * Fetches the vocabulary manifest and the active level's word list.
 *
 * The manifest is always fetched (staleTime: Infinity — cached for the session).
 * The level file is fetched only once languageId and levelId are both provided.
 * The next level is prefetched in the background to make level transitions instant.
 */
export function useVocabulary(languageId: string | null, levelId: string | null): UseVocabularyResult {
  const queryClient = useQueryClient()

  // ── Manifest ──────────────────────────────────────────────────────────────
  const manifestQuery = useQuery({
    queryKey: ['vocab', 'manifest'],
    queryFn: fetchManifest,
    staleTime: Infinity,
    retry: 2,
  })

  const manifest = manifestQuery.data
  const activeLang = manifest?.languages.find((l) => l.id === languageId)
  const activeLevel = activeLang?.levels.find((l) => l.id === levelId)
  const activeLevelIdx = activeLang?.levels.findIndex((l) => l.id === levelId) ?? -1
  const nextLevel = activeLang?.levels[activeLevelIdx + 1] ?? null

  // ── Level word list ────────────────────────────────────────────────────────
  const vocabQuery = useQuery({
    queryKey: ['vocab', languageId, levelId],
    queryFn: () => fetchLevel(activeLevel!.file, manifest!.version),
    enabled: !!activeLevel && !!manifest,
    staleTime: Infinity,
    retry: 2,
  })

  // ── Prefetch next level in background ────────────────────────────────────
  useEffect(() => {
    if (!nextLevel || !manifest) return
    queryClient.prefetchQuery({
      queryKey: ['vocab', languageId, nextLevel.id],
      queryFn: () => fetchLevel(nextLevel.file, manifest.version),
      staleTime: Infinity,
    })
  // oxlint-disable-next-line react-hooks/exhaustive-deps -- primitive deps (?.id, ?.version)
  // intentionally used to avoid re-running on every render when objects change identity
  }, [nextLevel?.id, languageId, manifest?.version, queryClient])

  return {
    words: vocabQuery.data ?? [],
    isManifestLoading: manifestQuery.isLoading,
    isManifestError: manifestQuery.isError,
    isVocabLoading: !!activeLevel && vocabQuery.isLoading,
    isVocabError: vocabQuery.isError,
    manifest,
    activeLang,
    activeLevel,
  }
}
