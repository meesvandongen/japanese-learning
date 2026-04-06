import { createContext, useContext } from 'react'
import type { Word, Manifest, Language, Level } from '../types'

export interface VocabData {
  words: Word[]
  isVocabLoading: boolean
  isVocabError: boolean
  manifest: Manifest
  activeLang: Language
  activeLevel: Level
}

const VocabularyContext = createContext<VocabData | null>(null)

export const VocabularyProvider = VocabularyContext.Provider

export function useVocabContext(): VocabData {
  const ctx = useContext(VocabularyContext)
  if (!ctx) throw new Error('useVocabContext must be used within VocabularyProvider')
  return ctx
}
