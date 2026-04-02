const LABELS = { due: 'Review', new: 'New', extra: 'Extra practice' }

export function CardTypeBadge({ type }) {
  if (!type) return null
  return <span className={`card-type-badge badge-${type}`}>{LABELS[type]}</span>
}
