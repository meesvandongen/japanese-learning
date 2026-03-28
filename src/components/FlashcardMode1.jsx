import { useState, useCallback } from 'react'
import { RecordButton } from './RecordButton'
import { useSpeechRecognition } from '../hooks/useSpeechRecognition'
import { compareJapanese } from '../utils/normalize'

export function FlashcardMode1({ card, tokenizer, onNext }) {
  const [result, setResult] = useState(null) // null | 'correct' | 'incorrect'
  const [errorMsg, setErrorMsg] = useState('')

  const handleResult = useCallback(
    (transcripts) => {
      const correct = compareJapanese(card.kana, transcripts, tokenizer)
      setResult(correct ? 'correct' : 'incorrect')
    },
    [card, tokenizer]
  )

  const handleError = useCallback((msg) => {
    setErrorMsg(msg)
  }, [])

  const { isListening, start, stop } = useSpeechRecognition({
    lang: 'ja-JP',
    onResult: handleResult,
    onError: handleError,
  })

  const handleNext = () => {
    setResult(null)
    setErrorMsg('')
    onNext()
  }

  const primaryEnglish = Array.isArray(card.english) ? card.english[0] : card.english

  return (
    <div className="flashcard">
      <div className="card-label">Say this in Japanese:</div>
      <div className="card-prompt english-prompt">{primaryEnglish}</div>

      {card.english.length > 1 && (
        <div className="synonyms">
          Also accepted: {card.english.slice(1).join(', ')}
        </div>
      )}

      {result === null && (
        <RecordButton
          isListening={isListening}
          onStart={start}
          onStop={stop}
          disabled={false}
        />
      )}

      {result === 'correct' && (
        <div className="feedback correct">
          ✓ Correct! <span className="answer-shown">{card.japanese}</span>
        </div>
      )}

      {result === 'incorrect' && (
        <div className="feedback incorrect">
          ✗ Incorrect — the answer is:{' '}
          <span className="answer-shown">{card.japanese}</span>
        </div>
      )}

      {errorMsg && <div className="error-msg">{errorMsg}</div>}

      {result !== null && (
        <button className="next-btn" onClick={handleNext}>
          Next card →
        </button>
      )}
    </div>
  )
}
