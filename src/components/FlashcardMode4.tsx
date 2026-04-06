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

  // Pause microphone when audio is playing to prevent recording playback
  useEffect(() => {
    if (isSpeaking && isListening) stop()
  }, [isSpeaking, isListening, stop])

  // Enforce max listen duration in auto mode
  useEffect(() => {
    if (!isListening || !settings.maxListenDuration) return
    const timer = setTimeout(() => stop(), settings.maxListenDuration)
    return () => clearTimeout(timer)
  }, [isListening, settings.maxListenDuration, stop])

  // Speech recognition for correction phase (speak the correct answer after getting it wrong)
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

  // Pause correction microphone when audio is playing
  useEffect(() => {
    if (isSpeaking && correction.isListening) correction.stop()
  }, [isSpeaking, correction.isListening, correction.stop]) // oxlint-disable-line react-hooks/exhaustive-deps

  // Enter correction phase on incorrect result when speakToCorrect is on
  useEffect(() => {
    if (result === 'incorrect' && settings.speakToCorrect) {
      setCorrectionPhase(true)
    }
  }, [result, settings.speakToCorrect])

  // Auto-advance after result (cancellable for manual grading override)
  // When speakToCorrect is on and result is incorrect, don't auto-advance — wait for correction
  useEffect(() => {
    if (!result) return
    if (result === 'incorrect' && settings.speakToCorrect) return
    const delay = result === 'correct' ? 1200 : 2500
    advanceTimerRef.current = setTimeout(() => onAnswer(result === 'correct' ? 4 : 1, heard), delay)
    return () => {
      if (advanceTimerRef.current) clearTimeout(advanceTimerRef.current)
    }
  }, [result, heard, onAnswer, settings.speakToCorrect])

  // Auto-advance after successful correction
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
        correctText={primaryEnglish + (card.hint ? ` (${card.hint})` : '')}
        incorrectText={card.english.join(' / ') + (card.hint ? ` (${card.hint})` : '')}
        manualGrading={settings.manualGrading}
        onOverrideCorrect={() => overrideGrade(4)}
        onOverrideIncorrect={() => overrideGrade(1)}
      />

      {correctionPhase && correctionResult !== 'correct' && (
        <div className="correction-phase">
          <div className="correction-prompt">Now say the correct answer:</div>
          <RecordButton
            isListening={correction.isListening}
            onStart={correction.start}
            onStop={correction.stop}
            disabled={isSpeaking}
            listenMode="hold"
          />
          {correctionResult === 'incorrect' && (
            <div className="correction-retry">Try again</div>
          )}
          {settings.showTranscript && correctionHeard && (
            <div className="transcript-heard">Heard: "{correctionHeard}"</div>
          )}
          <button
            className="correction-skip-btn"
            onClick={() => onAnswer(1, heard)}
          >
            Skip
          </button>
        </div>
      )}

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
