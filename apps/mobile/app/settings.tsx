import { YStack, H2, Text, Button, Separator } from 'tamagui'
import { useRouter } from 'expo-router'
import { useAppStore, useSettingsStore } from '@japanese-learning/core'

/**
 * Settings screen. Minimal port of the web SettingsPage — tokens and layout
 * come from Tamagui primitives. Language / level picking delegates back to
 * the onboarding route so the selection UI is shared.
 */
export default function SettingsRoute() {
  const router = useRouter()
  const streakCount = useAppStore((s) => s.streakCount)
  const reset = useAppStore((s) => s.reset)
  const settings = useSettingsStore()

  return (
    <YStack flex={1} padding="$4" gap="$4" backgroundColor="$background">
      <H2>Settings</H2>

      <YStack gap="$2">
        <Text fontWeight="700">Streak</Text>
        <Text>{streakCount} {streakCount === 1 ? 'day' : 'days'}</Text>
      </YStack>

      <Separator />

      <YStack gap="$2">
        <Text fontWeight="700">Feedback</Text>
        <Text color="$textMuted">Voice: {settings.feedbackVoice ? 'on' : 'off'}</Text>
        <Text color="$textMuted">Sound: {settings.feedbackSound ? 'on' : 'off'}</Text>
      </YStack>

      <Separator />

      <Button
        onPress={() => {
          useAppStore.setState({ selectedLanguageId: null, selectedLevelId: null })
          router.replace('/onboarding')
        }}
      >
        Change language / level
      </Button>

      <Button theme="red" onPress={reset}>
        Reset all progress
      </Button>
    </YStack>
  )
}
