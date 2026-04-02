import { useState, useCallback, useEffect, useRef } from 'react'
import { RecordButton } from './RecordButton'
import { CardTypeBadge } from './CardTypeBadge'
import { FlashcardFeedback } from './FlashcardFeedback'
import { useSpeechRecognition } from '../hooks/useSpeechRecognition'
import { useSpeechSynthesis } from '../hooks/useSpeechSynthesis'
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
  const autoStarted = useRef(false)

  // Speak the Japanese word on card load; in auto mode, chain into listening
  useEffect(() => {
    const timer = setTimeout(() => {
      speak(card.japanese, 'ja-JP', 0.9, () => {
        // onEnd: auto-start listening after the word finishes
        if (settings.autoListen && !autoStarted.current) {
          autoStarted.current = true
          setTimeout(() => start(), settings.autoStartDelay)
        }
      })
    }, 300)
    return () => clearTimeout(timer)
  // oxlint-disable-next-line react-hooks/exhaustive-deps -- intentionally fires only on card
  // change; `start` and `settings.*` are read inside the speak onEnd callback where their
  // current values are captured via closure at call time, not at effect setup time.
  }, [card, speak])

  const handleResult = useCallback(
    (transcripts: string[]) => {
      const phoneticAlgorithm: 'off' | 'soundex' | 'metaphone' | 'both' =
        settings.phoneticSoundex && settings.phoneticMetaphone ? 'both'
        : settings.phoneticSoundex ? 'soundex'
        : settings.phoneticMetaphone ? 'metaphone'
        : 'off'
      const correct = compareEnglish(card.english, transcripts, { phoneticAlgorithm })
      const r = correct ? 'correct' : 'incorrect'
      setResult(r)
      setHeard(transcripts[0] ?? '')
      if (settings.feedbackVoice) {
        const primaryEnglish = Array.isArray(card.english) ? card.english[0] : card.english
        speak(primaryEnglish, 'en-US')
      }
    },
    [card, settings.phoneticSoundex, settings.phoneticMetaphone, settings.feedbackVoice, speak]
  )

  const { isListening, start, stop } = useSpeechRecognition({
    lang: 'en-US',
    onResult: handleResult,
    onError: setErrorMsg,
  })

  // Enforce max listen duration in auto mode
  useEffect(() => {
    if (!isListening || !settings.maxListenDuration) return
    const timer = setTimeout(() => stop(), settings.maxListenDuration)
    return () => clearTimeout(timer)
  }, [isListening, settings.maxListenDuration, stop])

  // Auto-advance after result
  useEffect(() => {
    if (!result) return
    const delay = result === 'correct' ? 1200 : 2500
    const timer = setTimeout(() => onAnswer(result === 'correct' ? 4 : 1), delay)
    return () => clearTimeout(timer)
  }, [result, onAnswer])

  const primaryEnglish = Array.isArray(card.english) ? card.english[0] : card.english

  return (
    <div className={`flashcard ${result ? `flash-${result}` : ''}`}>
      <CardTypeBadge type={cardType} />
      <div className="card-label">What does this mean in English?</div>

      <button
        className={`play-btn ${isSpeaking ? 'playing' : ''}`}
        onClick={() => speak(card.japanese, 'ja-JP')}
      >
        {isSpeaking ? '🔊 Playing…' : '🔊 Play again'}
      </button>

      <div className="card-hint">Speak the English translation</div>

      <FlashcardFeedback
        result={result}
        heard={heard}
        showText={settings.feedbackText}
        showTranscript={settings.showTranscript}
        correctText={primaryEnglish}
        incorrectText={card.english.join(' / ')}
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
          <button className="dont-know-btn" onClick={() => setResult('incorrect')} aria-label="Don't know">
            ?
          </button>
        </div>
      )}

      {errorMsg && <div className="error-msg">{errorMsg}</div>}
    </div>
  )
}
