import { useState } from 'react'
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

/**
 * SettingsPage — lets users change their language/level and configure study
 * preferences after onboarding.
 *
 * Manages its own view state ('overview' | 'language' | 'level') so that
 * language/level changes are committed atomically — the store is only updated
 * once both selections are confirmed, preventing a half-set state from
 * triggering the App-level onboarding gates mid-flow.
 */
export function SettingsPage({ manifest, activeLang, activeLevel, onClose }: Props) {
  const [view, setView] = useState<'overview' | 'language' | 'level'>('overview')
  // pendingLangId tracks a language pick that hasn't been paired with a level yet
  const [pendingLangId, setPendingLangId] = useState<string | null>(null)

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
    // If we entered the level view from language selection, go back to language;
    // if we entered directly (Change Level), go back to overview.
    setView(pendingLangId ? 'language' : 'overview')
  }

  if (view === 'language') {
    return (
      <div className="settings-page">
        <LanguageSelector
          manifest={manifest}
          onSelect={handleLanguagePick}
          onBack={() => setView('overview')}
        />
      </div>
    )
  }

  const displayLang =
    manifest?.languages.find((l) => l.id === pendingLangId) ?? activeLang

  if (view === 'level' && displayLang) {
    return (
      <div className="settings-page">
        <LevelSelector
          language={displayLang}
          onSelect={handleLevelPick}
          onBack={handleBackFromLevel}
        />
      </div>
    )
  }

  // ── Overview ──────────────────────────────────────────────────────────────
  return (
    <div className="settings-page">
      <div className="settings-header">
        <h2>Settings</h2>
        <button className="nav-tab active" onClick={onClose}>
          Done
        </button>
      </div>

      <div className="settings-section">
        <h3 className="settings-section-title">Study selection</h3>

        <div className="settings-row">
          <div className="settings-info">
            <span className="settings-label">Language</span>
            <span className="settings-display-value">{activeLang?.name ?? '—'}</span>
          </div>
          <button className="settings-change-btn" onClick={() => setView('language')}>
            Change
          </button>
        </div>

        <div className="settings-row">
          <div className="settings-info">
            <span className="settings-label">Level</span>
            <span className="settings-display-value">{activeLevel?.label ?? '—'}</span>
          </div>
          <button
            className="settings-change-btn"
            onClick={() => setView('level')}
            disabled={!activeLang}
          >
            Change
          </button>
        </div>
      </div>

      <SettingsPanel />
    </div>
  )
}
