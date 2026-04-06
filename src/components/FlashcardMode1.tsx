import { useState, useCallback, useEffect, useRef, useMemo } from 'react'
import { Button } from 'konsta/react'
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

  const acceptedKana = useMemo(() => {
    const englishSet = new Set(card.english.map((e) => e.toLowerCase()))
    const kanaSet = new Set<string>([card.kana])
    for (const w of words) {
      if (w.english.some((e) => englishSet.has(e.toLowerCase()))) {
        kanaSet.add(w.kana)
      }
    }
    return [...kanaSet]
  }, [card, words])
  const { isSpeaking, speak } = useSpeechSynthesis()
  const { playCorrect, playIncorrect } = useAudioFeedback()
  const autoStarted = useRef(false)
  const advanceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

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
      compareJapanese(acceptedKana, transcripts, tokenizer ?? null),
      transcripts[0] ?? ''
    ),
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
    lang: 'ja-JP',
    onResult: (transcripts) => {
      const correct = compareJapanese(acceptedKana, transcripts, tokenizer ?? null)
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
  const showEnglishText = settings.englishExerciseMode !== 'audio'

  return (
    <>
      {/* ── Card content: scrollable ── */}
      <div className="flex flex-col items-center flex-1 justify-center px-4">
        <div className={`w-full flex flex-col items-center gap-4 rounded-2xl p-6 ${
          result === 'correct' ? 'flash-correct' : result === 'incorrect' ? 'flash-incorrect' : ''
        }`}>
          <CardTypeBadge type={cardType} />
          <p className="text-xs uppercase tracking-wide text-gray-500">Say this in Japanese:</p>

          {showEnglishText ? (
            <div className="text-center">
              <p className="text-4xl font-bold leading-tight">{primaryEnglish}</p>
              {card.hint && <p className="text-sm text-gray-400 mt-1">{card.hint}</p>}
            </div>
          ) : (
            <Button
              rounded
              tonal
              onClick={() => speak(primaryEnglish, 'en-US')}
            >
              {isSpeaking ? '\uD83D\uDD0A Playing...' : '\uD83D\uDD0A Play again'}
            </Button>
          )}

          {card.english.length > 1 && showEnglishText && (
            <p className="text-xs text-gray-400 italic">Also accepted: {card.english.slice(1).join(', ')}</p>
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

          {errorMsg && (
            <p className="text-sm text-red-500 bg-red-50 border border-red-200 rounded-lg px-3 py-2 text-center">{errorMsg}</p>
          )}
        </div>
      </div>

      {/* ── Fixed bottom action bar ── */}
      <div className="fixed bottom-[calc(var(--k-tabbar-height,3rem)+env(safe-area-inset-bottom))] left-0 right-0 z-40 bg-white/95 backdrop-blur-sm border-t border-gray-200">
        <div className="max-w-lg mx-auto px-4 py-3">
          {/* Correction phase */}
          {correctionPhase && correctionResult !== 'correct' && (
            <div className="flex flex-col items-center gap-3">
              <p className="text-sm font-semibold text-amber-700">Now say the correct answer:</p>
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
              <Button small clear className="!text-gray-400" onClick={() => onAnswer(1, heard)}>
                Skip
              </Button>
            </div>
          )}

          {/* Primary action: waiting for answer */}
          {result === null && (
            <div className="flex flex-col items-center gap-2">
              <RecordButton
                isListening={isListening}
                onStart={start}
                onStop={stop}
                disabled={isSpeaking}
                listenMode={settings.autoListen ? 'auto' : 'hold'}
              />
              <button
                className="text-sm text-gray-400 hover:text-red-400 transition-colors py-1"
                onClick={() => applyResult(false, '')}
                aria-label="Don't know"
              >
                I don&apos;t know
              </button>
            </div>
          )}

          {/* Post-result: show nothing in action bar (correction or auto-advance handles it) */}
          {result !== null && !(correctionPhase && correctionResult !== 'correct') && (
            <div className="flex justify-center py-1">
              <p className="text-sm text-gray-400">
                {result === 'correct' ? 'Correct! Moving on...' : 'Moving on...'}
              </p>
            </div>
          )}
        </div>
      </div>
    </>
  )
}
