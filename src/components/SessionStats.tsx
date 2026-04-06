import { Chip } from 'konsta/react'
import { formatDue } from '../srs/sm2'

interface Props {
  dueCount: number
  newCount: number
  reviewedCount: number
  nextDueDate: number | null
  cardType: 'due' | 'new' | 'extra'
  streakCount: number
}

export function SessionStats({ dueCount, newCount, reviewedCount, nextDueDate, cardType, streakCount }: Props) {
  const allCaughtUp = dueCount === 0 && newCount === 0

  return (
    <div className="flex items-center gap-2 flex-wrap my-3">
      <Chip className={dueCount > 0 ? '!bg-red-100 !text-red-800' : '!bg-gray-200 !text-gray-500'}>
        <span className="font-bold mr-1">{dueCount}</span> Due
      </Chip>
      <Chip className={newCount > 0 ? '!bg-blue-100 !text-blue-800' : '!bg-gray-200 !text-gray-500'}>
        <span className="font-bold mr-1">{newCount}</span> New
      </Chip>
      <Chip className="!bg-green-50 !text-green-800">
        <span className="font-bold mr-1">{reviewedCount}</span> Session
      </Chip>
      {streakCount > 0 && (
        <Chip className="!bg-amber-100 !text-amber-800">
          <span className="font-bold mr-1">{streakCount}</span> Streak
        </Chip>
      )}
      {allCaughtUp && cardType === 'extra' && (
        <Chip className="!bg-green-100 !text-green-700">
          All caught up! Next: {nextDueDate ? formatDue(nextDueDate) : '\u2014'}
        </Chip>
      )}
    </div>
  )
}
