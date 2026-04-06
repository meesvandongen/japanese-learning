import { useState } from 'react'
import { Card, BlockTitle, Segmented, SegmentedButton, List, ListItem, Chip } from 'konsta/react'
import { useAppStore } from '../store/appStore'
import { formatDue } from '../srs/sm2'
import type { Word, Language, Level } from '../types'
import type { CardState } from '../types'

const MASTERED_INTERVAL = 21

type CardStatus = 'new' | 'overdue' | 'learning' | 'mastered'

function classifyCard(state: CardState | null): CardStatus {
  if (!state?.dueDate) return 'new'
  if (state.dueDate <= Date.now()) return 'overdue'
  if (state.interval >= MASTERED_INTERVAL) return 'mastered'
  return 'learning'
}

const STATUS_ORDER: Record<CardStatus, number> = { overdue: 0, learning: 1, new: 2, mastered: 3 }
const STATUS_LABEL: Record<CardStatus, string> = { overdue: 'Overdue', learning: 'Learning', new: 'New', mastered: 'Mastered' }

const STATUS_CHIP_COLORS: Record<CardStatus, string> = {
  new: '!bg-indigo-100 !text-indigo-800',
  learning: '!bg-blue-100 !text-blue-800',
  overdue: '!bg-red-100 !text-red-800',
  mastered: '!bg-purple-100 !text-purple-800',
}

interface Props {
  words: Word[]
  activeLang?: Language
  activeLevel?: Level
}

interface EnrichedWord extends Word {
  state: CardState | null
  status: CardStatus
}

export function ProfilePage({ words, activeLang: _activeLang, activeLevel }: Props) {
  const cardStates = useAppStore((s) => s.cards)
  const [filter, setFilter] = useState('all')

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

  const reviewedTotal = enriched.filter((w) => w.state?.lastReview).length
  const avgEase = (() => {
    const seen = enriched.filter((w) => w.state)
    if (!seen.length) return null
    return (seen.reduce((s, w) => s + w.state!.easeFactor, 0) / seen.length).toFixed(2)
  })()

  return (
    <div className="mt-2">
      {/* Summary cards */}
      <div className="flex gap-2 flex-wrap mb-4">
        <SummaryCard value={words.length} label={activeLevel?.label ?? 'Total words'} />
        <SummaryCard value={reviewedTotal} label="Reviewed" color="blue" />
        <SummaryCard value={counts.mastered} label="Mastered" color="purple" />
        <SummaryCard value={counts.overdue} label="Due now" color="red" />
        {avgEase && <SummaryCard value={avgEase} label="Avg ease" />}
      </div>

      {/* Filter tabs */}
      <BlockTitle>Filter</BlockTitle>
      <Segmented strong rounded className="mx-0">
        {([
          { key: 'all', label: 'All', count: words.length },
          { key: 'overdue', label: 'Due', count: counts.overdue },
          { key: 'learning', label: 'Learn', count: counts.learning },
          { key: 'new', label: 'New', count: counts.new },
          { key: 'mastered', label: 'Done', count: counts.mastered },
        ] as const).map((t) => (
          <SegmentedButton key={t.key} active={filter === t.key} onClick={() => setFilter(t.key)}>
            {t.label} ({t.count})
          </SegmentedButton>
        ))}
      </Segmented>

      {/* Word list */}
      <List strong inset outline className="mt-4">
        {filtered.map((w) => (
          <WordRow key={w.kana} word={w} />
        ))}
      </List>
    </div>
  )
}

function SummaryCard({ value, label, color }: { value: number | string; label: string; color?: string }) {
  const colorClasses = {
    red: 'border-red-200 bg-red-50',
    blue: 'border-blue-200 bg-blue-50',
    purple: 'border-purple-200 bg-purple-50',
  }
  const valueColor = {
    red: 'text-red-600',
    blue: 'text-blue-600',
    purple: 'text-purple-600',
  }
  return (
    <Card
      outline
      contentWrapPadding="p-3"
      className={`flex-1 min-w-[72px] text-center ${color ? colorClasses[color as keyof typeof colorClasses] ?? '' : ''}`}
    >
      <div className={`text-2xl font-bold leading-none ${color ? valueColor[color as keyof typeof valueColor] ?? '' : ''}`}>
        {value}
      </div>
      <div className="text-[10px] uppercase tracking-wide text-gray-500 mt-1">{label}</div>
    </Card>
  )
}

function WordRow({ word }: { word: EnrichedWord }) {
  const { state, status } = word
  const primary = Array.isArray(word.english) ? word.english[0] : word.english

  return (
    <ListItem
      title={word.japanese}
      subtitle={primary}
      after={
        <div className="flex items-center gap-2">
          <Chip className={`text-[10px] font-bold ${STATUS_CHIP_COLORS[status]}`}>
            {STATUS_LABEL[status]}
          </Chip>
          {state?.dueDate && (
            <span className="text-[11px] text-gray-400">
              {state.dueDate <= Date.now() ? 'now' : formatDue(state.dueDate)}
            </span>
          )}
          {state && (
            <span className="text-[11px] text-gray-400">{state.interval}d</span>
          )}
        </div>
      }
    />
  )
}
