import { describe, it, expect } from 'vitest'
import { soundex, metaphone, phoneticMatch } from './phonetic'

describe('soundex', () => {
  it('returns empty string for empty input', () => {
    expect(soundex('')).toBe('')
  })

  it('pads short codes with zeros', () => {
    expect(soundex('a')).toBe('A000')
    expect(soundex('be')).toBe('B000')
  })

  it('groups phonetically similar consonants together', () => {
    // b, f, p, v → 1
    expect(soundex('Robert')).toBe(soundex('Rupert'))
  })

  it('encodes classic homophones identically', () => {
    expect(soundex('two')).toBe(soundex('too'))
    expect(soundex('their')).toBe(soundex('there'))
    expect(soundex('sea')).toBe(soundex('see'))
    expect(soundex('son')).toBe(soundex('sun'))
  })

  it('distinguishes words starting with different letters', () => {
    // soundex limitation: different initial letter → different code
    expect(soundex('write')).not.toBe(soundex('right'))
    expect(soundex('knight')).not.toBe(soundex('night'))
  })

  it('strips non-alpha characters', () => {
    expect(soundex("it's")).toBe(soundex('its'))
  })

  it('is case-insensitive', () => {
    expect(soundex('HOT')).toBe(soundex('hot'))
  })
})

describe('metaphone', () => {
  it('returns empty string for empty input', () => {
    expect(metaphone('')).toBe('')
  })

  it('drops initial silent pairs: kn, gn, wr, pn', () => {
    expect(metaphone('knight')).toBe(metaphone('night'))
    expect(metaphone('write')).toBe(metaphone('right'))
    expect(metaphone('gnaw')).toBe(metaphone('naw'))
    expect(metaphone('pneumonia')[0]).toBe('N')
  })

  it('handles PH → F', () => {
    expect(metaphone('phone')).toBe(metaphone('fone'))
  })

  it('handles CH → X and SH → X', () => {
    expect(metaphone('church')).toContain('X')
    expect(metaphone('ship')).toContain('X')
  })

  it('handles soft C (before e/i/y) → S', () => {
    expect(metaphone('city')).toContain('S')
    expect(metaphone('cell')).toContain('S')
  })

  it('handles hard C → K', () => {
    expect(metaphone('cat')).toContain('K')
  })

  it('handles TH → 0 (theta)', () => {
    expect(metaphone('the')).toContain('0')
    expect(metaphone('think')).toContain('0')
  })

  it('handles silent B after M', () => {
    // bomb → BM (final B silent)
    expect(metaphone('bomb')).toBe('BM')
    expect(metaphone('lamb')).toBe('LM')
  })

  it('encodes homophones that soundex misses', () => {
    expect(metaphone('write')).toBe(metaphone('right'))
    expect(metaphone('knight')).toBe(metaphone('night'))
  })

  it('drops duplicate consonants', () => {
    expect(metaphone('better')).toBe(metaphone('beter'))
  })

  it('handles V → F (phonetic closeness)', () => {
    expect(metaphone('very')[0]).toBe('F')
  })

  it('handles X → KS', () => {
    expect(metaphone('box')).toContain('KS')
  })

  it('handles Z → S', () => {
    expect(metaphone('fizz')).toBe(metaphone('fis'))
  })

  it('is case-insensitive', () => {
    expect(metaphone('HOT')).toBe(metaphone('hot'))
  })
})

describe('phoneticMatch', () => {
  it('returns false when algorithm is off', () => {
    expect(phoneticMatch('two', 'too', 'off')).toBe(false)
  })

  it('returns false for very short words (length <= 2) to avoid spurious matches', () => {
    expect(phoneticMatch('to', 'do', 'soundex')).toBe(false)
    expect(phoneticMatch('an', 'on', 'metaphone')).toBe(false)
  })

  it('soundex mode matches homophones', () => {
    expect(phoneticMatch('two', 'too', 'soundex')).toBe(true)
    expect(phoneticMatch('sea', 'see', 'soundex')).toBe(true)
  })

  it('metaphone mode matches homophones', () => {
    expect(phoneticMatch('write', 'right', 'metaphone')).toBe(true)
    expect(phoneticMatch('knight', 'night', 'metaphone')).toBe(true)
  })

  it('both mode: union of soundex and metaphone', () => {
    // two/too matched by soundex
    expect(phoneticMatch('two', 'too', 'both')).toBe(true)
    // write/right matched by metaphone (not soundex)
    expect(phoneticMatch('write', 'right', 'both')).toBe(true)
  })

  it('rejects clearly different words', () => {
    expect(phoneticMatch('hot', 'cold', 'soundex')).toBe(false)
    expect(phoneticMatch('hot', 'cold', 'metaphone')).toBe(false)
    expect(phoneticMatch('hot', 'cold', 'both')).toBe(false)
  })

  it('handles words with non-alpha characters', () => {
    expect(phoneticMatch("it's", 'its', 'soundex')).toBe(true)
  })
})
