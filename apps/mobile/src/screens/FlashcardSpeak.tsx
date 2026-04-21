import { useCallback, useEffect, useState } from 'react'
import { YStack, XStack, H1, Button, Text, Card } from 'tamagui'
import {
  useSpeechRecognition,
  useSpeechSynthesis,
  useAudioFeedback,
  useSettingsStore,
  compareJapanese,
} from '@japanese-learning/core'
import type { Word, KuromojiTokenizer } from '@japanese-learning/core'

interface Props {
  card: Word
  tokenizer: KuromojiTokenizer | undefined
  cardType: 'due' | 'new' | 'extra'
  onAnswer: (quality: number) => void
}

/**
 * "Say in Japanese" flashcard. Plays a TTS prompt, opens the mic, compares
 * the utterance against the card's accepted readings via compareJapanese.
 *
 * Web notes about cloud STT reliability don't apply here — native STT runs
 * on-device via expo-speech-recognition (requiresOnDeviceRecognition: true).
 */
export function FlashcardSpeak({ card, tokenizer, cardType, onAnswer }: Props) {
  const settings = useSettingsStore()
  const [result, setResult] = useState<'correct' | 'incorrect' | null>(null)
  const [heard, setHeard] = useState<string>('')
  const { speak } = useSpeechSynthesis()
  const { playCorrect, playIncorrect } = useAudioFeedback()

  const handleResult = useCallback(
    (transcripts: string[]) => {
      setHeard(transcripts[0] ?? '')
      const expected = [card.kana, card.japanese, ...(card.alt ?? [])]
      const correct = compareJapanese(expected, transcripts, tokenizer ?? null)
      setResult(correct ? 'correct' : 'incorrect')
      if (correct) playCorrect()
      else playIncorrect()
    },
    [card, tokenizer, playCorrect, playIncorrect]
  )

  const { isListening, start, stop } = useSpeechRecognition({
    lang: 'ja-JP',
    onResult: handleResult,
    onError: (msg) => { setResult('incorrect'); setHeard(`Error: ${msg}`) },
    contextualStrings: [card.kana, card.japanese, ...(card.alt ?? [])],
  })

  useEffect(() => {
    setResult(null)
    setHeard('')
  }, [card.kana])

  useEffect(() => {
    // Auto-play the English prompt when the card appears.
    speak(card.english[0] ?? '', 'en-US', 0.9)
  }, [card.kana, card.english, speak])

  return (
    <Card flex={1} padding="$4" gap="$4" borderRadius="$4" backgroundColor="$cardBackground">
      <Text fontSize="$2" color="$textMuted">Card type: {cardType}</Text>
      <YStack flex={1} alignItems="center" justifyContent="center" gap="$3">
        <H1>{card.english.join(', ')}</H1>
        {card.hint && <Text color="$textMuted">{card.hint}</Text>}
        {result && (
          <YStack alignItems="center" gap="$1">
            <Text color={result === 'correct' ? '$correct' : '$incorrect'} fontWeight="700">
              {result === 'correct' ? '✓ Correct' : '✗ Incorrect'}
            </Text>
            <Text>{card.japanese} ({card.kana})</Text>
            {settings.showTranscript && heard && <Text color="$textMuted">Heard: {heard}</Text>}
          </YStack>
        )}
      </YStack>

      <XStack gap="$2" justifyContent="space-between">
        <Button flex={1} onPress={isListening ? stop : start} theme={isListening ? 'red' : 'active'}>
          {isListening ? 'Stop' : 'Record'}
        </Button>
        <Button flex={1} chromeless onPress={() => onAnswer(1)}>I don&apos;t know</Button>
      </XStack>

      {result && (
        <XStack gap="$2">
          <Button flex={1} theme="red" onPress={() => onAnswer(1)}>Again</Button>
          <Button flex={1} onPress={() => onAnswer(3)}>Hard</Button>
          <Button flex={1} onPress={() => onAnswer(4)}>Good</Button>
          <Button flex={1} theme="green" onPress={() => onAnswer(5)}>Easy</Button>
        </XStack>
      )}
    </Card>
  )
}
