import { useState, useCallback } from 'react'
import { useKuromoji } from './hooks/useKuromoji'
import { FlashcardMode1 } from './components/FlashcardMode1'
import { FlashcardMode4 } from './components/FlashcardMode4'
import { SessionStats } from './components/SessionStats'
import { ProfilePage } from './components/ProfilePage'
import { appStore } from './store/appStore'
import { useStore } from './store/index'
import { applyReview } from './srs/sm2'
import { getNextCard, getSessionStats } from './srs/scheduler'
import vocabulary from './data/vocabulary'

export default function App() {
  const [page, setPage] = useState('study') // 'study' | 'profile'
  const [mode, setMode] = useState(1) // 1 | 4
  const [reviewedCount, setReviewedCount] = useState(0)
  const [lastShownId, setLastShownId] = useState(null)
  const [cardKey, setCardKey] = useState(0)

  const cardStates = useStore(appStore, (s) => s.cards)
  const { tokenizer, isLoading, isError } = useKuromoji()

  const { card, cardType } = getNextCard(vocabulary, cardStates, lastShownId)
  const { dueCount, newCount } = getSessionStats(vocabulary, cardStates)

  const nextDueDate = cardType === 'extra'
    ? Math.min(...vocabulary.map((v) => cardStates[v.kana]?.dueDate).filter(Boolean))
    : null

  const handleAnswer = useCallback(
    (quality) => {
      const existing = cardStates[card.kana]
      const updated = applyReview(existing, quality)
      appStore.setState((s) => ({
        cards: { ...s.cards, [card.kana]: updated },
      }))
      setLastShownId(card.kana)
      setReviewedCount((n) => n + 1)
      setCardKey((k) => k + 1)
    },
    [card, cardStates]
  )

  function handleModeChange(newMode) {
    setMode(newMode)
    setLastShownId(null)
    setCardKey((k) => k + 1)
  }

  function handleReset() {
    if (window.confirm('Reset all learning progress? This cannot be undone.')) {
      appStore.reset()
      setReviewedCount(0)
      setLastShownId(null)
      setCardKey((k) => k + 1)
    }
  }

  return (
    <div className="app">
      <header className="app-header">
        <div className="header-top">
          <h1>Japanese Flashcards</h1>
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
            <button className="reset-btn" onClick={handleReset} title="Reset progress">
              Reset
            </button>
          </div>
        </div>

        {page === 'study' && (
          <nav className="mode-nav">
            <button
              className={mode === 1 ? 'active' : ''}
              onClick={() => handleModeChange(1)}
            >
              Say in Japanese
            </button>
            <button
              className={mode === 4 ? 'active' : ''}
              onClick={() => handleModeChange(4)}
            >
              Translate to English
            </button>
          </nav>
        )}
      </header>

      <main className="app-main">
        {page === 'profile' && <ProfilePage />}

        {page === 'study' && (
          <>
            {isLoading && (
              <div className="loading">
                <div className="spinner" />
                <p>Loading Japanese dictionary…</p>
                <p className="loading-sub">First load ~20MB — subsequent loads are instant</p>
              </div>
            )}

            {isError && (
              <div className="error-msg">
                Failed to load Japanese dictionary. Check your internet connection and refresh.
              </div>
            )}

            {!isLoading && !isError && (
              <>
                <SessionStats
                  dueCount={dueCount}
                  newCount={newCount}
                  reviewedCount={reviewedCount}
                  nextDueDate={nextDueDate}
                  cardType={cardType}
                />

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
