import { Chip } from 'konsta/react'

interface Props {
  type: 'due' | 'new' | 'extra' | undefined
}

const LABELS: Record<'due' | 'new' | 'extra', string> = { due: 'Review', new: 'New', extra: 'Extra practice' }

const COLORS: Record<'due' | 'new' | 'extra', string> = {
  due: '!bg-red-100 !text-red-800',
  new: '!bg-blue-100 !text-blue-800',
  extra: '!bg-amber-100 !text-amber-800',
}

export function CardTypeBadge({ type }: Props) {
  if (!type) return null
  return <Chip className={`text-xs font-bold ${COLORS[type]}`}>{LABELS[type]}</Chip>
}
