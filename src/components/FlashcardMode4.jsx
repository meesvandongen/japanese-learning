import { useState, useCallback, useEffect } from 'react'
import { RecordButton } from './RecordButton'
import { RatingButtons } from './RatingButtons'
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

  const primaryEnglish = Array.isArray(card.english) ? card.english[0] : card.english

  return (
    <div className="flashcard">
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
        <RecordButton
          isListening={isListening}
          onStart={start}
          onStop={stop}
          disabled={isSpeaking}
        />
      )}

      {result === 'correct' && (
        <>
          <div className="feedback correct">
            Correct! <span className="answer-shown">{primaryEnglish}</span>
          </div>
          <RatingButtons onRate={onAnswer} />
        </>
      )}

      {result === 'incorrect' && (
        <>
          <div className="feedback incorrect">
            Incorrect — the answer is:{' '}
            <span className="answer-shown">{card.english.join(' / ')}</span>
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
