import { useCallback, useEffect, useState } from 'react'
import { YStack, XStack, H1, Button, Text, Card } from 'tamagui'
import {
  useSpeechRecognition,
  useSpeechSynthesis,
  useAudioFeedback,
  useSettingsStore,
  compareEnglish,
} from '@japanese-learning/core'
import type { Word } from '@japanese-learning/core'

interface Props {
  card: Word
  cardType: 'due' | 'new' | 'extra'
  onAnswer: (quality: number) => void
}

/**
 * "Translate to English" flashcard. Plays a Japanese TTS prompt, opens the
 * mic, compares the utterance against the accepted English translations
 * via compareEnglish.
 */
export function FlashcardTranslate({ card, cardType, onAnswer }: Props) {
  const settings = useSettingsStore()
  const [result, setResult] = useState<'correct' | 'incorrect' | null>(null)
  const [heard, setHeard] = useState<string>('')
  const { speak } = useSpeechSynthesis()
  const { playCorrect, playIncorrect } = useAudioFeedback()

  const phoneticAlgorithm = settings.phoneticSoundex
    ? (settings.phoneticMetaphone ? 'both' : 'soundex')
    : (settings.phoneticMetaphone ? 'metaphone' : 'off')

  const handleResult = useCallback(
    (transcripts: string[]) => {
      setHeard(transcripts[0] ?? '')
      const correct = compareEnglish(card.english, transcripts, { phoneticAlgorithm })
      setResult(correct ? 'correct' : 'incorrect')
      if (correct) playCorrect()
      else playIncorrect()
    },
    [card, phoneticAlgorithm, playCorrect, playIncorrect]
  )

  const { isListening, start, stop } = useSpeechRecognition({
    lang: 'en-US',
    onResult: handleResult,
    onError: (msg) => { setResult('incorrect'); setHeard(`Error: ${msg}`) },
    contextualStrings: card.english,
  })

  useEffect(() => {
    setResult(null)
    setHeard('')
  }, [card.kana])

  useEffect(() => {
    speak(card.japanese, 'ja-JP', 0.9)
  }, [card.kana, card.japanese, speak])

  return (
    <Card flex={1} padding="$4" gap="$4" borderRadius="$4" backgroundColor="$cardBackground">
      <Text fontSize="$2" color="$textMuted">Card type: {cardType}</Text>
      <YStack flex={1} alignItems="center" justifyContent="center" gap="$3">
        <H1>{card.japanese}</H1>
        <Text color="$textMuted">{card.kana}</Text>
        {card.hint && <Text color="$textMuted">{card.hint}</Text>}
        {result && (
          <YStack alignItems="center" gap="$1">
            <Text color={result === 'correct' ? '$correct' : '$incorrect'} fontWeight="700">
              {result === 'correct' ? '✓ Correct' : '✗ Incorrect'}
            </Text>
            <Text>{card.english.join(', ')}</Text>
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
