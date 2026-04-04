import { useState, useCallback, useEffect, useRef } from 'react'
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
  onAnswer: (quality: number) => void
}

export function FlashcardMode4({ card, cardType, onAnswer }: Props) {
  const [result, setResult] = useState<'correct' | 'incorrect' | null>(null)
  const [heard, setHeard] = useState('')
  const [errorMsg, setErrorMsg] = useState('')
  const settings = useSettingsStore()
  const { isSpeaking, speak } = useSpeechSynthesis()
  const { playCorrect, playIncorrect } = useAudioFeedback()
  const autoStarted = useRef(false)
  const advanceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Speak the Japanese word on card load (unless exercise mode is text-only)
  useEffect(() => {
    if (settings.japaneseExerciseMode === 'text') {
      // Text-only mode: auto-start listening directly (no audio to chain from)
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

  // Enforce max listen duration in auto mode
  useEffect(() => {
    if (!isListening || !settings.maxListenDuration) return
    const timer = setTimeout(() => stop(), settings.maxListenDuration)
    return () => clearTimeout(timer)
  }, [isListening, settings.maxListenDuration, stop])

  // Auto-advance after result (cancellable for manual grading override)
  useEffect(() => {
    if (!result) return
    const delay = result === 'correct' ? 1200 : 2500
    advanceTimerRef.current = setTimeout(() => onAnswer(result === 'correct' ? 4 : 1), delay)
    return () => {
      if (advanceTimerRef.current) clearTimeout(advanceTimerRef.current)
    }
  }, [result, onAnswer])

  function overrideGrade(quality: number) {
    if (advanceTimerRef.current) clearTimeout(advanceTimerRef.current)
    onAnswer(quality)
  }

  const primaryEnglish = Array.isArray(card.english) ? card.english[0] : card.english
  const showJapaneseText = settings.japaneseExerciseMode !== 'audio'

  return (
    <div className={`flashcard ${result ? `flash-${result}` : ''}`}>
      <CardTypeBadge type={cardType} />
      <div className="card-label">What does this mean in English?</div>

      {settings.japaneseExerciseMode !== 'text' && (
        <button
          className={`play-btn ${isSpeaking ? 'playing' : ''}`}
          onClick={() => speak(card.japanese, 'ja-JP')}
        >
          {isSpeaking ? '🔊 Playing…' : '🔊 Play again'}
        </button>
      )}

      {showJapaneseText && (
        <div className="card-prompt japanese-prompt">{card.japanese}</div>
      )}

      <div className="card-hint">Speak the English translation</div>

      <FlashcardFeedback
        result={result}
        heard={heard}
        showText={settings.feedbackText}
        showTranscript={settings.showTranscript}
        correctText={primaryEnglish}
        incorrectText={card.english.join(' / ')}
        manualGrading={settings.manualGrading}
        onOverrideCorrect={() => overrideGrade(4)}
        onOverrideIncorrect={() => overrideGrade(1)}
      />

      {result === null && (
        <div className="answer-actions">
          <RecordButton
            isListening={isListening}
            onStart={start}
            onStop={stop}
            disabled={isSpeaking}
            listenMode={settings.autoListen ? 'auto' : 'hold'}
          />
          <button className="dont-know-btn" onClick={() => applyResult(false, '')} aria-label="Don't know">
            ?
          </button>
        </div>
      )}

      {errorMsg && <div className="error-msg">{errorMsg}</div>}
    </div>
  )
}
