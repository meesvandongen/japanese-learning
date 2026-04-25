import { useRouter } from 'expo-router'
import { AppShell, AppHeader, StudyPage } from '@japanese-learning/core'
import { Button } from 'tamagui'

/**
 * Root route. Renders the StudyPage once onboarding is complete. AppShell
 * from core handles the manifest load + language/level picker, then hands
 * off vocab data to the study UI.
 */
export default function IndexRoute() {
  const router = useRouter()
  return (
    <AppShell>
      {(data) => (
        <>
          <AppHeader title={data.activeLang.name}>
            <Button size="$2" chromeless onPress={() => router.push('/profile')}>Profile</Button>
            <Button size="$2" chromeless onPress={() => router.push('/settings')}>Settings</Button>
          </AppHeader>
          <StudyPage {...data} />
        </>
      )}
    </AppShell>
  )
}
