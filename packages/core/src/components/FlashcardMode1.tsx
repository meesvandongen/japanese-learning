import { useState, useCallback, useEffect, useRef, useMemo } from 'react'
import { YStack, XStack, Text, Button, Card } from 'tamagui'
import { RecordButton } from './RecordButton'
import { CardTypeBadge } from './CardTypeBadge'
import { FlashcardFeedback } from './FlashcardFeedback'
import { useSpeechRecognition, useSpeechSynthesis, useAudioFeedback } from '../hooks'
import { useSettingsStore } from '../store'
import { compareJapanese, toHiragana, buildReportUrl } from '../utils'
import type { Word, KuromojiTokenizer } from '../types'

interface Props {
  card: Word
  words: Word[]
  tokenizer: KuromojiTokenizer | undefined
  cardType: 'due' | 'new' | 'extra'
  onAnswer: (quality: number, heard: string, skipped: boolean) => void
}

/**
 * Say-in-Japanese mode. English prompt → user speaks Japanese → compare.
 *
 * The hook logic is identical to the original web component; the JSX is
 * ported 1:1 to Tamagui primitives. Auto-listen, correction phase,
 * manual grading, phonetic matching all still work.
 */
export function FlashcardMode1({ card, words, tokenizer, cardType, onAnswer }: Props) {
  const [result, setResult] = useState<'correct' | 'incorrect' | null>(null)
  const [heard, setHeard] = useState('')
  const [skipped, setSkipped] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')
  const [correctionPhase, setCorrectionPhase] = useState(false)
  const [correctionHeard, setCorrectionHeard] = useState('')
  const [correctionResult, setCorrectionResult] = useState<'correct' | 'incorrect' | null>(null)
  const settings = useSettingsStore()

  // Build list of all accepted answers (kana + kanji forms) that share an
  // English translation with this card, so e.g. both あお and あおい are
  // accepted for "blue".
  const acceptedAnswers = useMemo(() => {
    const englishSet = new Set(card.english.map((e) => e.toLowerCase()))
    const answerSet = new Set<string>([card.kana, card.japanese, ...(card.alt ?? [])])
    for (const w of words) {
      if (w.english.some((e) => englishSet.has(e.toLowerCase()))) {
        answerSet.add(w.kana)
        answerSet.add(w.japanese)
        w.alt?.forEach((a) => answerSet.add(a))
      }
    }
    return [...answerSet]
  }, [card, words])

  const { isSpeaking, speak } = useSpeechSynthesis()
  const { playCorrect, playIncorrect } = useAudioFeedback()
  const autoStarted = useRef(false)
  const advanceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const applyResult = useCallback(
    (correct: boolean, transcript: string) => {
      setResult(correct ? 'correct' : 'incorrect')
      setHeard(transcript)
      if (settings.feedbackSound) {
        if (correct) playCorrect(); else playIncorrect()
      }
      if (settings.feedbackVoice) {
        speak(card.japanese, 'ja-JP')
      }
    },
    [card, settings.feedbackSound, settings.feedbackVoice, speak, playCorrect, playIncorrect]
  )

  const { isListening, start, stop } = useSpeechRecognition({
    lang: 'ja-JP',
    onResult: (transcripts) => {
      const normalized = transcripts.map((t) => toHiragana(t, tokenizer ?? null))
      applyResult(
        compareJapanese(acceptedAnswers, [...transcripts, ...normalized], tokenizer ?? null),
        transcripts[0] ?? ''
      )
    },
    onError: setErrorMsg,
    contextualStrings: acceptedAnswers,
  })

  // Speak the English prompt on card load
  useEffect(() => {
    if (settings.englishExerciseMode === 'text') return
    const primaryEnglish = Array.isArray(card.english) ? card.english[0] : card.english
    const timer = setTimeout(() => {
      speak(primaryEnglish, 'en-US', 0.9, () => {
        if (settings.autoListen && !autoStarted.current) {
          autoStarted.current = true
          setTimeout(() => start(), settings.autoStartDelay)
        }
      })
    }, 300)
    return () => clearTimeout(timer)
  // oxlint-disable-next-line react-hooks/exhaustive-deps -- fires only on card change
  }, [card, speak])

  // Auto-start listening when prompt is text-only
  useEffect(() => {
    if (settings.englishExerciseMode !== 'text') return
    if (!settings.autoListen || autoStarted.current) return
    autoStarted.current = true
    const timer = setTimeout(() => start(), settings.autoStartDelay)
    return () => clearTimeout(timer)
  }, [settings.autoListen, settings.autoStartDelay, settings.englishExerciseMode]) // oxlint-disable-line react-hooks/exhaustive-deps

  // Pause mic when TTS is playing
  useEffect(() => {
    if (isSpeaking && isListening) stop()
  }, [isSpeaking, isListening, stop])

  // Enforce max listen duration in auto mode
  useEffect(() => {
    if (!isListening || !settings.maxListenDuration) return
    const timer = setTimeout(() => stop(), settings.maxListenDuration)
    return () => clearTimeout(timer)
  }, [isListening, settings.maxListenDuration, stop])

  // Correction-phase recognizer
  const correction = useSpeechRecognition({
    lang: 'ja-JP',
    onResult: (transcripts) => {
      const normalized = transcripts.map((t) => toHiragana(t, tokenizer ?? null))
      const correct = compareJapanese(acceptedAnswers, [...transcripts, ...normalized], tokenizer ?? null)
      setCorrectionHeard(transcripts[0] ?? '')
      setCorrectionResult(correct ? 'correct' : 'incorrect')
      if (correct) {
        if (settings.feedbackSound) playCorrect()
      } else {
        if (settings.feedbackSound) playIncorrect()
        if (settings.feedbackVoice) speak(card.japanese, 'ja-JP')
      }
    },
    onError: setErrorMsg,
    contextualStrings: acceptedAnswers,
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
  const showEnglishText = settings.englishExerciseMode !== 'audio'
  const borderColor = result === 'correct' ? '$correct' : result === 'incorrect' ? '$incorrect' : '$border'

  return (
    <Card padding="$4" gap="$3" borderRadius="$4" backgroundColor="$cardBackground" borderColor={borderColor} borderWidth={2}>
      <CardTypeBadge type={cardType} />
      <Text fontSize="$2" color="$textMuted">Say this in Japanese:</Text>

      {showEnglishText ? (
        <YStack alignItems="center" gap="$1">
          <Text fontSize="$10" fontWeight="700">{primaryEnglish}</Text>
          {card.hint && <Text color="$textMuted" fontStyle="italic">{card.hint}</Text>}
        </YStack>
      ) : (
        <Button
          onPress={() => speak(primaryEnglish, 'en-US', 0.9, () => {
            if (settings.autoListen) setTimeout(() => start(), settings.autoStartDelay)
          })}
        >
          {isSpeaking ? '\u{1F50A} Playing…' : '\u{1F50A} Play again'}
        </Button>
      )}

      {card.english.length > 1 && showEnglishText && (
        <Text fontSize="$2" color="$textMuted" textAlign="center">
          Also accepted: {card.english.slice(1).join(', ')}
        </Text>
      )}

      <FlashcardFeedback
        result={result}
        heard={heard}
        showText={settings.feedbackText}
        showTranscript={settings.showTranscript}
        correctText={card.japanese}
        incorrectText={card.japanese}
        kanaReading={card.kana}
        onPlayAgain={() => speak(card.japanese, 'ja-JP')}
        isPlaying={isSpeaking}
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
          <Button size="$2" chromeless onPress={() => onAnswer(1, heard, skipped)}>
            Skip
          </Button>
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
