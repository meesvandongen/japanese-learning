import { useState, useCallback, useEffect } from 'react'
import { RecordButton } from './RecordButton'
import { useSpeechRecognition } from '../hooks/useSpeechRecognition'
import { useSpeechSynthesis } from '../hooks/useSpeechSynthesis'
import { compareEnglish } from '../utils/normalize'

export function FlashcardMode4({ card, onNext }) {
  const [result, setResult] = useState(null) // null | 'correct' | 'incorrect'
  const [errorMsg, setErrorMsg] = useState('')
  const { isSpeaking, speak } = useSpeechSynthesis()

  // Auto-play audio when card changes
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

  const handleError = useCallback((msg) => {
    setErrorMsg(msg)
  }, [])

  const { isListening, start, stop } = useSpeechRecognition({
    lang: 'en-US',
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
      <div className="card-label">What does this mean in English?</div>

      <button
        className={`play-btn ${isSpeaking ? 'playing' : ''}`}
        onClick={() => speak(card.japanese, 'ja-JP')}
        aria-label="Play Japanese audio"
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
        <div className="feedback correct">
          ✓ Correct! <span className="answer-shown">{primaryEnglish}</span>
        </div>
      )}

      {result === 'incorrect' && (
        <div className="feedback incorrect">
          ✗ Incorrect — the answer is:{' '}
          <span className="answer-shown">{card.english.join(' / ')}</span>
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
