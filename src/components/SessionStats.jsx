import { formatDue } from '../srs/sm2'

/**
 * Session stats bar shown above the flashcard.
 */
export function SessionStats({ dueCount, newCount, reviewedCount, nextDueDate, cardType }) {
  const allCaughtUp = dueCount === 0 && newCount === 0

  return (
    <div className="session-stats">
      <Pill label="Due" value={dueCount} accent={dueCount > 0 ? 'due' : 'zero'} />
      <Pill label="New" value={newCount} accent={newCount > 0 ? 'new' : 'zero'} />
      <Pill label="Session" value={reviewedCount} accent="session" />

      {allCaughtUp && cardType === 'extra' && (
        <span className="caught-up-badge">
          All caught up! Next review: {nextDueDate ? formatDue(nextDueDate) : '—'}
        </span>
      )}
    </div>
  )
}

function Pill({ label, value, accent }) {
  return (
    <span className={`stats-pill pill-${accent}`}>
      <span className="pill-val">{value}</span>
      <span className="pill-lbl">{label}</span>
    </span>
  )
}
