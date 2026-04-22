import { useState, useCallback } from 'react'
import { YStack, XStack, Text, Button, Spinner } from 'tamagui'
import { FlashcardMode1 } from './FlashcardMode1'
import { FlashcardMode4 } from './FlashcardMode4'
import { PreviousResult } from './PreviousResult'
import type { PreviousResultData } from './PreviousResult'
import { SessionStats } from './SessionStats'
import { useKuromoji, useWakeLock } from '../hooks'
import { useAppStore, useSettingsStore } from '../store'
import { applyReview, getNextCard, getSessionStats } from '../srs'
import type { Manifest, Language, Level, Word } from '../types'

interface Props {
  words: Word[]
  isVocabLoading: boolean
  isVocabError: boolean
  manifest: Manifest
  activeLang: Language
  activeLevel: Level
}

/**
 * StudyPage — the main flashcard loop. Platform-agnostic: takes its vocab
 * data as props so the caller (web RootLayout or mobile StudyRoute) can
 * handle the data-fetch + onboarding gate however it prefers.
 */
export function StudyPage({ words, isVocabLoading, isVocabError, activeLang }: Props) {
  const [mode, setMode] = useState<1 | 4>(1)
  const [reviewedCount, setReviewedCount] = useState(0)
  const [lastShownId, setLastShownId] = useState<string | null>(null)
  const [cardKey, setCardKey] = useState(0)
  const [previousResult, setPreviousResult] = useState<PreviousResultData | null>(null)

  const cardStates = useAppStore((s) => s.cards)
  const streakCount = useAppStore((s) => s.streakCount)
  const applyCardReview = useAppStore((s) => s.applyCardReview)
  const recordStudyDay = useAppStore((s) => s.recordStudyDay)
  const settings = useSettingsStore()
  useWakeLock(settings.autoListen && settings.keepScreenAwake)
  const { tokenizer, isLoading: kuromojiLoading, isError: kuromojiError } = useKuromoji()

  const { card, cardType } = getNextCard(words, cardStates, lastShownId)
  const { dueCount, newCount } = getSessionStats(words, cardStates)

  const nextDueDate = cardType === 'extra'
    ? Math.min(
        ...words.map((v) => cardStates[v.kana]?.dueDate ?? Infinity).filter((v) => Number.isFinite(v))
      )
    : null

  const handleAnswer = useCallback(
    (quality: number, heard: string, skipped: boolean) => {
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
        skipped,
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
      setPreviousResult({
        ...previousResult,
        result: quality >= 3 ? 'correct' : 'incorrect',
      })
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
    <YStack flex={1} padding="$3" gap="$3" backgroundColor="$background">
      <XStack gap="$2">
        <Button
          flex={1}
          theme={mode === 1 ? 'active' : null}
          onPress={() => handleModeChange(1)}
        >
          Say in Japanese
        </Button>
        <Button
          flex={1}
          theme={mode === 4 ? 'active' : null}
          onPress={() => handleModeChange(4)}
        >
          Translate to English
        </Button>
      </XStack>

      {(isVocabLoading || kuromojiLoading) && (
        <YStack alignItems="center" gap="$2" padding="$4">
          <Spinner size="large" />
          <Text>Loading {activeLang.name} dictionary…</Text>
          <Text color="$textMuted" fontSize="$2">
            First load ~20MB — subsequent loads are instant
          </Text>
        </YStack>
      )}

      {!isVocabLoading && (isVocabError || kuromojiError) && (
        <Text color="$incorrect" textAlign="center">
          Failed to load dictionary. Check your connection and refresh.
        </Text>
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
    </YStack>
  )
}
