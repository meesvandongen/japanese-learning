import { useState, useCallback, useEffect, useRef } from 'react'
import { RecordButton } from './RecordButton'
import { CardTypeBadge } from './CardTypeBadge'
import { FlashcardFeedback } from './FlashcardFeedback'
import { useSpeechRecognition } from '../hooks/useSpeechRecognition'
import { useSpeechSynthesis } from '../hooks/useSpeechSynthesis'
import { useAudioFeedback } from '../hooks/useAudioFeedback'
import { compareJapanese } from '../utils/normalize'
import { useSettingsStore } from '../store/settingsStore'
import type { Word } from '../types'
import type { KuromojiTokenizer } from '../types/kuromoji'

interface Props {
  card: Word
  tokenizer: KuromojiTokenizer | undefined
  cardType: 'due' | 'new' | 'extra'
  onAnswer: (quality: number, heard: string) => void
}

export function FlashcardMode1({ card, tokenizer, cardType, onAnswer }: Props) {
  const [result, setResult] = useState<'correct' | 'incorrect' | null>(null)
  const [heard, setHeard] = useState('')
  const [errorMsg, setErrorMsg] = useState('')
  const settings = useSettingsStore()
  const { isSpeaking, speak } = useSpeechSynthesis()
  const { playCorrect, playIncorrect } = useAudioFeedback()
  const autoStarted = useRef(false)
  const advanceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Speak the English prompt on card load (if exercise mode includes audio)
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

  // Auto-start listening when not using audio prompt (no speak callback to chain into)
  useEffect(() => {
    if (settings.englishExerciseMode !== 'text') return
    if (!settings.autoListen || autoStarted.current) return
    autoStarted.current = true
    const timer = setTimeout(() => start(), settings.autoStartDelay)
    return () => clearTimeout(timer)
  }, [settings.autoListen, settings.autoStartDelay, settings.englishExerciseMode])  // oxlint-disable-line react-hooks/exhaustive-deps

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
    onResult: (transcripts) => applyResult(
      compareJapanese(card.kana, transcripts, tokenizer ?? null),
      transcripts[0] ?? ''
    ),
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
    advanceTimerRef.current = setTimeout(() => onAnswer(result === 'correct' ? 4 : 1, heard), delay)
    return () => {
      if (advanceTimerRef.current) clearTimeout(advanceTimerRef.current)
    }
  }, [result, heard, onAnswer])

  function overrideGrade(quality: number) {
    if (advanceTimerRef.current) clearTimeout(advanceTimerRef.current)
    onAnswer(quality, heard)
  }

  const primaryEnglish = Array.isArray(card.english) ? card.english[0] : card.english
  const showEnglishText = settings.englishExerciseMode !== 'audio'

  return (
    <div className={`flashcard ${result ? `flash-${result}` : ''}`}>
      <CardTypeBadge type={cardType} />
      <div className="card-label">Say this in Japanese:</div>

      {showEnglishText ? (
        <div className="card-prompt english-prompt">{primaryEnglish}</div>
      ) : (
        <button
          className={`play-btn ${isSpeaking ? 'playing' : ''}`}
          onClick={() => speak(primaryEnglish, 'en-US')}
        >
          {isSpeaking ? '🔊 Playing…' : '🔊 Play again'}
        </button>
      )}

      {card.english.length > 1 && showEnglishText && (
        <div className="synonyms">Also accepted: {card.english.slice(1).join(', ')}</div>
      )}

      <FlashcardFeedback
        result={result}
        heard={heard}
        showText={settings.feedbackText}
        showTranscript={settings.showTranscript}
        correctText={card.japanese}
        incorrectText={card.japanese}
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
