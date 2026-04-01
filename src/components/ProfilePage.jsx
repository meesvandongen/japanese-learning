import { useState } from 'react'
import { useStore } from '../store/index'
import { appStore } from '../store/appStore'
import { formatDue } from '../srs/sm2'

const MASTERED_INTERVAL = 21 // days — considered mastered

function classifyCard(state) {
  if (!state?.dueDate) return 'new'
  if (state.dueDate <= Date.now()) return 'overdue'
  if (state.interval >= MASTERED_INTERVAL) return 'mastered'
  return 'learning'
}

const STATUS_ORDER = { overdue: 0, learning: 1, new: 2, mastered: 3 }
const STATUS_LABEL = { overdue: 'Overdue', learning: 'Learning', new: 'New', mastered: 'Mastered' }

/**
 * Props:
 *   words       — fetched vocabulary array for the active level (passed from App)
 *   activeLang  — language entry from manifest (for display)
 *   activeLevel — level entry from manifest (for display)
 */
export function ProfilePage({ words, activeLang, activeLevel }) {
  const cardStates = useStore(appStore, (s) => s.cards)
  const [filter, setFilter] = useState('all')

  const enriched = words.map((v) => {
    const state = cardStates[v.kana] ?? null
    return { ...v, state, status: classifyCard(state) }
  })

  const counts = { overdue: 0, learning: 0, new: 0, mastered: 0 }
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
    { key: 'all',      label: 'All',      count: words.length },
    { key: 'overdue',  label: 'Overdue',  count: counts.overdue },
    { key: 'learning', label: 'Learning', count: counts.learning },
    { key: 'new',      label: 'New',      count: counts.new },
    { key: 'mastered', label: 'Mastered', count: counts.mastered },
  ]

  const reviewedTotal = enriched.filter((w) => w.state?.lastReview).length
  const avgEase = (() => {
    const seen = enriched.filter((w) => w.state)
    if (!seen.length) return null
    return (seen.reduce((s, w) => s + w.state.easeFactor, 0) / seen.length).toFixed(2)
  })()

  return (
    <div className="profile-page">
      {/* Summary cards */}
      <div className="summary-grid">
        <SummaryCard value={words.length} label={activeLevel?.label ?? 'Total words'} />
        <SummaryCard value={reviewedTotal} label="Ever reviewed" accent="learning" />
        <SummaryCard value={counts.mastered} label="Mastered" accent="mastered" />
        <SummaryCard value={counts.overdue} label="Due now" accent="overdue" />
        {avgEase && <SummaryCard value={avgEase} label="Avg ease" />}
      </div>

      {/* Filter tabs */}
      <div className="profile-tabs">
        {tabs.map((t) => (
          <button
            key={t.key}
            className={`profile-tab ${filter === t.key ? 'active' : ''} tab-${t.key}`}
            onClick={() => setFilter(t.key)}
          >
            {t.label}
            <span className="tab-count">{t.count}</span>
          </button>
        ))}
      </div>

      {/* Word table */}
      <div className="word-table">
        {filtered.map((w) => (
          <WordRow key={w.kana} word={w} />
        ))}
      </div>
    </div>
  )
}

function SummaryCard({ value, label, accent }) {
  return (
    <div className={`summary-card ${accent ? `summary-${accent}` : ''}`}>
      <span className="summary-value">{value}</span>
      <span className="summary-label">{label}</span>
    </div>
  )
}

function WordRow({ word }) {
  const { state, status } = word
  const primary = Array.isArray(word.english) ? word.english[0] : word.english

  return (
    <div className={`word-row status-${status}`}>
      <div className="word-kana">{word.japanese}</div>
      <div className="word-english">{primary}</div>
      <div className="word-meta">
        <span className={`status-badge badge-${status}`}>{STATUS_LABEL[status]}</span>
        {state?.dueDate && (
          <span className="word-due">
            {state.dueDate <= Date.now() ? 'now' : formatDue(state.dueDate)}
          </span>
        )}
        {state && (
          <span className="word-interval" title="Current interval (days)">
            {state.interval}d
          </span>
        )}
      </div>
    </div>
  )
}
