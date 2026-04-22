import { AppShell, ProfilePage } from '@japanese-learning/core'

export default function ProfileRoute() {
  return (
    <AppShell>
      {({ words, activeLang, activeLevel }) => (
        <ProfilePage words={words} activeLang={activeLang} activeLevel={activeLevel} />
      )}
    </AppShell>
  )
}
