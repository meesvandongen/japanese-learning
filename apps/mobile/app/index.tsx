import { useEffect } from 'react'
import { Redirect } from 'expo-router'
import { YStack, Spinner, Text } from 'tamagui'
import { useVocabulary, useAppStore } from '@japanese-learning/core'
import { StudyScreen } from '@/screens/StudyScreen'

/**
 * Root route. Mirrors the web App.tsx onboarding gate:
 *   1. If the manifest is loading, show a spinner.
 *   2. If the user hasn't picked a language/level, route to /onboarding.
 *   3. Otherwise render the study screen.
 */
export default function IndexRoute() {
  const selectedLanguageId = useAppStore((s) => s.selectedLanguageId)
  const selectedLevelId = useAppStore((s) => s.selectedLevelId)

  const { isManifestLoading, isManifestError } = useVocabulary(selectedLanguageId, selectedLevelId)

  useEffect(() => {
    // Nothing to do here; kept as a hook slot for future analytics / prefetch.
  }, [])

  if (isManifestLoading) {
    return (
      <YStack flex={1} alignItems="center" justifyContent="center" backgroundColor="$background">
        <Spinner size="large" />
      </YStack>
    )
  }

  if (isManifestError) {
    return (
      <YStack flex={1} alignItems="center" justifyContent="center" backgroundColor="$background" padding="$4">
        <Text color="$incorrect">Failed to load vocabulary catalog. Check your connection and relaunch.</Text>
      </YStack>
    )
  }

  if (!selectedLanguageId || !selectedLevelId) {
    return <Redirect href="/onboarding" />
  }

  return <StudyScreen />
}
