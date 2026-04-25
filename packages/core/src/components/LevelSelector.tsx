import { YStack, H2, Button, Text } from 'tamagui'
import type { Language } from '../types'

interface Props {
  language: Language
  onSelect: (levelId: string) => void
  onBack?: () => void
}

/**
 * LevelSelector — shows available levels for a given language.
 * Used during onboarding and inside SettingsPage.
 */
export function LevelSelector({ language, onSelect, onBack }: Props) {
  return (
    <YStack flex={1} padding="$4" gap="$4" backgroundColor="$background">
      {onBack && (
        <Button alignSelf="flex-start" chromeless onPress={onBack}>
          ← Back
        </Button>
      )}
      <H2>Choose your starting level for {language.name}</H2>
      <YStack gap="$2">
        {language.levels.map((level) => (
          <Button
            key={level.id}
            onPress={() => onSelect(level.id)}
            flexDirection="column"
            alignItems="flex-start"
            paddingVertical="$3"
            height="auto"
          >
            <Text fontWeight="700" fontSize="$5">{level.label}</Text>
            {level.description && (
              <Text color="$textMuted" fontSize="$2">{level.description}</Text>
            )}
            <Text color="$textMuted" fontSize="$1">{level.wordCount} words</Text>
          </Button>
        ))}
      </YStack>
    </YStack>
  )
}
