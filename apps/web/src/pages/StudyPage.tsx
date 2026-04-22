import { StudyPage as CoreStudyPage } from '@japanese-learning/core'
import { useVocabContext } from '../context/VocabularyContext'

/**
 * Web StudyPage — thin wrapper that pipes VocabularyContext into the shared
 * Tamagui StudyPage. The TanStack Router outlet mounts this component.
 */
export function StudyPage() {
  const data = useVocabContext()
  return <CoreStudyPage {...data} />
}
