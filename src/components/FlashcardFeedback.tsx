interface Props {
  result: 'correct' | 'incorrect' | null
  heard: string
  showText: boolean
  showTranscript: boolean
  correctText: string
  incorrectText: string
}

export function FlashcardFeedback({ result, heard, showText, showTranscript, correctText, incorrectText }: Props) {
  if (!result) return null

  return (
    <>
      {result === 'correct' && showText && (
        <div className="feedback correct">
          ✓ <span className="answer-shown">{correctText}</span>
        </div>
      )}
      {result === 'incorrect' && showText && (
        <div className="feedback incorrect">
          <span className="answer-shown">{incorrectText}</span>
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
    </>
  )
}
