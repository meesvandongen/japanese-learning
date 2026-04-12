import type { Word } from '../types'

const REPO_URL = 'https://github.com/meesvandongen/japanese-learning'

export function buildReportUrl(word: Word): string {
  const title = `Vocab mistake: ${word.japanese} (${word.kana}) – ${word.english.join(', ')}`
  const body = [
    `**Word:** ${word.japanese}`,
    `**Reading:** ${word.kana}`,
    `**English:** ${word.english.join(', ')}`,
    word.hint ? `**Hint:** ${word.hint}` : '',
    '',
    '**What is wrong?**',
    '',
    '<!-- Please describe the issue below -->',
  ]
    .filter(Boolean)
    .join('\n')

  const params = new URLSearchParams({ title, body, labels: 'vocab-mistake' })
  return `${REPO_URL}/issues/new?${params.toString()}`
}
