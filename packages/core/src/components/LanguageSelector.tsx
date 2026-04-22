import { YStack, H2, Button, Text } from 'tamagui'
import type { Manifest } from '../types'

interface Props {
  manifest: Manifest
  onSelect: (languageId: string) => void
  onBack?: () => void
}

/**
 * LanguageSelector — shows available languages from the manifest.
 * Used during onboarding and inside SettingsPage.
 */
export function LanguageSelector({ manifest, onSelect, onBack }: Props) {
  return (
    <YStack flex={1} padding="$4" gap="$4" backgroundColor="$background">
      {onBack && (
        <Button alignSelf="flex-start" chromeless onPress={onBack}>
          ← Back
        </Button>
      )}
      <H2>Choose a language to learn</H2>
      <YStack gap="$2">
        {manifest.languages.map((lang) => (
          <Button
            key={lang.id}
            onPress={() => onSelect(lang.id)}
            flexDirection="column"
            alignItems="flex-start"
            paddingVertical="$3"
            height="auto"
          >
            <Text fontWeight="700" fontSize="$5">{lang.name}</Text>
            <Text color="$textMuted" fontSize="$2">
              {lang.levels.length} level{lang.levels.length !== 1 ? 's' : ''}
            </Text>
          </Button>
        ))}
      </YStack>
    </YStack>
  )
}
