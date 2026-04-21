import { useEffect } from 'react'
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

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: Infinity,
      retry: 2,
    },
  },
})

export default function RootLayout() {
  const [loaded] = useFonts({
    // Tamagui's default theme expects Inter for body text. We ship it as an
    // asset — add the file under assets/fonts/Inter.ttf before shipping.
    Inter: require('../assets/fonts/Inter.ttf'),
  })

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
