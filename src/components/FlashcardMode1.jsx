import { useState, useCallback } from 'react'
import { RecordButton } from './RecordButton'
import { RatingButtons } from './RatingButtons'
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

  const primaryEnglish = Array.isArray(card.english) ? card.english[0] : card.english

  return (
    <div className="flashcard">
      <CardTypeBadge type={cardType} />
      <div className="card-label">Say this in Japanese:</div>
      <div className="card-prompt english-prompt">{primaryEnglish}</div>

      {card.english.length > 1 && (
        <div className="synonyms">Also accepted: {card.english.slice(1).join(', ')}</div>
      )}

      {result === null && (
        <RecordButton isListening={isListening} onStart={start} onStop={stop} />
      )}

      {result === 'correct' && (
        <>
          <div className="feedback correct">
            Correct! <span className="answer-shown">{card.japanese}</span>
          </div>
          <RatingButtons onRate={onAnswer} />
        </>
      )}

      {result === 'incorrect' && (
        <>
          <div className="feedback incorrect">
            Incorrect — the answer is:{' '}
            <span className="answer-shown">{card.japanese}</span>
          </div>
          <button className="next-btn" onClick={() => onAnswer(1)}>
            Next card →
          </button>
        </>
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
