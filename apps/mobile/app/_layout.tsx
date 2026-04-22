import { useEffect } from 'react'
import { Platform } from 'react-native'
import { Stack } from 'expo-router'
import { StatusBar } from 'expo-status-bar'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { SafeAreaProvider } from 'react-native-safe-area-context'
import { GestureHandlerRootView } from 'react-native-gesture-handler'
import { TamaguiProvider, Theme } from 'tamagui'
import * as SplashScreen from 'expo-splash-screen'
import { useFonts } from 'expo-font'
import config from '../tamagui.config'

SplashScreen.preventAutoHideAsync().catch(() => { /* ignore */ })

// Service worker registration for the Metro web build. On native this is
// a no-op (no SW, no window). The SW handles stale-while-revalidate caching
// for /dict/* and /vocab.db so repeat visits require no network.
if (Platform.OS === 'web' && typeof window !== 'undefined' && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => { /* non-fatal */ })
  })
}

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: Infinity,
      retry: 2,
    },
  },
})

export default function RootLayout() {
  // expo-font isn't used on web (fonts come in via @expo/html-elements' meta
  // tag injection or the default browser stack). Skip the font load there to
  // avoid a flash of empty content when the file isn't committed yet.
  const [loaded] = useFonts(
    Platform.OS === 'web'
      ? {}
      : { Inter: require('../assets/fonts/Inter.ttf') }
  )

  useEffect(() => {
    if (loaded) SplashScreen.hideAsync().catch(() => { /* ignore */ })
  }, [loaded])

  if (!loaded) return null

  return (
    <QueryClientProvider client={queryClient}>
      <TamaguiProvider config={config} defaultTheme="light">
        <Theme name="light">
          <SafeAreaProvider>
            <GestureHandlerRootView style={{ flex: 1 }}>
              <StatusBar style="auto" />
              <Stack screenOptions={{ headerShown: false }}>
                <Stack.Screen name="index" options={{ title: 'Study' }} />
                <Stack.Screen name="onboarding" options={{ title: 'Get started' }} />
                <Stack.Screen name="settings" options={{ title: 'Settings', presentation: 'modal' }} />
                <Stack.Screen name="profile" options={{ title: 'Profile', presentation: 'modal' }} />
              </Stack>
            </GestureHandlerRootView>
          </SafeAreaProvider>
        </Theme>
      </TamaguiProvider>
    </QueryClientProvider>
  )
}
