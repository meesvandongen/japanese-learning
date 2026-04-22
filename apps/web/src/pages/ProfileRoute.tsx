import { ProfilePage } from '@japanese-learning/core'
import { useVocabContext } from '../context/VocabularyContext'

export function ProfileRoute() {
  const { words, activeLang, activeLevel } = useVocabContext()

  return <ProfilePage words={words} activeLang={activeLang} activeLevel={activeLevel} />
}
