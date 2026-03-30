import { useState, useCallback, useEffect } from 'react'
import { RecordButton } from './RecordButton'
import { useSpeechRecognition } from '../hooks/useSpeechRecognition'
import { useSpeechSynthesis } from '../hooks/useSpeechSynthesis'
import { compareEnglish } from '../utils/normalize'

export function FlashcardMode4({ card, cardType, onAnswer }) {
  const [result, setResult] = useState(null) // null | 'correct' | 'incorrect'
  const [errorMsg, setErrorMsg] = useState('')
  const { isSpeaking, speak } = useSpeechSynthesis()

  useEffect(() => {
    const timer = setTimeout(() => speak(card.japanese, 'ja-JP'), 300)
    return () => clearTimeout(timer)
  }, [card, speak])

  const handleResult = useCallback(
    (transcripts) => {
      const correct = compareEnglish(card.english, transcripts)
      setResult(correct ? 'correct' : 'incorrect')
    },
    [card]
  )

  const { isListening, start, stop } = useSpeechRecognition({
    lang: 'en-US',
    onResult: handleResult,
    onError: setErrorMsg,
  })

  // Auto-advance: quick flash then move on
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

      {result === null && (
        <div className="answer-actions">
          <RecordButton
            isListening={isListening}
            onStart={start}
            onStop={stop}
            disabled={isSpeaking}
          />
          <button className="dont-know-btn" onClick={() => setResult('incorrect')} aria-label="Don't know">
            ?
          </button>
        </div>
      )}

      {result === 'correct' && (
        <div className="feedback correct">
          ✓ <span className="answer-shown">{primaryEnglish}</span>
        </div>
      )}

      {result === 'incorrect' && (
        <div className="feedback incorrect">
          <span className="answer-shown">{card.english.join(' / ')}</span>
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
