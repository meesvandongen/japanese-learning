import { SettingsPage } from '../components/SettingsPage'
import { useVocabContext } from '../context/VocabularyContext'

export function SettingsRoute() {
  const { manifest, activeLang, activeLevel } = useVocabContext()

  return (
    <SettingsPage
      manifest={manifest}
      activeLang={activeLang}
      activeLevel={activeLevel}
    />
  )
}
