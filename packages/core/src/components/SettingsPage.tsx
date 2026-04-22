import { useState, useRef } from 'react'
import { YStack, XStack, H3, Text, Button, Input, ScrollView, Separator } from 'tamagui'
import { useAppStore } from '../store'
import { LanguageSelector } from './LanguageSelector'
import { LevelSelector } from './LevelSelector'
import { SettingsPanel } from './SettingsPanel'
import type { Manifest, Language, Level } from '../types'

interface Props {
  manifest: Manifest
  activeLang?: Language
  activeLevel?: Level
  onBackToStudy?: () => void
}

/**
 * SettingsPage — lets users change their language/level and configure study
 * preferences after onboarding.
 *
 * Manages its own view state ('overview' | 'language' | 'level') so that
 * language/level changes are committed atomically — the store is only
 * updated once both selections are confirmed.
 */
export function SettingsPage({ manifest, activeLang, activeLevel, onBackToStudy }: Props) {
  const [view, setView] = useState<'overview' | 'language' | 'level'>('overview')
  const [pendingLangId, setPendingLangId] = useState<string | null>(null)
  const streakCount = useAppStore((s) => s.streakCount)
  const importStreak = useAppStore((s) => s.importStreak)
  const reset = useAppStore((s) => s.reset)
  const streakInputRef = useRef<string>('')

  function handleLanguagePick(langId: string) {
    setPendingLangId(langId)
    setView('level')
  }

  function handleLevelPick(levelId: string) {
    const langId = pendingLangId ?? activeLang?.id
    useAppStore.setState({ selectedLanguageId: langId ?? null, selectedLevelId: levelId })
    setPendingLangId(null)
    setView('overview')
  }

  function handleBackFromLevel() {
    setPendingLangId(null)
    setView(pendingLangId ? 'language' : 'overview')
  }

  if (view === 'language') {
    return (
      <LanguageSelector
        manifest={manifest}
        onSelect={handleLanguagePick}
        onBack={() => setView('overview')}
      />
    )
  }

  const displayLang = manifest.languages.find((l) => l.id === pendingLangId) ?? activeLang
  if (view === 'level' && displayLang) {
    return (
      <LevelSelector
        language={displayLang}
        onSelect={handleLevelPick}
        onBack={handleBackFromLevel}
      />
    )
  }

  function handleReset() {
    reset()
    onBackToStudy?.()
  }

  return (
    <ScrollView flex={1} backgroundColor="$background">
      <YStack padding="$4" gap="$4">
        <YStack gap="$2">
          <H3>Study selection</H3>
          <XStack alignItems="center" justifyContent="space-between">
            <YStack flex={1}>
              <Text color="$textMuted" fontSize="$2">Language</Text>
              <Text fontWeight="600">{activeLang?.name ?? '—'}</Text>
            </YStack>
            <Button size="$2" onPress={() => setView('language')}>Change</Button>
          </XStack>
          <XStack alignItems="center" justifyContent="space-between">
            <YStack flex={1}>
              <Text color="$textMuted" fontSize="$2">Level</Text>
              <Text fontWeight="600">{activeLevel?.label ?? '—'}</Text>
            </YStack>
            <Button size="$2" onPress={() => setView('level')} disabled={!activeLang}>
              Change
            </Button>
          </XStack>
        </YStack>

        <Separator />

        <YStack gap="$2">
          <H3>Streak</H3>
          <XStack alignItems="center" justifyContent="space-between">
            <YStack flex={1}>
              <Text color="$textMuted" fontSize="$2">Current streak</Text>
              <Text fontWeight="600">
                {streakCount} {streakCount === 1 ? 'day' : 'days'}
              </Text>
            </YStack>
          </XStack>
          <XStack alignItems="center" gap="$2">
            <YStack flex={1}>
              <Text color="$textMuted" fontSize="$2">Import streak</Text>
              <Text color="$textMuted" fontSize="$1">Set your streak to a custom value</Text>
            </YStack>
            <Input
              width={80}
              keyboardType="numeric"
              placeholder="0"
              onChangeText={(v) => { streakInputRef.current = v }}
            />
            <Button
              size="$2"
              onPress={() => {
                const val = Number(streakInputRef.current)
                if (Number.isFinite(val) && val >= 0) importStreak(val)
              }}
            >
              Set
            </Button>
          </XStack>
        </YStack>

        <Separator />

        <SettingsPanel />

        <Separator />

        <YStack gap="$2">
          <H3 color="$incorrect">Danger zone</H3>
          <Button theme="red" onPress={handleReset}>Reset all progress</Button>
        </YStack>
      </YStack>
    </ScrollView>
  )
}
