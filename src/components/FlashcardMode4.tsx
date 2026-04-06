import { useState, useCallback, useEffect, useRef } from 'react'
import { Card, Button } from 'konsta/react'
import { RecordButton } from './RecordButton'
import { CardTypeBadge } from './CardTypeBadge'
import { FlashcardFeedback } from './FlashcardFeedback'
import { useSpeechRecognition } from '../hooks/useSpeechRecognition'
import { useSpeechSynthesis } from '../hooks/useSpeechSynthesis'
import { useAudioFeedback } from '../hooks/useAudioFeedback'
import { compareEnglish } from '../utils/normalize'
import { useSettingsStore } from '../store/settingsStore'
import type { Word } from '../types'

interface Props {
  card: Word
  cardType: 'due' | 'new' | 'extra'
  onAnswer: (quality: number, heard: string) => void
}

export function FlashcardMode4({ card, cardType, onAnswer }: Props) {
  const [result, setResult] = useState<'correct' | 'incorrect' | null>(null)
  const [heard, setHeard] = useState('')
  const [errorMsg, setErrorMsg] = useState('')
  const [correctionPhase, setCorrectionPhase] = useState(false)
  const [correctionHeard, setCorrectionHeard] = useState('')
  const [correctionResult, setCorrectionResult] = useState<'correct' | 'incorrect' | null>(null)
  const settings = useSettingsStore()
  const { isSpeaking, speak } = useSpeechSynthesis()
  const { playCorrect, playIncorrect } = useAudioFeedback()
  const autoStarted = useRef(false)
  const advanceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

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
  // oxlint-disable-next-line react-hooks/exhaustive-deps -- intentionally fires only on card change
  }, [card, speak])

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
      const phoneticAlgorithm: 'off' | 'soundex' | 'metaphone' | 'both' =
        settings.phoneticSoundex && settings.phoneticMetaphone ? 'both'
        : settings.phoneticSoundex ? 'soundex'
        : settings.phoneticMetaphone ? 'metaphone'
        : 'off'
      applyResult(
        compareEnglish(card.english, transcripts, { phoneticAlgorithm }),
        transcripts[0] ?? ''
      )
    },
    onError: setErrorMsg,
  })

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
      const phoneticAlgorithm: 'off' | 'soundex' | 'metaphone' | 'both' =
        settings.phoneticSoundex && settings.phoneticMetaphone ? 'both'
        : settings.phoneticSoundex ? 'soundex'
        : settings.phoneticMetaphone ? 'metaphone'
        : 'off'
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
  })

  useEffect(() => {
    if (isSpeaking && correction.isListening) correction.stop()
  }, [isSpeaking, correction.isListening, correction.stop]) // oxlint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (result === 'incorrect' && settings.speakToCorrect) {
      setCorrectionPhase(true)
    }
  }, [result, settings.speakToCorrect])

  useEffect(() => {
    if (!result) return
    if (result === 'incorrect' && settings.speakToCorrect) return
    const delay = result === 'correct' ? 1200 : 2500
    advanceTimerRef.current = setTimeout(() => onAnswer(result === 'correct' ? 4 : 1, heard), delay)
    return () => {
      if (advanceTimerRef.current) clearTimeout(advanceTimerRef.current)
    }
  }, [result, heard, onAnswer, settings.speakToCorrect])

  useEffect(() => {
    if (correctionResult !== 'correct') return
    advanceTimerRef.current = setTimeout(() => onAnswer(1, heard), 1200)
    return () => {
      if (advanceTimerRef.current) clearTimeout(advanceTimerRef.current)
    }
  }, [correctionResult, heard, onAnswer])

  function overrideGrade(quality: number) {
    if (advanceTimerRef.current) clearTimeout(advanceTimerRef.current)
    onAnswer(quality, heard)
  }

  const primaryEnglish = Array.isArray(card.english) ? card.english[0] : card.english
  const showJapaneseText = settings.japaneseExerciseMode !== 'audio'

  return (
    <Card
      outline
      className={`${result ? `flash-${result}` : ''}`}
    >
      <div className="flex flex-col items-center gap-5">
        <CardTypeBadge type={cardType} />
        <p className="text-xs uppercase tracking-wide text-gray-500">What does this mean in English?</p>

        {settings.japaneseExerciseMode !== 'text' && (
          <Button
            rounded
            tonal
            onClick={() => speak(card.japanese, 'ja-JP')}
          >
            {isSpeaking ? '\uD83D\uDD0A Playing...' : '\uD83D\uDD0A Play again'}
          </Button>
        )}

        {showJapaneseText && (
          <p className="text-3xl font-bold text-center">{card.japanese}</p>
        )}

        <p className="text-sm text-gray-400">Speak the English translation</p>

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
        />

        {correctionPhase && correctionResult !== 'correct' && (
          <div className="flex flex-col items-center gap-3 mt-4 p-4 rounded-xl bg-amber-50 border border-amber-300">
            <p className="font-semibold">Now say the correct answer:</p>
            <RecordButton
              isListening={correction.isListening}
              onStart={correction.start}
              onStop={correction.stop}
              disabled={isSpeaking}
              listenMode="hold"
            />
            {correctionResult === 'incorrect' && (
              <p className="text-sm text-red-500 font-medium">Try again</p>
            )}
            {settings.showTranscript && correctionHeard && (
              <p className="text-xs text-gray-400 italic">Heard: &quot;{correctionHeard}&quot;</p>
            )}
            <Button small clear className="!text-gray-500" onClick={() => onAnswer(1, heard)}>
              Skip
            </Button>
          </div>
        )}

        {result === null && (
          <div className="flex items-center gap-3">
            <RecordButton
              isListening={isListening}
              onStart={start}
              onStop={stop}
              disabled={isSpeaking}
              listenMode={settings.autoListen ? 'auto' : 'hold'}
            />
            <Button
              rounded
              outline
              className="!w-12 !h-12 !p-0 !text-red-500 !border-red-300 !text-xl !font-bold"
              onClick={() => applyResult(false, '')}
              aria-label="Don't know"
            >
              ?
            </Button>
          </div>
        )}

        {errorMsg && (
          <p className="text-sm text-red-500 bg-red-50 border border-red-200 rounded-lg px-3 py-2 text-center">{errorMsg}</p>
        )}
      </div>
    </Card>
  )
}
