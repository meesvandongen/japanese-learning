import { YStack, XStack, Text, Spinner, H2 } from 'tamagui'
import { useAppStore } from '../store'
import { useVocabulary } from '../hooks'
import { LanguageSelector } from './LanguageSelector'
import { LevelSelector } from './LevelSelector'

export interface AppShellChildrenProps {
  words: import('../types').Word[]
  isVocabLoading: boolean
  isVocabError: boolean
  manifest: import('../types').Manifest
  activeLang: import('../types').Language
  activeLevel: import('../types').Level
}

interface Props {
  children: (data: AppShellChildrenProps) => React.ReactNode
}

/**
 * AppShell — onboarding gate shared between web and native.
 *
 * Renders loading/error states and the language/level selectors until both
 * selections are persisted, then calls `children` with the fetched vocab
 * payload. The consumer renders whatever layout they want on top (e.g.
 * header + router outlet on web, Expo Router Stack on native).
 */
export function AppShell({ children }: Props) {
  const selectedLanguageId = useAppStore((s) => s.selectedLanguageId)
  const selectedLevelId = useAppStore((s) => s.selectedLevelId)
  const setLanguage = useAppStore((s) => s.setLanguage)
  const setLevel = useAppStore((s) => s.setLevel)

  const {
    words,
    isManifestLoading,
    isManifestError,
    isVocabLoading,
    isVocabError,
    manifest,
    activeLang,
    activeLevel,
  } = useVocabulary(selectedLanguageId, selectedLevelId)

  if (isManifestLoading) {
    return (
      <YStack flex={1} alignItems="center" justifyContent="center" backgroundColor="$background">
        <Spinner size="large" />
      </YStack>
    )
  }

  if (isManifestError || !manifest) {
    return (
      <YStack
        flex={1}
        alignItems="center"
        justifyContent="center"
        backgroundColor="$background"
        padding="$4"
      >
        <Text color="$incorrect">
          Failed to load vocabulary catalog. Check your connection and refresh.
        </Text>
      </YStack>
    )
  }

  if (!selectedLanguageId) {
    return <LanguageSelector manifest={manifest} onSelect={setLanguage} />
  }

  if (!selectedLevelId || !activeLang) {
    return (
      <LevelSelector
        language={activeLang!}
        onSelect={setLevel}
        onBack={() => useAppStore.setState({ selectedLanguageId: null })}
      />
    )
  }

  return (
    <YStack flex={1} backgroundColor="$background">
      {children({
        words,
        isVocabLoading,
        isVocabError,
        manifest,
        activeLang: activeLang!,
        activeLevel: activeLevel!,
      })}
    </YStack>
  )
}

/**
 * Simple header used by the web RootLayout; native uses Expo Router's
 * Stack.Screen headers. Kept here because it's pure Tamagui and shared
 * across web + native-web.
 */
export function AppHeader({
  title,
  children,
}: {
  title: string
  children?: React.ReactNode
}) {
  return (
    <XStack
      alignItems="center"
      justifyContent="space-between"
      padding="$3"
      borderBottomWidth={1}
      borderColor="$border"
      backgroundColor="$background"
    >
      <H2 fontSize="$6">{title}</H2>
      {children && <XStack gap="$2">{children}</XStack>}
    </XStack>
  )
}
