interface Props {
  type: 'due' | 'new' | 'extra' | undefined
}

const LABELS: Record<'due' | 'new' | 'extra', string> = { due: 'Review', new: 'New', extra: 'Extra practice' }

export function CardTypeBadge({ type }: Props) {
  if (!type) return null
  return <span className={`card-type-badge badge-${type}`}>{LABELS[type]}</span>
}
