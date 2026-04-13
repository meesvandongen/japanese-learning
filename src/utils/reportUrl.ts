import type { Word } from '../types'

const REPO_URL = 'https://github.com/meesvandongen/japanese-learning'

interface FeedbackInfo {
  heard?: string
  skipped?: boolean
}

export function buildReportUrl(word: Word, feedback?: FeedbackInfo): string {
  const title = `Vocab mistake: ${word.japanese} (${word.kana}) – ${word.english.join(', ')}`
  const body = [
    `**Word:** ${word.japanese}`,
    `**Reading:** ${word.kana}`,
    `**English:** ${word.english.join(', ')}`,
    word.hint ? `**Hint:** ${word.hint}` : '',
    '',
    '**User response**',
    feedback?.skipped
      ? 'Skipped (pressed "I don\'t know")'
      : feedback?.heard
        ? `Speech recognized: "${feedback.heard}"`
        : 'No speech input',
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
