import * as wanakana from 'wanakana'

/**
 * Convert any Japanese text to hiragana using kuromoji readings.
 * Falls back to wanakana katakana→hiragana for strings already in kana.
 */
export function toHiragana(text, tokenizer) {
  if (!text) return ''
  const cleaned = text.trim()

  if (tokenizer) {
    const tokens = tokenizer.tokenize(cleaned)
    const hiragana = tokens
      .map((t) => {
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
 * Accepts if exact match or Levenshtein distance ≤ 1.
 */
export function compareJapanese(expected, candidates, tokenizer) {
  const normalizedExpected = toHiragana(expected, tokenizer)
  for (const candidate of candidates) {
    const normalizedCandidate = toHiragana(candidate, tokenizer)
    if (normalizedExpected === normalizedCandidate) return true
    if (levenshtein(normalizedExpected, normalizedCandidate) <= 1) return true
  }
  return false
}

/**
 * Compare English: case-insensitive match against accepted synonyms.
 * Accepts if any candidate matches any accepted answer within Levenshtein ≤ 2.
 */
export function compareEnglish(acceptedList, candidates) {
  const normalize = (s) => s.toLowerCase().trim()
  for (const candidate of candidates) {
    const normCand = normalize(candidate)
    for (const accepted of acceptedList) {
      const normAccepted = normalize(accepted)
      if (normCand === normAccepted) return true
      if (levenshtein(normCand, normAccepted) <= 2) return true
    }
  }
  return false
}
