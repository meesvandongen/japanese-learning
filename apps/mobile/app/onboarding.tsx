import { useState } from 'react'
import { Redirect } from 'expo-router'
import { YStack, H2, Button, Text, Spinner } from 'tamagui'
import { useVocabulary, useAppStore } from '@japanese-learning/core'
import type { Language } from '@japanese-learning/core'

/**
 * Onboarding: pick a language and a level. Once both are set, routing back
 * to "/" hands off to the study screen.
 */
export default function OnboardingRoute() {
  const selectedLanguageId = useAppStore((s) => s.selectedLanguageId)
  const selectedLevelId = useAppStore((s) => s.selectedLevelId)
  const setLanguage = useAppStore((s) => s.setLanguage)
  const setLevel = useAppStore((s) => s.setLevel)

  const { manifest, isManifestLoading } = useVocabulary(selectedLanguageId, selectedLevelId)
  const [stagedLanguageId, setStagedLanguageId] = useState<string | null>(selectedLanguageId)

  if (selectedLanguageId && selectedLevelId) return <Redirect href="/" />

  if (isManifestLoading || !manifest) {
    return (
      <YStack flex={1} alignItems="center" justifyContent="center" backgroundColor="$background">
        <Spinner size="large" />
      </YStack>
    )
  }

  if (!stagedLanguageId) {
    return (
      <YStack flex={1} padding="$4" gap="$4" backgroundColor="$background">
        <H2>Pick a language</H2>
        {manifest.languages.map((lang) => (
          <Button
            key={lang.id}
            onPress={() => {
              setStagedLanguageId(lang.id)
              setLanguage(lang.id)
            }}
          >
            {lang.name}
          </Button>
        ))}
      </YStack>
    )
  }

  const lang = manifest.languages.find((l) => l.id === stagedLanguageId) as Language
  return (
    <YStack flex={1} padding="$4" gap="$4" backgroundColor="$background">
      <H2>Pick a level</H2>
      {lang.levels.map((level) => (
        <Button
          key={level.id}
          onPress={() => setLevel(level.id)}
          flexDirection="column"
          alignItems="flex-start"
          paddingVertical="$3"
        >
          <Text fontWeight="700">{level.label}</Text>
          <Text color="$textMuted">{level.description}</Text>
        </Button>
      ))}
      <Button chromeless onPress={() => setStagedLanguageId(null)}>
        ← Back
      </Button>
    </YStack>
  )
}
