import { useState, useCallback, useEffect, useRef } from 'react'
import { YStack, XStack, Text, Button, Card } from 'tamagui'
import { RecordButton } from './RecordButton'
import { CardTypeBadge } from './CardTypeBadge'
import { FlashcardFeedback } from './FlashcardFeedback'
import { useSpeechRecognition, useSpeechSynthesis, useAudioFeedback } from '../hooks'
import { useSettingsStore } from '../store'
import { compareEnglish, buildReportUrl } from '../utils'
import type { Word } from '../types'

interface Props {
  card: Word
  cardType: 'due' | 'new' | 'extra'
  onAnswer: (quality: number, heard: string, skipped: boolean) => void
}

/**
 * Translate-to-English mode. Japanese prompt → user speaks English →
 * compare with phonetic tolerance.
 */
export function FlashcardMode4({ card, cardType, onAnswer }: Props) {
  const [result, setResult] = useState<'correct' | 'incorrect' | null>(null)
  const [heard, setHeard] = useState('')
  const [skipped, setSkipped] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')
  const [correctionPhase, setCorrectionPhase] = useState(false)
  const [correctionHeard, setCorrectionHeard] = useState('')
  const [correctionResult, setCorrectionResult] = useState<'correct' | 'incorrect' | null>(null)
  const settings = useSettingsStore()
  const { isSpeaking, speak } = useSpeechSynthesis()
  const { playCorrect, playIncorrect } = useAudioFeedback()
  const autoStarted = useRef(false)
  const advanceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const phoneticAlgorithm: 'off' | 'soundex' | 'metaphone' | 'both' =
    settings.phoneticSoundex && settings.phoneticMetaphone ? 'both'
      : settings.phoneticSoundex ? 'soundex'
      : settings.phoneticMetaphone ? 'metaphone'
      : 'off'

  const applyResult = useCallback(
    (correct: boolean, transcript: string) => {
      setResult(correct ? 'correct' : 'incorrect')
      setHeard(transcript)
      if (settings.feedbackSound) {
        if (correct) playCorrect(); else playIncorrect()
      }
      if (settings.feedbackVoice) {
        const primaryEnglish = Array.isArray(card.english) ? card.english[0] : card.english
        speak(primaryEnglish, 'en-US')
      }
    },
    [card, settings.feedbackSound, settings.feedbackVoice, speak, playCorrect, playIncorrect]
  )

  const { isListening, start, stop } = useSpeechRecognition({
    lang: 'en-US',
    onResult: (transcripts) => {
      applyResult(
        compareEnglish(card.english, transcripts, { phoneticAlgorithm }),
        transcripts[0] ?? ''
      )
    },
    onError: setErrorMsg,
    contextualStrings: card.english,
  })

  // Speak the Japanese word on card load
  useEffect(() => {
    if (settings.japaneseExerciseMode === 'text') {
      if (settings.autoListen && !autoStarted.current) {
        autoStarted.current = true
        const timer = setTimeout(() => start(), settings.autoStartDelay)
        return () => clearTimeout(timer)
      }
      return
    }

    const timer = setTimeout(() => {
      speak(card.japanese, 'ja-JP', 0.9, () => {
        if (settings.autoListen && !autoStarted.current) {
          autoStarted.current = true
          setTimeout(() => start(), settings.autoStartDelay)
        }
      })
    }, 300)
    return () => clearTimeout(timer)
  // oxlint-disable-next-line react-hooks/exhaustive-deps -- fires only on card change
  }, [card, speak])

  useEffect(() => {
    if (isSpeaking && isListening) stop()
  }, [isSpeaking, isListening, stop])

  useEffect(() => {
    if (!isListening || !settings.maxListenDuration) return
    const timer = setTimeout(() => stop(), settings.maxListenDuration)
    return () => clearTimeout(timer)
  }, [isListening, settings.maxListenDuration, stop])

  const correction = useSpeechRecognition({
    lang: 'en-US',
    onResult: (transcripts) => {
      const correct = compareEnglish(card.english, transcripts, { phoneticAlgorithm })
      setCorrectionHeard(transcripts[0] ?? '')
      setCorrectionResult(correct ? 'correct' : 'incorrect')
      if (correct) {
        if (settings.feedbackSound) playCorrect()
      } else {
        if (settings.feedbackSound) playIncorrect()
        if (settings.feedbackVoice) {
          const primaryEnglish = Array.isArray(card.english) ? card.english[0] : card.english
          speak(primaryEnglish, 'en-US')
        }
      }
    },
    onError: setErrorMsg,
    contextualStrings: card.english,
  })

  useEffect(() => {
    if (isSpeaking && correction.isListening) correction.stop()
  }, [isSpeaking, correction.isListening, correction.stop]) // oxlint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (result === 'incorrect' && settings.speakToCorrect) setCorrectionPhase(true)
  }, [result, settings.speakToCorrect])

  useEffect(() => {
    if (!correctionPhase || correctionResult === 'correct') return
    if (!settings.autoListen) return
    if (isSpeaking) return
    const timer = setTimeout(() => correction.start(), settings.autoStartDelay)
    return () => clearTimeout(timer)
  }, [correctionPhase, correctionResult, settings.autoListen, settings.autoStartDelay, isSpeaking]) // oxlint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!correction.isListening || !settings.maxListenDuration) return
    const timer = setTimeout(() => correction.stop(), settings.maxListenDuration)
    return () => clearTimeout(timer)
  }, [correction.isListening, settings.maxListenDuration, correction.stop]) // oxlint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!result) return
    if (result === 'incorrect' && settings.speakToCorrect) return
    const delay = result === 'correct' ? 1200 : 2500
    advanceTimerRef.current = setTimeout(
      () => onAnswer(result === 'correct' ? 4 : 1, heard, skipped),
      delay
    )
    return () => {
      if (advanceTimerRef.current) clearTimeout(advanceTimerRef.current)
    }
  }, [result, heard, skipped, onAnswer, settings.speakToCorrect])

  useEffect(() => {
    if (correctionResult !== 'correct') return
    advanceTimerRef.current = setTimeout(() => onAnswer(1, heard, skipped), 1200)
    return () => {
      if (advanceTimerRef.current) clearTimeout(advanceTimerRef.current)
    }
  }, [correctionResult, heard, skipped, onAnswer])

  function overrideGrade(quality: number) {
    if (advanceTimerRef.current) clearTimeout(advanceTimerRef.current)
    onAnswer(quality, heard, skipped)
  }

  const primaryEnglish = Array.isArray(card.english) ? card.english[0] : card.english
  const showJapaneseText = settings.japaneseExerciseMode !== 'audio'
  const borderColor = result === 'correct' ? '$correct' : result === 'incorrect' ? '$incorrect' : '$border'

  return (
    <Card padding="$4" gap="$3" borderRadius="$4" backgroundColor="$cardBackground" borderColor={borderColor} borderWidth={2}>
      <CardTypeBadge type={cardType} />
      <Text fontSize="$2" color="$textMuted">What does this mean in English?</Text>

      {settings.japaneseExerciseMode !== 'text' && (
        <Button
          onPress={() => speak(card.japanese, 'ja-JP', 0.9, () => {
            if (settings.autoListen) setTimeout(() => start(), settings.autoStartDelay)
          })}
        >
          {isSpeaking ? '\u{1F50A} Playing…' : '\u{1F50A} Play again'}
        </Button>
      )}

      {showJapaneseText && (
        <YStack alignItems="center" gap="$1">
          <Text fontSize="$10" fontWeight="700">{card.japanese}</Text>
          {card.japanese !== card.kana && <Text color="$textMuted" fontSize="$5">{card.kana}</Text>}
        </YStack>
      )}

      <Text color="$textMuted" textAlign="center">Speak the English translation</Text>

      <FlashcardFeedback
        result={result}
        heard={heard}
        showText={settings.feedbackText}
        showTranscript={settings.showTranscript}
        correctText={primaryEnglish + (card.hint ? ` (${card.hint})` : '')}
        incorrectText={card.english.join(' / ') + (card.hint ? ` (${card.hint})` : '')}
        manualGrading={settings.manualGrading}
        onOverrideCorrect={() => overrideGrade(4)}
        onOverrideIncorrect={() => overrideGrade(1)}
        reportUrl={buildReportUrl(card, { heard, skipped })}
      />

      {correctionPhase && correctionResult !== 'correct' && (
        <YStack gap="$2" alignItems="center">
          <Text>Now say the correct answer:</Text>
          <RecordButton
            isListening={correction.isListening}
            onStart={correction.start}
            onStop={correction.stop}
            disabled={isSpeaking}
            listenMode={settings.autoListen ? 'auto' : 'hold'}
          />
          {correctionResult === 'incorrect' && <Text color="$incorrect">Try again</Text>}
          {settings.showTranscript && correctionHeard && (
            <Text color="$textMuted" fontSize="$2">Heard: "{correctionHeard}"</Text>
          )}
          <Button size="$2" chromeless onPress={() => onAnswer(1, heard, skipped)}>Skip</Button>
        </YStack>
      )}

      {result === null && (
        <XStack gap="$3" alignItems="center" justifyContent="center">
          <RecordButton
            isListening={isListening}
            onStart={start}
            onStop={stop}
            disabled={isSpeaking}
            listenMode={settings.autoListen ? 'auto' : 'hold'}
          />
          <Button
            size="$4"
            circular
            onPress={() => { setSkipped(true); applyResult(false, '') }}
            accessibilityLabel="Don't know"
          >
            ?
          </Button>
        </XStack>
      )}

      {errorMsg && <Text color="$incorrect">{errorMsg}</Text>}
    </Card>
  )
}
