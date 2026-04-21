import { useState, useCallback } from 'react'
import { YStack, XStack, H2, Text, Button, Spinner, Card } from 'tamagui'
import { useRouter } from 'expo-router'
import {
  useVocabulary,
  useAppStore,
  useKuromoji,
  useSettingsStore,
  useWakeLock,
  applyReview,
  getNextCard,
  getSessionStats,
} from '@japanese-learning/core'
import { FlashcardSpeak } from './FlashcardSpeak'
import { FlashcardTranslate } from './FlashcardTranslate'

/**
 * Native StudyScreen. Mirrors the web StudyPage contract: owns the SRS
 * card selection, holds session counters, and delegates to one of two
 * flashcard components based on the current mode.
 *
 * Card state still lives in Zustand for Phase 3 — the SQLite-backed
 * useCardStates hook is wired up for the next phase.
 */
export function StudyScreen() {
  const router = useRouter()
  const selectedLanguageId = useAppStore((s) => s.selectedLanguageId)
  const selectedLevelId = useAppStore((s) => s.selectedLevelId)

  const { words, isVocabLoading, isVocabError, activeLang } = useVocabulary(selectedLanguageId, selectedLevelId)
  const { tokenizer, isLoading: kuromojiLoading, isError: kuromojiError } = useKuromoji()

  const [mode, setMode] = useState<'speak' | 'translate'>('speak')
  const [reviewedCount, setReviewedCount] = useState(0)
  const [lastShownId, setLastShownId] = useState<string | null>(null)
  const [cardKey, setCardKey] = useState(0)

  const cardStates = useAppStore((s) => s.cards)
  const streakCount = useAppStore((s) => s.streakCount)
  const applyCardReview = useAppStore((s) => s.applyCardReview)
  const recordStudyDay = useAppStore((s) => s.recordStudyDay)
  const settings = useSettingsStore()
  useWakeLock(settings.keepScreenAwake)

  const handleAnswer = useCallback(
    (quality: number) => {
      const next = getNextCard(words, cardStates, lastShownId)
      const updated = applyReview(cardStates[next.card.kana], quality)
      applyCardReview(next.card.kana, updated)
      recordStudyDay()
      setLastShownId(next.card.kana)
      setReviewedCount((n) => n + 1)
      setCardKey((k) => k + 1)
    },
    [words, cardStates, lastShownId, applyCardReview, recordStudyDay]
  )

  if (isVocabLoading || kuromojiLoading) {
    return (
      <YStack flex={1} alignItems="center" justifyContent="center" backgroundColor="$background" gap="$3">
        <Spinner size="large" />
        <Text>Loading {activeLang?.name ?? ''} dictionary…</Text>
        <Text color="$textMuted" fontSize="$2">First load ~20MB — subsequent launches are instant</Text>
      </YStack>
    )
  }

  if (isVocabError || kuromojiError) {
    return (
      <YStack flex={1} alignItems="center" justifyContent="center" backgroundColor="$background" padding="$4">
        <Text color="$incorrect">Failed to load dictionary. Check your connection and relaunch.</Text>
      </YStack>
    )
  }

  const { card, cardType } = getNextCard(words, cardStates, lastShownId)
  const { dueCount, newCount } = getSessionStats(words, cardStates)

  return (
    <YStack flex={1} backgroundColor="$background" padding="$4" gap="$3">
      <XStack justifyContent="space-between" alignItems="center">
        <H2>{activeLang?.name}</H2>
        <XStack gap="$2">
          <Button size="$2" chromeless onPress={() => router.push('/profile')}>Profile</Button>
          <Button size="$2" chromeless onPress={() => router.push('/settings')}>Settings</Button>
        </XStack>
      </XStack>

      <XStack gap="$2">
        <Button flex={1} theme={mode === 'speak' ? 'active' : null} onPress={() => setMode('speak')}>
          Say in Japanese
        </Button>
        <Button flex={1} theme={mode === 'translate' ? 'active' : null} onPress={() => setMode('translate')}>
          Translate to English
        </Button>
      </XStack>

      <Card padding="$3" gap="$1" borderRadius="$4" backgroundColor="$cardBackground">
        <Text fontSize="$2" color="$textMuted">
          Due: {dueCount} · New: {newCount} · Reviewed: {reviewedCount} · Streak: {streakCount}
        </Text>
        <Text fontSize="$1" color="$textMuted">Type: {cardType}</Text>
      </Card>

      {mode === 'speak' ? (
        <FlashcardSpeak
          key={`speak-${cardKey}`}
          card={card}
          tokenizer={tokenizer}
          cardType={cardType}
          onAnswer={handleAnswer}
        />
      ) : (
        <FlashcardTranslate
          key={`translate-${cardKey}`}
          card={card}
          cardType={cardType}
          onAnswer={handleAnswer}
        />
      )}
    </YStack>
  )
}
