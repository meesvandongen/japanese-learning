import { useState, useCallback, useEffect, useRef, useMemo } from 'react'
import { RecordButton } from './RecordButton'
import { CardTypeBadge } from './CardTypeBadge'
import { FlashcardFeedback } from './FlashcardFeedback'
import { useSpeechRecognition } from '../hooks/useSpeechRecognition'
import { useSpeechSynthesis } from '../hooks/useSpeechSynthesis'
import { useAudioFeedback } from '../hooks/useAudioFeedback'
import { compareJapanese, toHiragana } from '../utils/normalize'
import { useSettingsStore } from '../store/settingsStore'
import type { Word } from '../types'
import type { KuromojiTokenizer } from '../types/kuromoji'

interface Props {
  card: Word
  words: Word[]
  tokenizer: KuromojiTokenizer | undefined
  cardType: 'due' | 'new' | 'extra'
  onAnswer: (quality: number, heard: string) => void
}

export function FlashcardMode1({ card, words, tokenizer, cardType, onAnswer }: Props) {
  const [result, setResult] = useState<'correct' | 'incorrect' | null>(null)
  const [heard, setHeard] = useState('')
  const [errorMsg, setErrorMsg] = useState('')
  const [correctionPhase, setCorrectionPhase] = useState(false)
  const [correctionHeard, setCorrectionHeard] = useState('')
  const [correctionResult, setCorrectionResult] = useState<'correct' | 'incorrect' | null>(null)
  const settings = useSettingsStore()

  // Build list of all accepted answers (kana + kanji forms) that share an
  // English translation with this card, so e.g. both あお and あおい are
  // accepted for "blue". Including kanji forms ensures STT returning kanji
  // matches even when the tokenizer isn't loaded.
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
    onResult: (transcripts) => {
      const normalized = transcripts.map(t => toHiragana(t, tokenizer ?? null))
      applyResult(
        compareJapanese(acceptedAnswers, [...transcripts, ...normalized], tokenizer ?? null),
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
    lang: 'ja-JP',
    onResult: (transcripts) => {
      const normalized = transcripts.map(t => toHiragana(t, tokenizer ?? null))
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

  // Auto-start correction listening (same behavior as initial answer)
  useEffect(() => {
    if (!correctionPhase || correctionResult === 'correct') return
    if (!settings.autoListen) return
    if (isSpeaking) return
    const timer = setTimeout(() => correction.start(), settings.autoStartDelay)
    return () => clearTimeout(timer)
  }, [correctionPhase, correctionResult, settings.autoListen, settings.autoStartDelay, isSpeaking]) // oxlint-disable-line react-hooks/exhaustive-deps

  // Enforce max listen duration for correction phase
  useEffect(() => {
    if (!correction.isListening || !settings.maxListenDuration) return
    const timer = setTimeout(() => correction.stop(), settings.maxListenDuration)
    return () => clearTimeout(timer)
  }, [correction.isListening, settings.maxListenDuration, correction.stop]) // oxlint-disable-line react-hooks/exhaustive-deps

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
  const showEnglishText = settings.englishExerciseMode !== 'audio'

  return (
    <div className={`flashcard ${result ? `flash-${result}` : ''}`}>
      <CardTypeBadge type={cardType} />
      <div className="card-label">Say this in Japanese:</div>

      {showEnglishText ? (
        <div className="card-prompt english-prompt">
          {primaryEnglish}
          {card.hint && <span className="card-hint-tag">{card.hint}</span>}
        </div>
      ) : (
        <button
          className={`play-btn ${isSpeaking ? 'playing' : ''}`}
          onClick={() => speak(primaryEnglish, 'en-US', 0.9, () => {
            if (settings.autoListen) setTimeout(() => start(), settings.autoStartDelay)
          })}
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
        kanaReading={card.kana}
        onPlayAgain={() => speak(card.japanese, 'ja-JP')}
        isPlaying={isSpeaking}
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
            listenMode={settings.autoListen ? 'auto' : 'hold'}
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
