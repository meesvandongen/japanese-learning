/**
 * Post-correct rating buttons for SM-2 quality input.
 * Hard = 3, Good = 4 (default), Easy = 5
 */
export function RatingButtons({ onRate }) {
  return (
    <div className="rating-buttons">
      <span className="rating-label">How easy was that?</span>
      <div className="rating-row">
        <button className="rating-btn rating-hard" onClick={() => onRate(3)}>
          Hard
        </button>
        <button className="rating-btn rating-good" onClick={() => onRate(4)}>
          Good
        </button>
        <button className="rating-btn rating-easy" onClick={() => onRate(5)}>
          Easy
        </button>
      </div>
    </div>
  )
}
