import { useState } from 'react'
import { YStack, XStack, Text, Button, Card, ScrollView, styled } from 'tamagui'
import { useAppStore } from '../store'
import { formatDue } from '../srs'
import type { Word, Language, Level, CardState } from '../types'

const MASTERED_INTERVAL = 21

type CardStatus = 'new' | 'overdue' | 'learning' | 'mastered'

function classifyCard(state: CardState | null): CardStatus {
  if (!state?.dueDate) return 'new'
  if (state.dueDate <= Date.now()) return 'overdue'
  if (state.interval >= MASTERED_INTERVAL) return 'mastered'
  return 'learning'
}

const STATUS_ORDER: Record<CardStatus, number> = { overdue: 0, learning: 1, new: 2, mastered: 3 }
const STATUS_LABEL: Record<CardStatus, string> = {
  overdue: 'Overdue',
  learning: 'Learning',
  new: 'New',
  mastered: 'Mastered',
}

const StatusBadge = styled(Text, {
  paddingHorizontal: '$2',
  paddingVertical: 2,
  borderRadius: '$2',
  fontSize: 10,
  fontWeight: '700',
  textTransform: 'uppercase',
  variants: {
    status: {
      overdue: { backgroundColor: '#ffccbc', color: '#bf360c' },
      learning: { backgroundColor: '#c8e6c9', color: '#1b5e20' },
      new: { backgroundColor: '#bbdefb', color: '#0d47a1' },
      mastered: { backgroundColor: '#d1c4e9', color: '#311b92' },
    },
  } as const,
})

interface Props {
  words: Word[]
  activeLang?: Language
  activeLevel?: Level
}

interface EnrichedWord extends Word {
  state: CardState | null
  status: CardStatus
}

export function ProfilePage({ words, activeLevel }: Props) {
  const cardStates = useAppStore((s) => s.cards)
  const [filter, setFilter] = useState<string>('all')

  const enriched: EnrichedWord[] = words.map((v) => {
    const state = cardStates[v.kana] ?? null
    return { ...v, state, status: classifyCard(state) }
  })

  const counts: Record<CardStatus, number> = { overdue: 0, learning: 0, new: 0, mastered: 0 }
  for (const w of enriched) counts[w.status]++

  const filtered = (filter === 'all' ? enriched : enriched.filter((w) => w.status === filter))
    .slice()
    .sort((a, b) => {
      const sd = STATUS_ORDER[a.status] - STATUS_ORDER[b.status]
      if (sd !== 0) return sd
      const da = a.state?.dueDate ?? Infinity
      const db = b.state?.dueDate ?? Infinity
      return da - db
    })

  const tabs = [
    { key: 'all', label: 'All', count: words.length },
    { key: 'overdue', label: 'Overdue', count: counts.overdue },
    { key: 'learning', label: 'Learning', count: counts.learning },
    { key: 'new', label: 'New', count: counts.new },
    { key: 'mastered', label: 'Mastered', count: counts.mastered },
  ]

  const reviewedTotal = enriched.filter((w) => w.state?.lastReview).length
  const avgEase = (() => {
    const seen = enriched.filter((w) => w.state)
    if (!seen.length) return null
    return (seen.reduce((s, w) => s + w.state!.easeFactor, 0) / seen.length).toFixed(2)
  })()

  return (
    <YStack flex={1} padding="$4" gap="$3" backgroundColor="$background">
      <XStack flexWrap="wrap" gap="$2">
        <SummaryCard value={words.length} label={activeLevel?.label ?? 'Total'} />
        <SummaryCard value={reviewedTotal} label="Reviewed" />
        <SummaryCard value={counts.mastered} label="Mastered" />
        <SummaryCard value={counts.overdue} label="Due now" />
        {avgEase && <SummaryCard value={avgEase} label="Avg ease" />}
      </XStack>

      <XStack gap="$1" flexWrap="wrap">
        {tabs.map((t) => (
          <Button
            key={t.key}
            size="$2"
            theme={filter === t.key ? 'active' : null}
            onPress={() => setFilter(t.key)}
          >
            {t.label} ({t.count})
          </Button>
        ))}
      </XStack>

      <ScrollView flex={1}>
        <YStack gap="$1">
          {filtered.map((w) => <WordRow key={w.kana} word={w} />)}
        </YStack>
      </ScrollView>
    </YStack>
  )
}

function SummaryCard({ value, label }: { value: number | string; label: string }) {
  return (
    <Card flex={1} minWidth={100} padding="$2" backgroundColor="$cardBackground" borderRadius="$3">
      <Text fontSize="$7" fontWeight="700">{value}</Text>
      <Text color="$textMuted" fontSize="$2">{label}</Text>
    </Card>
  )
}

function WordRow({ word }: { word: EnrichedWord }) {
  const { state, status } = word
  const primary = Array.isArray(word.english) ? word.english[0] : word.english

  return (
    <XStack
      padding="$2"
      gap="$2"
      borderRadius="$2"
      backgroundColor="$cardBackground"
      alignItems="center"
    >
      <YStack flex={1}>
        <XStack gap="$2" alignItems="baseline">
          <Text fontWeight="600">{word.japanese}</Text>
          {word.japanese !== word.kana && <Text color="$textMuted" fontSize="$2">{word.kana}</Text>}
        </XStack>
        <Text fontSize="$2" color="$textMuted">{primary}</Text>
      </YStack>
      <YStack alignItems="flex-end" gap="$1">
        <StatusBadge status={status}>{STATUS_LABEL[status]}</StatusBadge>
        {state?.dueDate && (
          <Text fontSize="$1" color="$textMuted">
            {state.dueDate <= Date.now() ? 'now' : formatDue(state.dueDate)}
          </Text>
        )}
        {state && <Text fontSize="$1" color="$textMuted">{state.interval}d</Text>}
      </YStack>
    </XStack>
  )
}
