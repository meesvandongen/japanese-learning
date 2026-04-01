import { useState, useCallback, useEffect, useRef } from 'react'
import { RecordButton } from './RecordButton'
import { useSpeechRecognition } from '../hooks/useSpeechRecognition'
import { useSpeechSynthesis } from '../hooks/useSpeechSynthesis'
import { compareJapanese } from '../utils/normalize'
import { useStore } from '../store/index'
import { settingsStore } from '../store/settingsStore'

export function FlashcardMode1({ card, tokenizer, cardType, onAnswer }) {
  const [result, setResult] = useState(null) // null | 'correct' | 'incorrect'
  const [heard, setHeard] = useState('')
  const [errorMsg, setErrorMsg] = useState('')
  const settings = useStore(settingsStore)
  const { speak } = useSpeechSynthesis()
  const autoStarted = useRef(false)

  const handleResult = useCallback(
    (transcripts) => {
      const correct = compareJapanese(card.kana, transcripts, tokenizer)
      const r = correct ? 'correct' : 'incorrect'
      setResult(r)
      setHeard(transcripts[0] ?? '')
      if (settings.feedbackMode === 'voice' || settings.feedbackMode === 'both') {
        speak(card.japanese, 'ja-JP')
      }
    },
    [card, tokenizer, settings.feedbackMode, speak]
  )

  const { isListening, start, stop } = useSpeechRecognition({
    lang: 'ja-JP',
    onResult: handleResult,
    onError: setErrorMsg,
  })

  // Auto-start listening on card mount
  useEffect(() => {
    if (settings.listeningMode !== 'auto' || autoStarted.current) return
    autoStarted.current = true
    const timer = setTimeout(() => start(), settings.autoStartDelay)
    return () => clearTimeout(timer)
  }, [settings.listeningMode, settings.autoStartDelay, start])

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
  const showText = settings.feedbackMode === 'text' || settings.feedbackMode === 'both'

  return (
    <div className={`flashcard ${result ? `flash-${result}` : ''}`}>
      <CardTypeBadge type={cardType} />
      <div className="card-label">Say this in Japanese:</div>
      <div className="card-prompt english-prompt">{primaryEnglish}</div>

      {card.english.length > 1 && (
        <div className="synonyms">Also accepted: {card.english.slice(1).join(', ')}</div>
      )}

      {/* Feedback rendered ABOVE the action area so it's not under the thumb */}
      {result === 'correct' && showText && (
        <div className="feedback correct">
          ✓ <span className="answer-shown">{card.japanese}</span>
        </div>
      )}
      {result === 'incorrect' && showText && (
        <div className="feedback incorrect">
          <span className="answer-shown">{card.japanese}</span>
        </div>
      )}
      {result && !showText && (
        <div className={`feedback-icon ${result}`}>
          {result === 'correct' ? '✓' : '✗'}
        </div>
      )}

      {result !== null && settings.showTranscript === 'on-result' && heard && (
        <div className="transcript-heard">Heard: "{heard}"</div>
      )}

      {result === null && (
        <div className="answer-actions">
          <RecordButton
            isListening={isListening}
            onStart={start}
            onStop={stop}
            listenMode={settings.listeningMode}
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
