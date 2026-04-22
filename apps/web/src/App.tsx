import { Outlet, Link, useLocation } from '@tanstack/react-router'
import { AppShell } from '@japanese-learning/core'
import { VocabularyProvider, useVocabContext } from './context/VocabularyContext'
import { YStack, XStack, Text, Anchor } from 'tamagui'

/**
 * RootLayout — AppShell handles the manifest/loading/onboarding gate; this
 * file just wires the Tamagui-free chrome (footer, router outlet) and the
 * VocabularyContext that subroutes read from.
 */
export default function RootLayout() {
  return (
    <AppShell>
      {(data) => (
        <VocabularyProvider value={data}>
          <AppShellFrame />
        </VocabularyProvider>
      )}
    </AppShell>
  )
}

function AppShellFrame() {
  const location = useLocation()
  const { activeLang, activeLevel } = useVocabContext()

  return (
    <YStack flex={1} minHeight="100vh" backgroundColor="$background">
      <XStack
        alignItems="center"
        justifyContent="space-between"
        padding="$3"
        borderBottomWidth={1}
        borderColor="$border"
      >
        {location.pathname === '/' ? (
          <Text fontSize="$5" fontWeight="700">
            {activeLang.name} {activeLevel && <Text color="$textMuted">· {activeLevel.label}</Text>}
          </Text>
        ) : (
          <Link to="/">
            <Text fontSize="$4" color="$primary">← Back</Text>
          </Link>
        )}
        {location.pathname === '/' && (
          <XStack gap="$3">
            <Link to="/profile"><Text color="$primary">Profile</Text></Link>
            <Link to="/settings"><Text color="$primary">Settings</Text></Link>
          </XStack>
        )}
      </XStack>

      <YStack flex={1}>
        <Outlet />
      </YStack>

      <YStack padding="$3" alignItems="center" gap="$1" borderTopWidth={1} borderColor="$border">
        <Text fontSize="$2" color="$textMuted">Progress saved automatically</Text>
        <Text fontSize="$2" color="$textMuted">
          <Anchor
            href="https://github.com/meesvandongen/japanese-learning"
            target="_blank"
            rel="noopener noreferrer"
            color="$primary"
          >
            GitHub
          </Anchor>
          {' · '}
          {__GIT_DATE__}
        </Text>
      </YStack>
    </YStack>
  )
}
