import { useState } from 'react'
import { BlockTitle, List, ListItem, Button } from 'konsta/react'
import { useAppStore } from '../store/appStore'
import { LanguageSelector } from './LanguageSelector'
import { LevelSelector } from './LevelSelector'
import { SettingsPanel } from './SettingsPanel'
import type { Manifest, Language, Level } from '../types'

interface Props {
  manifest: Manifest
  activeLang?: Language
  activeLevel?: Level
  onClose: () => void
}

export function SettingsPage({ manifest, activeLang, activeLevel, onClose }: Props) {
  const [view, setView] = useState<'overview' | 'language' | 'level'>('overview')
  const [pendingLangId, setPendingLangId] = useState<string | null>(null)
  const streakCount = useAppStore((s) => s.streakCount)
  const importStreak = useAppStore((s) => s.importStreak)

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
      <div className="mt-2">
        <Button clear onClick={() => setView('overview')} className="mb-2">Back</Button>
        <LanguageSelector manifest={manifest} onSelect={handleLanguagePick} />
      </div>
    )
  }

  const displayLang =
    manifest?.languages.find((l) => l.id === pendingLangId) ?? activeLang

  if (view === 'level' && displayLang) {
    return (
      <div className="mt-2">
        <Button clear onClick={handleBackFromLevel} className="mb-2">Back</Button>
        <LevelSelector language={displayLang} onSelect={handleLevelPick} />
      </div>
    )
  }

  return (
    <div className="mt-2">
      <div className="flex items-center justify-between mb-2 px-1">
        <h2 className="text-xl font-bold">Settings</h2>
        <Button small rounded onClick={onClose}>Done</Button>
      </div>

      <BlockTitle>Study selection</BlockTitle>
      <List strong inset outline>
        <ListItem
          title="Language"
          after={
            <Button small clear onClick={() => setView('language')}>
              {activeLang?.name ?? '\u2014'} &rsaquo;
            </Button>
          }
        />
        <ListItem
          title="Level"
          after={
            <Button small clear onClick={() => setView('level')} disabled={!activeLang}>
              {activeLevel?.label ?? '\u2014'} &rsaquo;
            </Button>
          }
        />
      </List>

      <BlockTitle>Streak</BlockTitle>
      <List strong inset outline>
        <ListItem
          title="Current streak"
          after={`${streakCount} ${streakCount === 1 ? 'day' : 'days'}`}
        />
        <ListItem
          title="Import streak"
          subtitle="Set your streak to a custom value"
          after={
            <div className="flex items-center gap-2">
              <input
                id="streak-input"
                type="number"
                min="0"
                placeholder="0"
                className="w-16 px-2 py-1 rounded-lg border border-gray-300 text-center text-sm"
                aria-label="Streak value"
              />
              <Button
                small
                tonal
                inline
                onClick={() => {
                  const input = document.getElementById('streak-input') as HTMLInputElement | null
                  const val = Number(input?.value)
                  if (Number.isFinite(val) && val >= 0) {
                    importStreak(val)
                    if (input) input.value = ''
                  }
                }}
              >
                Set
              </Button>
            </div>
          }
        />
      </List>

      <SettingsPanel />
    </div>
  )
}
