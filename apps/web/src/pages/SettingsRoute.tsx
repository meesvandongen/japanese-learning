import { useNavigate } from '@tanstack/react-router'
import { SettingsPage } from '@japanese-learning/core'
import { useVocabContext } from '../context/VocabularyContext'

export function SettingsRoute() {
  const { manifest, activeLang, activeLevel } = useVocabContext()
  const navigate = useNavigate()

  return (
    <SettingsPage
      manifest={manifest}
      activeLang={activeLang}
      activeLevel={activeLevel}
      onBackToStudy={() => navigate({ to: '/' })}
    />
  )
}
