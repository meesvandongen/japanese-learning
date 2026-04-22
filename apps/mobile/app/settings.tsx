import { useRouter } from 'expo-router'
import { AppShell, SettingsPage } from '@japanese-learning/core'

/**
 * Settings route. Reuses the shared SettingsPage and wraps it with AppShell
 * so the manifest / activeLang data is available.
 */
export default function SettingsRoute() {
  const router = useRouter()
  return (
    <AppShell>
      {({ manifest, activeLang, activeLevel }) => (
        <SettingsPage
          manifest={manifest}
          activeLang={activeLang}
          activeLevel={activeLevel}
          onBackToStudy={() => router.replace('/')}
        />
      )}
    </AppShell>
  )
}
