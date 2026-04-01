import { useState } from 'react'
import { appStore } from '../store/appStore'
import { LanguageSelector } from './LanguageSelector'
import { LevelSelector } from './LevelSelector'

/**
 * SettingsPage — lets users change their language and level after onboarding.
 *
 * Manages its own view state ('overview' | 'language' | 'level') so that
 * language/level changes are committed atomically — the store is only updated
 * once both selections are confirmed, preventing a half-set state from
 * triggering the App-level onboarding gates mid-flow.
 *
 * Props:
 *   manifest     — fetched manifest object
 *   activeLang   — current language entry from manifest
 *   activeLevel  — current level entry from manifest
 *   onClose      — called when the user taps Done
 */
export function SettingsPage({ manifest, activeLang, activeLevel, onClose }) {
  const [view, setView] = useState('overview') // 'overview' | 'language' | 'level'
  // pendingLangId tracks a language pick that hasn't been paired with a level yet
  const [pendingLangId, setPendingLangId] = useState(null)

  function handleLanguagePick(langId) {
    setPendingLangId(langId)
    setView('level')
  }

  function handleLevelPick(levelId) {
    const langId = pendingLangId ?? activeLang?.id
    appStore.setState({ selectedLanguageId: langId, selectedLevelId: levelId })
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
            <span className="settings-value">{activeLang?.name ?? '—'}</span>
          </div>
          <button className="settings-change-btn" onClick={() => setView('language')}>
            Change
          </button>
        </div>

        <div className="settings-row">
          <div className="settings-info">
            <span className="settings-label">Level</span>
            <span className="settings-value">{activeLevel?.label ?? '—'}</span>
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
    </div>
  )
}
