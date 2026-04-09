import * as wanakana from 'wanakana'
import { phoneticMatch } from './phonetic'

/**
 * Kanji compounds whose standard colloquial reading differs from the
 * character-by-character on'yomi that kuromoji's IPA dictionary returns.
 * These are 熟字訓 (jukujikun) or words with strongly preferred kun'yomi
 * readings in everyday speech.
 */
const READING_OVERRIDES = {
  // Days
  '一昨日': 'おととい',
  '昨日': 'きのう',
  '今日': 'きょう',
  '明日': 'あした',
  '明後日': 'あさって',
  // Years
  '一昨年': 'おととし',
  '去年': 'きょねん',
  '今年': 'ことし',
  '来年': 'らいねん',
  '再来年': 'さらいねん',
  // Months
  '先月': 'せんげつ',
  '今月': 'こんげつ',
  '来月': 'らいげつ',
  // Weeks
  '先週': 'せんしゅう',
  '今週': 'こんしゅう',
  '来週': 'らいしゅう',
  // Other common temporal
  '今朝': 'けさ',
  '昨夜': 'ゆうべ',
  // Common jukujikun (non-temporal)
  '大人': 'おとな',
  '一人': 'ひとり',
  '二人': 'ふたり',
}

/**
 * Convert any Japanese text to hiragana using kuromoji readings.
 * Falls back to wanakana katakana→hiragana for strings already in kana.
 *
 * Applies READING_OVERRIDES for kanji whose colloquial spoken reading
 * differs from the on'yomi that kuromoji returns.
 */
export function toHiragana(text, tokenizer) {
  if (!text) return ''
  const cleaned = text.trim()

  // Exact whole-string override (handles single-word STT output)
  if (READING_OVERRIDES[cleaned]) return READING_OVERRIDES[cleaned]

  if (tokenizer) {
    const tokens = tokenizer.tokenize(cleaned)
    const hiragana = tokens
      .map((t) => {
        // Per-token override for kanji with irregular readings
        if (READING_OVERRIDES[t.surface_form]) return READING_OVERRIDES[t.surface_form]
        // reading is in katakana; fall back to surface form if missing
        const reading = t.reading || t.surface_form
        return wanakana.toHiragana(reading)
      })
      .join('')
    if (hiragana) return hiragana
  }

  // Fallback: convert katakana directly, leave hiragana as-is
  return wanakana.toHiragana(cleaned)
}

/**
 * Levenshtein distance between two strings.
 */
function levenshtein(a, b) {
  const m = a.length
  const n = b.length
  const dp = Array.from({ length: m + 1 }, (_, i) =>
    Array.from({ length: n + 1 }, (_, j) => (i === 0 ? j : j === 0 ? i : 0))
  )
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      dp[i][j] =
        a[i - 1] === b[j - 1]
          ? dp[i - 1][j - 1]
          : 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1])
    }
  }
  return dp[m][n]
}

/**
 * Compare Japanese: normalize both strings to hiragana and check fuzzy match.
 * Also handles transcripts with extra surrounding words (e.g. "あついです" for "あつい").
 */
export function compareJapanese(expected, candidates, tokenizer) {
  const normalizedExpected = toHiragana(expected, tokenizer)
  for (const candidate of candidates) {
    const normalizedCandidate = toHiragana(candidate, tokenizer)

    // Full-phrase exact or near match
    if (normalizedExpected === normalizedCandidate) return true
    if (levenshtein(normalizedExpected, normalizedCandidate) <= 1) return true

    // Word-level: STT may output multiple space-separated segments
    for (const word of normalizedCandidate.split(/\s+/).filter(Boolean)) {
      if (word === normalizedExpected) return true
      if (levenshtein(word, normalizedExpected) <= 1) return true
    }

    // Substring: expected hiragana contained within a longer transcript
    // (e.g. politeness forms: "あついです" contains "あつい")
    if (normalizedCandidate.includes(normalizedExpected)) return true
  }
  return false
}

/**
 * Compare English: case-insensitive match against accepted synonyms.
 * Combines full-phrase fuzzy matching, word-level token matching, and
 * configurable phonetic matching.
 *
 * @param {string[]} acceptedList
 * @param {string[]} candidates  — STT transcripts, most confident first
 * @param {{ phoneticAlgorithm?: 'off'|'soundex'|'metaphone'|'both' }} [config]
 */
export function compareEnglish(acceptedList, candidates, { phoneticAlgorithm = 'soundex' } = {}) {
  const norm = (s) => s.toLowerCase().trim().replace(/['']/g, '').replace(/[^a-z0-9\s]/g, '')

  for (const candidate of candidates) {
    const normCand = norm(candidate)
    const candWords = normCand.split(/\s+/).filter(Boolean)

    for (const accepted of acceptedList) {
      const normAccepted = norm(accepted)
      const accWords = normAccepted.split(/\s+/).filter(Boolean)

      // 1. Full-phrase exact or fuzzy match
      if (normCand === normAccepted) return true
      if (levenshtein(normCand, normAccepted) <= 2) return true

      // 2. Word-level: every word of the accepted answer must appear somewhere
      //    in the transcript (handles extra surrounding words in the transcript)
      const allWordsMatch = accWords.every((accWord) =>
        candWords.some(
          (candWord) =>
            candWord === accWord ||
            levenshtein(candWord, accWord) <= 1 ||
            phoneticMatch(candWord, accWord, phoneticAlgorithm)
        )
      )
      if (allWordsMatch) return true
    }
  }
  return false
}
