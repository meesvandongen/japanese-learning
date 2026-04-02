import { formatDue } from '../srs/sm2'

interface Props {
  dueCount: number
  newCount: number
  reviewedCount: number
  nextDueDate: number | null
  cardType: 'due' | 'new' | 'extra'
}

interface PillProps {
  slot: string
  label: string
  value: number
  accent: string
}

/**
 * Session stats bar shown above the flashcard.
 */
export function SessionStats({ dueCount, newCount, reviewedCount, nextDueDate, cardType }: Props) {
  const allCaughtUp = dueCount === 0 && newCount === 0

  return (
    <div className="session-stats">
      <Pill slot="due" label="Due" value={dueCount} accent={dueCount > 0 ? 'due' : 'zero'} />
      <Pill slot="new" label="New" value={newCount} accent={newCount > 0 ? 'new' : 'zero'} />
      <Pill slot="session" label="Session" value={reviewedCount} accent="session" />

      {allCaughtUp && cardType === 'extra' && (
        <span className="caught-up-badge">
          All caught up! Next review: {nextDueDate ? formatDue(nextDueDate) : '—'}
        </span>
      )}
    </div>
  )
}

function Pill({ slot, label, value, accent }: PillProps) {
  return (
    <span data-pill={slot} className={`stats-pill pill-${accent}`}>
      <span className="pill-val">{value}</span>
      <span className="pill-lbl">{label}</span>
    </span>
  )
}
