import { useQuery } from '@tanstack/react-query'
import type { Manifest, Language, Level, Word } from '../types'
import { openDatabase } from '../db/openDatabase'
import { getManifest } from '../db/manifest'
import { getWords } from '../db/words'

/**
 * Fetches the vocabulary manifest and the active level's word list from SQLite.
 *
 * The database is opened on first access (web fetches and caches `/vocab.db`
 * into OPFS; native copies the bundled asset into the app's data dir). After
 * that, all reads are synchronous-feeling (OPFS/native I/O is fast enough that
 * per-level fetches complete in single-digit ms).
 *
 * The manifest query runs with staleTime: Infinity — it's built once from the
 * DB at app start. Per-level queries cache forever too; the underlying data
 * is immutable for a given manifest version.
 */
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

export function useVocabulary(languageId: string | null, levelId: string | null): UseVocabularyResult {
  const manifestQuery = useQuery({
    queryKey: ['vocab', 'manifest'],
    queryFn: async () => {
      const db = await openDatabase()
      return getManifest(db)
    },
    staleTime: Infinity,
    retry: 2,
  })

  const manifest = manifestQuery.data
  const activeLang = manifest?.languages.find((l) => l.id === languageId)
  const activeLevel = activeLang?.levels.find((l) => l.id === levelId)

  const vocabQuery = useQuery({
    queryKey: ['vocab', languageId, levelId],
    queryFn: async () => {
      const db = await openDatabase()
      return getWords(db, languageId!, levelId!)
    },
    enabled: !!languageId && !!levelId,
    staleTime: Infinity,
    retry: 2,
  })

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
