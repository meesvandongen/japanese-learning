import { useState, useRef } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { useAppStore } from '@japanese-learning/core'
import type { Manifest, Language, Level } from '@japanese-learning/core'
import { LanguageSelector } from './LanguageSelector'
import { LevelSelector } from './LevelSelector'
import { SettingsPanel } from './SettingsPanel'

interface Props {
  manifest: Manifest
  activeLang?: Language
  activeLevel?: Level
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
export function SettingsPage({ manifest, activeLang, activeLevel }: Props) {
  const [view, setView] = useState<'overview' | 'language' | 'level'>('overview')
  const [pendingLangId, setPendingLangId] = useState<string | null>(null)
  const streakCount = useAppStore((s) => s.streakCount)
  const importStreak = useAppStore((s) => s.importStreak)
  const reset = useAppStore((s) => s.reset)
  const navigate = useNavigate()
  const streakInputRef = useRef<HTMLInputElement>(null)

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

  function handleReset() {
    if (window.confirm('Reset all learning progress? This cannot be undone.')) {
      reset()
      navigate({ to: '/' })
    }
  }

  // ── Overview ──────────────────────────────────────────────────────────────
  return (
    <div className="settings-page">
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

      <div className="settings-section">
        <h3 className="settings-section-title">Streak</h3>
        <div className="settings-row">
          <div className="settings-info">
            <span className="settings-label">Current streak</span>
            <span className="settings-display-value">{streakCount} {streakCount === 1 ? 'day' : 'days'}</span>
          </div>
        </div>
        <div className="settings-row">
          <div className="settings-info">
            <span className="settings-label">Import streak</span>
            <span className="settings-hint">Set your streak to a custom value</span>
          </div>
          <div className="streak-import-row">
            <input
              ref={streakInputRef}
              type="number"
              min="0"
              className="streak-input"
              placeholder="0"
              aria-label="Streak value"
            />
            <button
              className="settings-change-btn"
              onClick={() => {
                const val = Number(streakInputRef.current?.value)
                if (Number.isFinite(val) && val >= 0) {
                  importStreak(val)
                  if (streakInputRef.current) streakInputRef.current.value = ''
                }
              }}
            >
              Set
            </button>
          </div>
        </div>
      </div>

      <SettingsPanel />

      <section className="settings-group">
        <h3 className="settings-group-title">Danger zone</h3>
        <button className="reset-btn-settings" onClick={handleReset}>
          Reset all progress
        </button>
      </section>
    </div>
  )
}
