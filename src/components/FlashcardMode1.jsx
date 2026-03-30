import { useState, useCallback, useEffect } from 'react'
import { RecordButton } from './RecordButton'
import { useSpeechRecognition } from '../hooks/useSpeechRecognition'
import { compareJapanese } from '../utils/normalize'

export function FlashcardMode1({ card, tokenizer, cardType, onAnswer }) {
  const [result, setResult] = useState(null) // null | 'correct' | 'incorrect'
  const [errorMsg, setErrorMsg] = useState('')

  const handleResult = useCallback(
    (transcripts) => {
      const correct = compareJapanese(card.kana, transcripts, tokenizer)
      setResult(correct ? 'correct' : 'incorrect')
    },
    [card, tokenizer]
  )

  const { isListening, start, stop } = useSpeechRecognition({
    lang: 'ja-JP',
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
      <div className="card-label">Say this in Japanese:</div>
      <div className="card-prompt english-prompt">{primaryEnglish}</div>

      {card.english.length > 1 && (
        <div className="synonyms">Also accepted: {card.english.slice(1).join(', ')}</div>
      )}

      {result === null && (
        <div className="answer-actions">
          <RecordButton isListening={isListening} onStart={start} onStop={stop} />
          <button className="dont-know-btn" onClick={() => setResult('incorrect')} aria-label="Don't know">
            ?
          </button>
        </div>
      )}

      {result === 'correct' && (
        <div className="feedback correct">
          ✓ <span className="answer-shown">{card.japanese}</span>
        </div>
      )}

      {result === 'incorrect' && (
        <div className="feedback incorrect">
          <span className="answer-shown">{card.japanese}</span>
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
