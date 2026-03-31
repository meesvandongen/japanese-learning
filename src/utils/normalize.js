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
 * Soundex phonetic encoding for English words.
 * Two words with the same code sound similar (e.g. "hot" / "hut" → H300).
 */
function soundex(word) {
  const map = { b:1,f:1,p:1,v:1, c:2,g:2,j:2,k:2,q:2,s:2,x:2,z:2, d:3,t:3, l:4, m:5,n:5, r:6 }
  const w = word.replace(/[^a-z]/g, '')
  if (!w) return ''
  let code = w[0].toUpperCase()
  let prev = map[w[0]] ?? 0
  for (let i = 1; i < w.length && code.length < 4; i++) {
    const curr = map[w[i]] ?? 0
    if (curr && curr !== prev) code += curr
    prev = curr
  }
  return code.padEnd(4, '0')
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
 * Soundex phonetic matching to handle extra words ("it's hot" → "hot")
 * and near-homophones ("two" / "too").
 */
export function compareEnglish(acceptedList, candidates) {
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
            // Soundex phonetic match for words > 2 chars (avoids false positives)
            (accWord.length > 2 && candWord.length > 2 && soundex(candWord) === soundex(accWord))
        )
      )
      if (allWordsMatch) return true
    }
  }
  return false
}
