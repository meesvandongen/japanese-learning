import { useEffect } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'

async function fetchManifest() {
  const res = await fetch('/vocab/manifest.json')
  if (!res.ok) throw new Error('Failed to load vocabulary manifest')
  return res.json()
}

async function fetchLevel(file, version) {
  const res = await fetch(`/vocab/${file}?v=${version}`)
  if (!res.ok) throw new Error(`Failed to load vocabulary: /vocab/${file}`)
  const data = await res.json()
  return data.words
}

/**
 * Fetches the vocabulary manifest and the active level's word list.
 *
 * The manifest is always fetched (staleTime: Infinity — cached for the session).
 * The level file is fetched only once languageId and levelId are both provided.
 * The next level is prefetched in the background to make level transitions instant.
 *
 * @param {string|null} languageId  — from store.selectedLanguageId
 * @param {string|null} levelId     — from store.selectedLevelId
 */
export function useVocabulary(languageId, levelId) {
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
    queryFn: () => fetchLevel(activeLevel.file, manifest.version),
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
