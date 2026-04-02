/**
 * FlashcardFeedback — renders the result section shown after the user answers.
 *
 * Props:
 *   result        — 'correct' | 'incorrect' | null
 *   heard         — transcript string from speech recognition
 *   showText      — settings.feedbackText
 *   showTranscript — settings.showTranscript
 *   correctText   — text to display on a correct answer (e.g. card.japanese)
 *   incorrectText — text to display on an incorrect answer (e.g. card.english.join(' / '))
 */
export function FlashcardFeedback({ result, heard, showText, showTranscript, correctText, incorrectText }) {
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
