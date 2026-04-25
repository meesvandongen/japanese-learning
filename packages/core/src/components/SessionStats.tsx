import { XStack, Text, styled } from 'tamagui'
import { formatDue } from '../srs'

interface Props {
  dueCount: number
  newCount: number
  reviewedCount: number
  nextDueDate: number | null
  cardType: 'due' | 'new' | 'extra'
  streakCount: number
}

const Pill = styled(XStack, {
  paddingHorizontal: '$2',
  paddingVertical: '$1',
  borderRadius: '$3',
  gap: '$1',
  alignItems: 'baseline',
  variants: {
    accent: {
      due: { backgroundColor: '#ffe4b5' },
      new: { backgroundColor: '#cce7ff' },
      session: { backgroundColor: '#e8e8e8' },
      streak: { backgroundColor: '#ffecb3' },
      zero: { backgroundColor: '#f0f0f0' },
    },
  } as const,
})

/**
 * Session stats bar shown above the flashcard.
 */
export function SessionStats({
  dueCount,
  newCount,
  reviewedCount,
  nextDueDate,
  cardType,
  streakCount,
}: Props) {
  const allCaughtUp = dueCount === 0 && newCount === 0

  return (
    <XStack gap="$2" flexWrap="wrap" alignItems="center">
      <StatsPill label="Due" value={dueCount} accent={dueCount > 0 ? 'due' : 'zero'} />
      <StatsPill label="New" value={newCount} accent={newCount > 0 ? 'new' : 'zero'} />
      <StatsPill label="Session" value={reviewedCount} accent="session" />
      {streakCount > 0 && <StatsPill label="Streak" value={streakCount} accent="streak" />}

      {allCaughtUp && cardType === 'extra' && (
        <Text fontSize="$2" color="$textMuted">
          All caught up! Next review: {nextDueDate ? formatDue(nextDueDate) : '—'}
        </Text>
      )}
    </XStack>
  )
}

function StatsPill({
  label,
  value,
  accent,
}: {
  label: string
  value: number
  accent: 'due' | 'new' | 'session' | 'streak' | 'zero'
}) {
  return (
    <Pill accent={accent}>
      <Text fontWeight="700" fontSize="$4">{value}</Text>
      <Text fontSize="$1" color="$textMuted">{label}</Text>
    </Pill>
  )
}
