interface Props {
  result: 'correct' | 'incorrect' | null
  heard: string
  showText: boolean
  showTranscript: boolean
  correctText: string
  incorrectText: string
  kanaReading?: string
  onPlayAgain?: () => void
  isPlaying?: boolean
  manualGrading?: boolean
  onOverrideCorrect?: () => void
  onOverrideIncorrect?: () => void
}

export function FlashcardFeedback({
  result,
  heard,
  showText,
  showTranscript,
  correctText,
  incorrectText,
  kanaReading,
  onPlayAgain,
  isPlaying,
  manualGrading,
  onOverrideCorrect,
  onOverrideIncorrect,
}: Props) {
  if (!result) return null

  const answerText = result === 'correct' ? correctText : incorrectText

  return (
    <>
      {showText && (
        <div className={`feedback ${result}`}>
          {result === 'correct' && '✓ '}
          <span className="answer-shown">{answerText}</span>
          {kanaReading && kanaReading !== answerText && (
            <span className="answer-kana">{kanaReading}</span>
          )}
          {onPlayAgain && (
            <button
              className={`play-btn feedback-play ${isPlaying ? 'playing' : ''}`}
              onClick={onPlayAgain}
            >
              {isPlaying ? '🔊 Playing…' : '🔊 Play again'}
            </button>
          )}
        </div>
      )}
      {!showText && (
        <div className={`feedback-icon ${result}`}>
          {result === 'correct' ? '✓' : '✗'}
        </div>
      )}
      {showTranscript && heard && (
        <div className="transcript-heard">Heard: "{heard}"</div>
      )}
      {manualGrading && (
        <div className="manual-grading">
          {result === 'incorrect' && (
            <button className="override-btn override-correct" onClick={onOverrideCorrect}>
              Mark as correct
            </button>
          )}
          {result === 'correct' && (
            <button className="override-btn override-incorrect" onClick={onOverrideIncorrect}>
              Mark as incorrect
            </button>
          )}
        </div>
      )}
    </>
  )
}
