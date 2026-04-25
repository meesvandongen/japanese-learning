import { Redirect } from 'expo-router'

/**
 * Onboarding route. Now that AppShell (in packages/core) handles the
 * language/level picker inline, the dedicated onboarding route just
 * redirects back to "/" which short-circuits into the picker when
 * selectedLanguageId or selectedLevelId is still null.
 */
export default function OnboardingRoute() {
  return <Redirect href="/" />
}
