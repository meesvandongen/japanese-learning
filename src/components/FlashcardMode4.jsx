import { useState, useCallback, useEffect, useRef } from 'react'
import { RecordButton } from './RecordButton'
import { useSpeechRecognition } from '../hooks/useSpeechRecognition'
import { useSpeechSynthesis } from '../hooks/useSpeechSynthesis'
import { compareEnglish } from '../utils/normalize'
import { useStore } from '../store/index'
import { settingsStore } from '../store/settingsStore'

export function FlashcardMode4({ card, cardType, onAnswer }) {
  const [result, setResult] = useState(null) // null | 'correct' | 'incorrect'
  const [heard, setHeard] = useState('')
  const [errorMsg, setErrorMsg] = useState('')
  const settings = useStore(settingsStore)
  const { isSpeaking, speak } = useSpeechSynthesis()
  const autoStarted = useRef(false)

  // Speak the Japanese word on card load; in auto mode, chain into listening
  useEffect(() => {
    const timer = setTimeout(() => {
      speak(card.japanese, 'ja-JP', 0.9, () => {
        // onEnd: auto-start listening after the word finishes
        if (settings.autoListen && !autoStarted.current) {
          autoStarted.current = true
          const startTimer = setTimeout(() => start(), settings.autoStartDelay)
          // can't return cleanup here, but delay is short enough
          void startTimer
        }
      })
    }, 300)
    return () => clearTimeout(timer)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [card, speak])

  const handleResult = useCallback(
    (transcripts) => {
      const phoneticAlgorithm =
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
  const showText = settings.feedbackText

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

      {/* Feedback rendered ABOVE the action area so it's not under the thumb */}
      {result === 'correct' && showText && (
        <div className="feedback correct">
          ✓ <span className="answer-shown">{primaryEnglish}</span>
        </div>
      )}
      {result === 'incorrect' && showText && (
        <div className="feedback incorrect">
          <span className="answer-shown">{card.english.join(' / ')}</span>
        </div>
      )}
      {result && !showText && (
        <div className={`feedback-icon ${result}`}>
          {result === 'correct' ? '✓' : '✗'}
        </div>
      )}

      {result !== null && settings.showTranscript && heard && (
        <div className="transcript-heard">Heard: "{heard}"</div>
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
          <button className="dont-know-btn" onClick={() => setResult('incorrect')} aria-label="Don't know">
            ?
          </button>
        </div>
      )}

      {errorMsg && <div className="error-msg">{errorMsg}</div>}
    </div>
  )
}

function CardTypeBadge({ type }) {
  if (!type) return null
  const labels = { due: 'Review', new: 'New', extra: 'Extra practice' }
  return <span className={`card-type-badge badge-${type}`}>{labels[type]}</span>
}
