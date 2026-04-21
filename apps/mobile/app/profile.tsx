import { YStack, H2, Text, Spinner } from 'tamagui'
import { useAppStore, useVocabulary, formatDue } from '@japanese-learning/core'
import type { CardState } from '@japanese-learning/core'

const MASTERED_INTERVAL = 21

function statusOf(card: CardState | undefined): 'new' | 'overdue' | 'learning' | 'mastered' {
  if (!card?.dueDate) return 'new'
  if (card.dueDate <= Date.now()) return 'overdue'
  if (card.interval >= MASTERED_INTERVAL) return 'mastered'
  return 'learning'
}

/**
 * Profile screen: a terse summary of review progress. The web version has a
 * full per-card browser; for the mobile scaffold we start with the counters
 * and add the browser later once the card list component is ported.
 */
export default function ProfileRoute() {
  const selectedLanguageId = useAppStore((s) => s.selectedLanguageId)
  const selectedLevelId = useAppStore((s) => s.selectedLevelId)
  const cards = useAppStore((s) => s.cards)

  const { words, isVocabLoading } = useVocabulary(selectedLanguageId, selectedLevelId)

  if (isVocabLoading) {
    return (
      <YStack flex={1} alignItems="center" justifyContent="center" backgroundColor="$background">
        <Spinner />
      </YStack>
    )
  }

  const counts = { new: 0, overdue: 0, learning: 0, mastered: 0 }
  let soonest: number | null = null
  for (const w of words) {
    const s = statusOf(cards[w.kana])
    counts[s]++
    const due = cards[w.kana]?.dueDate
    if (s === 'learning' && due && (soonest === null || due < soonest)) soonest = due
  }

  return (
    <YStack flex={1} padding="$4" gap="$4" backgroundColor="$background">
      <H2>Profile</H2>
      <Text>Total words: {words.length}</Text>
      <Text>New: {counts.new}</Text>
      <Text>Overdue: {counts.overdue}</Text>
      <Text>Learning: {counts.learning}</Text>
      <Text>Mastered: {counts.mastered}</Text>
      {soonest && <Text color="$textMuted">Next due: {formatDue(soonest)}</Text>}
    </YStack>
  )
}
