import { useVocabContext } from '../context/VocabularyContext'
import type { Word } from '../types'

interface Props {
  card: Word
  mode: 1 | 4
  heard: string
}

export function ReportButton({ card, mode, heard }: Props) {
  const { activeLang, activeLevel } = useVocabContext()

  const modeLabel = mode === 1 ? 'Say in Japanese (EN → JA)' : 'Translate to English (JA → EN)'
  const wordLabel = card.kana !== card.japanese ? `${card.japanese} (${card.kana})` : card.japanese

  const title = `Mistake report: ${wordLabel} = ${card.english[0]}`

  const bodyLines = [
    `**Word:** ${wordLabel} = ${card.english.join(' / ')}${card.hint ? ` *(${card.hint})*` : ''}`,
  ]
  if (card.alt?.length) {
    bodyLines.push(`**Alternative forms:** ${card.alt.join(', ')}`)
  }
  bodyLines.push(
    `**Language/Level:** ${activeLang.name} — ${activeLevel.label}`,
    `**Mode:** ${modeLabel}`,
  )
  if (heard) {
    bodyLines.push(`**What was heard:** "${heard}"`)
  }
  bodyLines.push(
    '',
    '**Issue description:**',
    '<!-- Describe the problem here, e.g. wrong answer accepted, correct answer rejected, wrong kana, wrong English translation, etc. -->',
  )

  const url =
    `https://github.com/meesvandongen/japanese-learning/issues/new` +
    `?title=${encodeURIComponent(title)}&body=${encodeURIComponent(bodyLines.join('\n'))}`

  return (
    <a className="report-btn" href={url} target="_blank" rel="noopener noreferrer">
      Report mistake
    </a>
  )
}
