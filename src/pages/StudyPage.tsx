import { useState, useCallback } from 'react'
import { useKuromoji } from '../hooks/useKuromoji'
import { FlashcardMode1 } from '../components/FlashcardMode1'
import { FlashcardMode4 } from '../components/FlashcardMode4'
import { PreviousResult } from '../components/PreviousResult'
import type { PreviousResultData } from '../components/PreviousResult'
import { SessionStats } from '../components/SessionStats'
import { useAppStore } from '../store/appStore'
import { useSettingsStore } from '../store/settingsStore'
import { applyReview } from '../srs/sm2'
import { getNextCard, getSessionStats } from '../srs/scheduler'
import { useVocabContext } from '../context/VocabularyContext'

export function StudyPage() {
  const { words, isVocabLoading, isVocabError, activeLang } = useVocabContext()

  const [mode, setMode] = useState<1 | 4>(1)
  const [reviewedCount, setReviewedCount] = useState(0)
  const [lastShownId, setLastShownId] = useState<string | null>(null)
  const [cardKey, setCardKey] = useState(0)
  const [previousResult, setPreviousResult] = useState<PreviousResultData | null>(null)

  const cardStates = useAppStore((s) => s.cards)
  const streakCount = useAppStore((s) => s.streakCount)
  const { applyCardReview, recordStudyDay } = useAppStore()
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
      recordStudyDay()
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
    [card, cardStates, applyCardReview, recordStudyDay, mode]
  )

  const handlePreviousOverride = useCallback(
    (quality: number) => {
      if (!previousResult) return
      const existing = cardStates[previousResult.kana]
      const updated = applyReview(existing, quality)
      applyCardReview(previousResult.kana, updated)
      setPreviousResult({ ...previousResult, result: quality >= 3 ? 'correct' : 'incorrect' })
    },
    [previousResult, cardStates, applyCardReview]
  )

  function handleModeChange(newMode: 1 | 4) {
    setMode(newMode)
    setLastShownId(null)
    setPreviousResult(null)
    setCardKey((k) => k + 1)
  }

  return (
    <>
      <nav className="mode-nav">
        <button className={mode === 1 ? 'active' : ''} onClick={() => handleModeChange(1)}>
          Say in Japanese
        </button>
        <button className={mode === 4 ? 'active' : ''} onClick={() => handleModeChange(4)}>
          Translate to English
        </button>
      </nav>

      {(isVocabLoading || kuromojiLoading) && (
        <div className="loading">
          <div className="spinner" />
          <p>Loading {activeLang.name} dictionary…</p>
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
            streakCount={streakCount}
          />

          {previousResult && settings.manualGrading && (
            <PreviousResult
              data={previousResult}
              manualGrading={settings.manualGrading}
              onOverride={handlePreviousOverride}
            />
          )}

          {mode === 1 && (
            <FlashcardMode1
              key={`m1-${cardKey}`}
              card={card}
              words={words}
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
  )
}
