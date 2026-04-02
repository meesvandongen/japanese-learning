/**
 * Phonetic encoding utilities for fuzzy STT matching.
 *
 * Soundex  — groups consonants into 6 buckets; good for vowel variations
 *            (hot/hut/hat → H300) and same-consonant homophones (two/too → T000).
 *            Limitation: words starting with different letters never match
 *            even if they sound identical (write ≠ right).
 *
 * Metaphone — applies English pronunciation rules; handles silent letters
 *             (kn→n, wr→r, gh→silent/f), digraphs (ph→F, th→0), and
 *             context-sensitive consonants (c before e/i/y → S).
 *             Limitation: drops all vowels, so vowel-only differences still
 *             collapse (hot/hit/hate → HT).
 *
 * Using 'both' takes the union: a pair matches if either algorithm agrees.
 * This gives the best coverage — Soundex catches two/too, Metaphone catches
 * write/right — at the cost of a slightly higher false-positive rate.
 */

// ---------------------------------------------------------------------------
// Soundex
// ---------------------------------------------------------------------------

const SOUNDEX_MAP: Record<string, number> = {
  b: 1, f: 1, p: 1, v: 1,
  c: 2, g: 2, j: 2, k: 2, q: 2, s: 2, x: 2, z: 2,
  d: 3, t: 3,
  l: 4,
  m: 5, n: 5,
  r: 6,
}

export function soundex(word: string): string {
  const w = word.toLowerCase().replace(/[^a-z]/g, '')
  if (!w) return ''
  let code = w[0].toUpperCase()
  let prev = SOUNDEX_MAP[w[0]] ?? 0
  for (let i = 1; i < w.length && code.length < 4; i++) {
    const curr = SOUNDEX_MAP[w[i]] ?? 0
    if (curr && curr !== prev) code += curr
    prev = curr
  }
  return code.padEnd(4, '0')
}

// ---------------------------------------------------------------------------
// Metaphone
// ---------------------------------------------------------------------------

const VOWELS = new Set('aeiou')

export function metaphone(word: string): string {
  let s = word.toLowerCase().replace(/[^a-z]/g, '')
  if (!s) return ''

  // Drop initial silent pairs: kn, gn, ae, wr, pn
  if (/^(kn|gn|ae|wr|pn)/.test(s)) s = s.slice(1)

  let result = ''

  // Keep initial vowel as anchor (distinguishes "eat" from "at")
  if (VOWELS.has(s[0])) result = s[0].toUpperCase()

  for (let i = result ? 1 : 0; i < s.length; i++) {
    const c = s[i]
    const prev = s[i - 1] ?? ''
    const next = s[i + 1] ?? ''
    const next2 = s[i + 2] ?? ''

    if (VOWELS.has(c)) continue                    // drop internal vowels
    if (c !== 'c' && c === prev) continue          // drop duplicate consonants (not C)

    switch (c) {
      case 'b':
        // Silent B after M at end of word (bomb, lamb)
        if (!(prev === 'm' && i === s.length - 1)) result += 'B'
        break

      case 'c':
        if (next === 'h') {
          result += 'X'; i++                       // CH → X (church)
        } else if (next === 'i' || next === 'e' || next === 'y') {
          result += 'S'                             // soft C (city, cell)
        } else if (next === 'k') {
          i++                                       // CK → K (back)
          result += 'K'
        } else {
          result += 'K'                             // hard C (cat, cold)
        }
        break

      case 'd':
        if (next === 'g' && (next2 === 'e' || next2 === 'i' || next2 === 'y')) {
          result += 'J'; i++                       // DGE → J (edge)
        } else {
          result += 'T'
        }
        break

      case 'f':
        result += 'F'
        break

      case 'g':
        if (next === 'h') {
          // GH: F if after vowel at/near end (laugh, rough), else silent
          if (VOWELS.has(prev) && i + 2 >= s.length) result += 'F'
          i++
        } else if (next === 'n' && i + 2 >= s.length) {
          // Final GN: silent (sign, reign)
        } else if (next === 'e' || next === 'i' || next === 'y') {
          result += 'J'                             // soft G (gem, giant)
        } else {
          result += 'K'                             // hard G (go, get)
        }
        break

      case 'h':
        // H only voiced before a vowel when not already after a vowel
        if (VOWELS.has(next) && !VOWELS.has(prev)) result += 'H'
        break

      case 'j':
        result += 'J'
        break

      case 'k':
        if (prev !== 'c') result += 'K'            // silent after C (back → already consumed)
        break

      case 'l':
        result += 'L'
        break

      case 'm':
        result += 'M'
        break

      case 'n':
        result += 'N'
        break

      case 'p':
        if (next === 'h') { result += 'F'; i++ }  // PH → F (phone)
        else result += 'P'
        break

      case 'q':
        result += 'K'
        break

      case 'r':
        result += 'R'
        break

      case 's':
        if (next === 'h') {
          result += 'X'; i++                       // SH → X
        } else if (next === 'i' && (next2 === 'a' || next2 === 'o')) {
          result += 'X'; i += 2                    // SIA/SIO → X (session)
        } else if (next === 'c' && next2 === 'h') {
          result += 'SK'; i += 2                   // SCH → SK
        } else {
          result += 'S'
        }
        break

      case 't':
        if (next === 'h') {
          result += '0'; i++                       // TH → 0 (theta sound)
        } else if (next === 'i' && (next2 === 'a' || next2 === 'o')) {
          result += 'X'; i += 2                    // TIA/TIO → X (nation)
        } else if (next !== 'c') {
          result += 'T'                             // TC silent (catch handled via C)
        }
        break

      case 'v':
        result += 'F'                               // V and F are phonetically close
        break

      case 'w':
        if (VOWELS.has(next)) result += 'W'        // W only before vowel
        break

      case 'x':
        result += 'KS'
        break

      case 'y':
        if (VOWELS.has(next)) result += 'Y'        // Y only as consonant (yes, year)
        break

      case 'z':
        result += 'S'
        break
    }
  }

  return result
}

// ---------------------------------------------------------------------------
// Unified interface
// ---------------------------------------------------------------------------

/**
 * Returns true if words `a` and `b` are phonetically equivalent under the
 * given algorithm. Both words must have length > 2 to avoid spurious matches
 * on very short tokens.
 */
export function phoneticMatch(a: string, b: string, algorithm: 'soundex' | 'metaphone' | 'both' | 'off'): boolean {
  if (algorithm === 'off' || a.length <= 2 || b.length <= 2) return false
  if (algorithm === 'soundex')   return soundex(a)   === soundex(b)
  if (algorithm === 'metaphone') return metaphone(a) === metaphone(b)
  if (algorithm === 'both')      return soundex(a)   === soundex(b)
                                     || metaphone(a) === metaphone(b)
  return false
}
