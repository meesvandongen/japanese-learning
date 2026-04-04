import { useState, useCallback } from 'react'
import { useKuromoji } from './hooks/useKuromoji'
import { useVocabulary } from './hooks/useVocabulary'
import { FlashcardMode1 } from './components/FlashcardMode1'
import { FlashcardMode4 } from './components/FlashcardMode4'
import { PreviousResult } from './components/PreviousResult'
import type { PreviousResultData } from './components/PreviousResult'
import { SessionStats } from './components/SessionStats'
import { ProfilePage } from './components/ProfilePage'
import { LanguageSelector } from './components/LanguageSelector'
import { LevelSelector } from './components/LevelSelector'
import { SettingsPage } from './components/SettingsPage'
import { useAppStore } from './store/appStore'
import { useSettingsStore } from './store/settingsStore'
import { applyReview } from './srs/sm2'
import { getNextCard, getSessionStats } from './srs/scheduler'
import type { Word, Manifest, Language, Level } from './types'

/**
 * App — onboarding gate and manifest loader.
 *
 * Renders loading/error states and the language/level selectors until the user
 * has made their selections, then hands off to StudyApp which owns all
 * study-specific state. Keeping the onboarding gates here (before StudyApp
 * mounts) means StudyApp's hooks are always called unconditionally.
 */
export default function App() {
  const selectedLanguageId = useAppStore((s) => s.selectedLanguageId)
  const selectedLevelId = useAppStore((s) => s.selectedLevelId)
  const { setLanguage, setLevel } = useAppStore()

  const { words, isManifestLoading, isManifestError, isVocabLoading, isVocabError, manifest, activeLang, activeLevel } =
    useVocabulary(selectedLanguageId, selectedLevelId)

  if (isManifestLoading) {
    return (
      <div className="app">
        <main className="app-main">
          <div className="loading">
            <div className="spinner" />
          </div>
        </main>
      </div>
    )
  }

  if (isManifestError) {
    return (
      <div className="app">
        <main className="app-main">
          <div className="error-msg">
            Failed to load vocabulary catalog. Check your connection and refresh.
          </div>
        </main>
      </div>
    )
  }

  if (!selectedLanguageId) {
    return (
      <div className="app">
        <main className="app-main">
          <LanguageSelector manifest={manifest!} onSelect={setLanguage} />
        </main>
      </div>
    )
  }

  if (!selectedLevelId) {
    return (
      <div className="app">
        <main className="app-main">
          <LevelSelector
            language={activeLang!}
            onSelect={setLevel}
            onBack={() => useAppStore.setState({ selectedLanguageId: null })}
          />
        </main>
      </div>
    )
  }

  return (
    <StudyApp
      words={words}
      isVocabLoading={isVocabLoading}
      isVocabError={isVocabError}
      manifest={manifest}
      activeLang={activeLang}
      activeLevel={activeLevel}
    />
  )
}

interface StudyAppProps {
  words: Word[]
  isVocabLoading: boolean
  isVocabError: boolean
  manifest: Manifest | undefined
  activeLang: Language | undefined
  activeLevel: Level | undefined
}

/**
 * StudyApp — the full app shell, rendered only after onboarding is complete.
 *
 * All hooks here are unconditional — the component is either mounted or not.
 */
function StudyApp({ words, isVocabLoading, isVocabError, manifest, activeLang, activeLevel }: StudyAppProps) {
  const [page, setPage] = useState<'study' | 'profile' | 'settings'>('study')
  const [mode, setMode] = useState<1 | 4>(1)
  const [reviewedCount, setReviewedCount] = useState(0)
  const [lastShownId, setLastShownId] = useState<string | null>(null)
  const [cardKey, setCardKey] = useState(0)
  const [previousResult, setPreviousResult] = useState<PreviousResultData | null>(null)

  const cardStates = useAppStore((s) => s.cards)
  const { applyCardReview, reset } = useAppStore()
  const settings = useSettingsStore()
  const { tokenizer, isLoading: kuromojiLoading, isError: kuromojiError } = useKuromoji()

  const { card, cardType } = getNextCard(words, cardStates, lastShownId)
  const { dueCount, newCount } = getSessionStats(words, cardStates)

  const nextDueDate =
    cardType === 'extra'
      ? Math.min(...words.map((v) => cardStates[v.kana]?.dueDate ?? Infinity).filter(isFinite))
      : null

  const handleAnswer = useCallback(
    (quality: number, heard: string) => {
      const existing = cardStates[card.kana]
      const updated = applyReview(existing, quality)
      applyCardReview(card.kana, updated)
      setPreviousResult({
        japanese: card.japanese,
        kana: card.kana,
        english: card.english,
        result: quality >= 3 ? 'correct' : 'incorrect',
        heard,
        mode,
      })
      setLastShownId(card.kana)
      setReviewedCount((n) => n + 1)
      setCardKey((k) => k + 1)
    },
    [card, cardStates, applyCardReview, mode]
  )

  const handlePreviousOverride = useCallback(
    (quality: number) => {
      if (!previousResult) return
      const existing = cardStates[previousResult.kana]
      const updated = applyReview(existing, quality)
      applyCardReview(previousResult.kana, updated)
      setPreviousResult(null)
    },
    [previousResult, cardStates, applyCardReview]
  )

  function handleModeChange(newMode: 1 | 4) {
    setMode(newMode)
    setLastShownId(null)
    setPreviousResult(null)
    setCardKey((k) => k + 1)
  }

  function handleSettingsClose() {
    setLastShownId(null)
    setReviewedCount(0)
    setPreviousResult(null)
    setCardKey((k) => k + 1)
    setPage('study')
  }

  function handleReset() {
    if (window.confirm('Reset all learning progress? This cannot be undone.')) {
      reset()
      setReviewedCount(0)
      setLastShownId(null)
      setCardKey((k) => k + 1)
      setPage('study')
    }
  }

  return (
    <div className="app">
      <header className="app-header">
        <div className="header-top">
          <h1>
            {activeLang?.name ?? 'Flashcards'}
            {activeLevel && <span className="header-level-badge">{activeLevel.label}</span>}
          </h1>
          <div className="header-actions">
            <button
              className={`nav-tab ${page === 'study' ? 'active' : ''}`}
              onClick={() => setPage('study')}
            >
              Study
            </button>
            <button
              className={`nav-tab ${page === 'profile' ? 'active' : ''}`}
              onClick={() => setPage('profile')}
            >
              Profile
            </button>
            <button
              className={`nav-tab ${page === 'settings' ? 'active' : ''}`}
              onClick={() => setPage('settings')}
            >
              Settings
            </button>
            <button className="reset-btn" onClick={handleReset} title="Reset progress">
              Reset
            </button>
          </div>
        </div>

        {page === 'study' && (
          <nav className="mode-nav">
            <button className={mode === 1 ? 'active' : ''} onClick={() => handleModeChange(1)}>
              Say in Japanese
            </button>
            <button className={mode === 4 ? 'active' : ''} onClick={() => handleModeChange(4)}>
              Translate to English
            </button>
          </nav>
        )}
      </header>

      <main className="app-main">
        {page === 'settings' && (
          <SettingsPage
            manifest={manifest!}
            activeLang={activeLang}
            activeLevel={activeLevel}
            onClose={handleSettingsClose}
          />
        )}

        {page === 'profile' && (
          <ProfilePage words={words} activeLang={activeLang} activeLevel={activeLevel} />
        )}

        {page === 'study' && (
          <>
            {(isVocabLoading || kuromojiLoading) && (
              <div className="loading">
                <div className="spinner" />
                <p>Loading {activeLang?.name ?? ''} dictionary…</p>
                <p className="loading-sub">First load ~20MB — subsequent loads are instant</p>
              </div>
            )}

            {!isVocabLoading && (isVocabError || kuromojiError) && (
              <div className="error-msg">
                Failed to load dictionary. Check your connection and refresh.
              </div>
            )}

            {!isVocabLoading && !isVocabError && !kuromojiLoading && !kuromojiError && (
              <>
                <SessionStats
                  dueCount={dueCount}
                  newCount={newCount}
                  reviewedCount={reviewedCount}
                  nextDueDate={nextDueDate}
                  cardType={cardType}
                />

                {previousResult && settings.manualGrading && (
                  <PreviousResult
                    data={previousResult}
                    manualGrading={settings.manualGrading}
                    onOverride={handlePreviousOverride}
                    onDismiss={() => setPreviousResult(null)}
                  />
                )}

                {mode === 1 && (
                  <FlashcardMode1
                    key={`m1-${cardKey}`}
                    card={card}
                    tokenizer={tokenizer}
                    cardType={cardType}
                    onAnswer={handleAnswer}
                  />
                )}
                {mode === 4 && (
                  <FlashcardMode4
                    key={`m4-${cardKey}`}
                    card={card}
                    cardType={cardType}
                    onAnswer={handleAnswer}
                  />
                )}
              </>
            )}
          </>
        )}
      </main>

      <footer className="app-footer">
        <p>Requires Chrome or Edge · Progress saved automatically</p>
      </footer>
    </div>
  )
}
