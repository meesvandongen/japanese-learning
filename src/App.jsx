import { useState, useMemo } from 'react'
import { useKuromoji } from './hooks/useKuromoji'
import { FlashcardMode1 } from './components/FlashcardMode1'
import { FlashcardMode4 } from './components/FlashcardMode4'
import vocabulary from './data/vocabulary'

function shuffle(arr) {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

export default function App() {
  const [mode, setMode] = useState(1) // 1 or 4
  const [deck, setDeck] = useState(() => shuffle(vocabulary))
  const [index, setIndex] = useState(0)
  const { tokenizer, isLoading, isError } = useKuromoji()

  const card = deck[index]
  const progress = `${index + 1} / ${deck.length}`

  function handleNext() {
    if (index + 1 >= deck.length) {
      setDeck(shuffle(vocabulary))
      setIndex(0)
    } else {
      setIndex((i) => i + 1)
    }
  }

  function handleModeChange(newMode) {
    setMode(newMode)
    setDeck(shuffle(vocabulary))
    setIndex(0)
  }

  return (
    <div className="app">
      <header className="app-header">
        <h1>Japanese Flashcards</h1>
        <nav className="mode-nav">
          <button
            className={mode === 1 ? 'active' : ''}
            onClick={() => handleModeChange(1)}
          >
            Mode 1: Say in Japanese
          </button>
          <button
            className={mode === 4 ? 'active' : ''}
            onClick={() => handleModeChange(4)}
          >
            Mode 4: Translate to English
          </button>
        </nav>
      </header>

      <main className="app-main">
        {isLoading && (
          <div className="loading">
            <div className="spinner" />
            <p>Loading Japanese dictionary…</p>
            <p className="loading-sub">This may take a moment on first load (~20MB)</p>
          </div>
        )}

        {isError && (
          <div className="error-msg">
            Failed to load Japanese dictionary. Please check your internet connection and refresh.
          </div>
        )}

        {!isLoading && !isError && (
          <>
            <div className="progress">{progress}</div>
            {mode === 1 && (
              <FlashcardMode1
                key={`m1-${index}`}
                card={card}
                tokenizer={tokenizer}
                onNext={handleNext}
              />
            )}
            {mode === 4 && (
              <FlashcardMode4
                key={`m4-${index}`}
                card={card}
                onNext={handleNext}
              />
            )}
          </>
        )}
      </main>

      <footer className="app-footer">
        <p>Requires Chrome or Edge for speech recognition</p>
      </footer>
    </div>
  )
}
