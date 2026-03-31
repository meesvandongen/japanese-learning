# Word List Research: Difficulty Scoring for Japanese Vocabulary

## Overview

This document synthesizes research on establishing a structured Japanese vocabulary word list with difficulty ratings for the SRS flashcard app. It covers available datasets, difficulty frameworks, and a practical automation plan.

---

## 1. Difficulty Framework: Why JLPT Levels Are the Standard

### The JLPT (Japanese Language Proficiency Test)

JLPT levels are the de facto standard for expressing Japanese vocabulary difficulty in learning applications:

| Level | Difficulty | Approx. Words (cumulative) | Description |
|-------|-----------|---------------------------|-------------|
| **N5** | 1 (easiest) | ~800 | Basic everyday communication |
| **N4** | 2 | ~1,500 | Everyday conversational vocabulary |
| **N3** | 3 | ~3,000–5,000 | Intermediate; newspapers, everyday topics |
| **N2** | 4 | ~6,000–7,000 | Advanced; abstract/technical topics |
| **N1** | 5 (hardest) | ~10,000–12,000+ | Near-native; literary, formal vocabulary |

### Critical Caveat: No Official Word Lists

The Japan Foundation and JEES (the organizations running the test) have **never published official vocabulary lists** for any level. All JLPT word lists in circulation are community-compiled from test feedback, prior test materials (pre-2010 reform), and expert consensus. Despite this, community lists are highly consistent and used universally by apps like Anki, WaniKani community resources, Bunpro, and more.

### Why JLPT over Frequency Ranking?

| Approach | Pros | Cons |
|----------|------|------|
| **JLPT levels (N5–N1)** | Familiar to learners, pedagogically ordered, huge ecosystem | Unofficial; some words placed inconsistently |
| **Frequency rank** (corpus-based) | Objective, tied to real usage | Raw frequency can surface obscure grammatical words before useful vocabulary; no pedagogical structure |
| **Textbook order** (Genki, Minna no Nihongo) | Exactly sequenced for learners | Locked to specific textbooks; not universally applicable |
| **WaniKani levels (1–60)** | Kanji-first, carefully curated | Kanji-centric; requires API key; not open |

**Recommendation**: Use JLPT as the primary difficulty axis (N5=1 through N1=5), supplemented by frequency rank as a secondary signal for ordering within a level.

---

## 2. Best Available Datasets

### 2.1 JMdict / JMdict-Simplified (PRIMARY RECOMMENDATION)

**Repository**: [scriptin/jmdict-simplified](https://github.com/scriptin/jmdict-simplified) (346 stars)  
**License**: Creative Commons Attribution-ShareAlike 4.0 (same as JMdict)  
**Format**: JSON (converted from JMdict XML)

JMdict is the gold-standard open Japanese dictionary, maintained by the Electronic Dictionary Research and Development Group (EDRDG). The `jmdict-simplified` project converts it to clean JSON.

**Crucially, JMdict entries include a `jlpt` field** derived from community JLPT lists, giving JLPT level (1–4 in old format; many tools remap to N5–N1). The simplified version exposes this cleanly.

**Entry structure (simplified)**:
```json
{
  "id": "1578850",
  "kana": [{ "text": "たべる", "common": true }],
  "kanji": [{ "text": "食べる", "common": true }],
  "sense": [{
    "gloss": [{ "text": "to eat", "lang": "eng" }],
    "partOfSpeech": ["v1"]
  }],
  "jlpt": 5
}
```

**Download**: Pre-built JSON files released on GitHub releases page — no build step required. The `jmdict-eng.json` file is ~60MB uncompressed.

### 2.2 Bluskyo/JLPT_Vocabulary (EASIEST TO USE)

**Repository**: [Bluskyo/JLPT_Vocabulary](https://github.com/Bluskyo/JLPT_Vocabulary)  
**License**: Not explicitly stated (derived from tanos.co.uk / Jonathan Waller lists)  
**Format**: JSON and CSV, one file per JLPT level

This is the most directly usable dataset — pre-split JSON files per JLPT level derived from the Tanos/Jonathan Waller lists (the community standard). Converted from Anki `.anki` deck files.

**File structure per level** (e.g., `N5.json`):
```json
[
  { "kanji": "食べる", "kana": "たべる", "english": "to eat" },
  { "kanji": "飲む",   "kana": "のむ",   "english": "to drink" }
]
```

**Word counts** (Jonathan Waller / tanos.co.uk source):
- N5: ~689 words
- N4: ~602 words  
- N3: ~1,650 words
- N2: ~1,500 words
- N1: ~2,336 words

### 2.3 AnchorI/jlpt-kanji-dictionary

**Repository**: [AnchorI/jlpt-kanji-dictionary](https://github.com/AnchorI/jlpt-kanji-dictionary)  
**Format**: JSON datasets organized by JLPT level, includes English and Russian translations  
**Use case**: Good alternative source; includes kanji and vocabulary separately

### 2.4 Kaggle: JLPT Words by Level (robinpourtaud)

**URL**: https://www.kaggle.com/datasets/robinpourtaud/jlpt-words-by-level  
**Format**: CSV with `word`, `reading`, `meaning`, `jlpt_level` columns  
**License**: CC BY-SA 4.0  
**Use case**: Clean CSV, easy to import

### 2.5 BCCWJ (Balanced Corpus of Contemporary Written Japanese)

**Provider**: NINJAL (National Institute for Japanese Language and Linguistics)  
**URL**: https://clrd.ninjal.ac.jp/bccwj/en/freq-list.html  
**Size**: 104.3 million words  
**License**: Free for research/educational use  

The BCCWJ word frequency list is Japan's most authoritative corpus-based word frequency data. It provides frequency per million words across genres (books, magazines, newspapers, blogs, Yahoo Q&A, etc.). This is the best source for **frequency rank** as a secondary difficulty signal.

**Format**: Excel/tab-separated files with columns for word, reading, POS, frequency count, and genre-specific sub-counts.

### 2.6 Leeds Japanese Internet Corpus

**URL**: http://corpus.leeds.ac.uk/frqc/internet-jp.num  
**Size**: ~62M word tokens from web text  
**License**: Free for educational use  
**Format**: Plain text — `rank frequency lemma` (one per line)

Simple to use; provides ~23,000 ranked words. Less authoritative than BCCWJ but easier to parse and freely downloadable without registration.

**Example entries**:
```
1  4.12  の
2  3.67  に
...
500  0.43  食べる
```

### 2.7 Routledge Frequency Dictionary of Japanese

**Book**: "A Frequency Dictionary of Japanese" (2013) by Tetsuo Nishihara  
**GitHub parser**: [timothee-haudebourg/routledge-jp-frequencies-parser](https://github.com/timothee-haudebourg/routledge-jp-frequencies-parser)  

Covers top 5,000 most frequent Japanese words with POS, pronunciation, definitions, and normalized frequency per million. The GitHub parser converts the PDF to JSON. Requires owning the book.

---

## 3. Automation Strategy

### Approach: Lookup-Based JLPT Assignment

The cleanest automation path is:
1. Start with a target word list (either the app's existing words or a new expanded list)
2. For each word, look up its JLPT level in a reference database
3. Fall back to frequency rank for words not found
4. Manual curation for the remainder

### Option A: Use Bluskyo/JLPT_Vocabulary JSON directly (simplest)

Download `N5.json`, `N4.json`, `N3.json`, `N2.json`, `N1.json` from the repo. Build a lookup map:

```js
// scripts/build-jlpt-lookup.js
import n5 from './data/bluskyo/N5.json' assert { type: 'json' }
import n4 from './data/bluskyo/N4.json' assert { type: 'json' }
// ...

const lookup = new Map()
for (const word of n5) lookup.set(word.kana, { jlpt: 5, ...word })
for (const word of n4) lookup.set(word.kana, { jlpt: 4, ...word })
for (const word of n3) lookup.set(word.kana, { jlpt: 3, ...word })
for (const word of n2) lookup.set(word.kana, { jlpt: 2, ...word })
for (const word of n1) lookup.set(word.kana, { jlpt: 1, ...word })
```

Then annotate vocabulary.js entries automatically:
```js
for (const word of vocabulary) {
  const match = lookup.get(word.kana)
  word.jlpt = match?.jlpt ?? null  // null = not in any JLPT list
}
```

### Option B: Use jmdict-simplified (most comprehensive)

Download `jmdict-eng.json` from [scriptin/jmdict-simplified releases](https://github.com/scriptin/jmdict-simplified/releases). Build a kana→JLPT lookup:

```js
// scripts/annotate-from-jmdict.mjs
import { readFileSync, writeFileSync } from 'fs'

const jmdict = JSON.parse(readFileSync('./jmdict-eng.json', 'utf-8'))
const vocab = (await import('../src/data/vocabulary.js')).default

// Build lookup: kana reading → jlpt level
const lookup = new Map()
for (const entry of jmdict.words) {
  const jlpt = entry.jlpt  // number 1-5 or null
  if (!jlpt) continue
  for (const k of entry.kana) {
    if (!lookup.has(k.text) || lookup.get(k.text) > jlpt) {
      lookup.set(k.text, jlpt)
    }
  }
}

// Annotate
for (const word of vocab) {
  word.jlpt = lookup.get(word.kana) ?? null
  console.log(`${word.kana}: JLPT ${word.jlpt}`)
}
```

**JMdict JLPT encoding note**: JMdict uses the old 4-level system (1=N1, 2=N2, 3=N3/N4, 4=N5) in its raw data. `jmdict-simplified` remaps these to the modern N1–N5 scale. Always check the version's documentation.

### Option C: npm package `denver-edwards/jlpt`

**npm**: Not published to npm, but the GitHub repo [denver-edwards/jlpt](https://github.com/denver-edwards/jlpt) provides a JS library returning vocabulary words for practicing JLPT levels N5–N1. Useful as a reference.

### Automation Script Plan

```
scripts/
  fetch-jlpt-data.mjs      # Downloads Bluskyo JSON files from GitHub
  annotate-vocab.mjs       # Adds jlpt: N field to vocabulary.js entries  
  expand-vocab.mjs         # Generates expanded word list from JLPT sources
  validate-vocab.mjs       # Checks coverage, missing JLPT, duplicates
```

---

## 4. Recommended Data Schema

Add two fields to each vocabulary entry:

```js
// src/data/vocabulary.js
const vocabulary = [
  {
    english: ["eat", "to eat"],
    japanese: "たべる",     // display form (kana or kanji)
    kana: "たべる",          // normalized kana (SRS key)
    jlpt: 5,               // JLPT level: 5=N5 (easiest) → 1=N1 (hardest)
    freq: 523,             // Frequency rank from corpus (lower = more common)
  },
  // ...
]
```

**Why `jlpt: 5` for N5 (not `jlpt: "N5"` or `jlpt: 1`)?**

Using integers where `5 = N5 (beginner)` and `1 = N1 (advanced)` mirrors the natural ordering (higher number = easier). This makes sorting and filtering intuitive: `vocab.filter(w => w.jlpt >= 4)` returns N4+N5 words (beginner content).

Alternative: use `level: 1` through `level: 5` where `1=N5, 5=N1` (ascending difficulty). This is arguably more intuitive for the scheduler (`getNextCard` could prioritize lower levels first). Both work — just be consistent.

---

## 5. Vocabulary Expansion Plan

### Target Counts

For a meaningful SRS app covering beginner-to-intermediate Japanese:

| Phase | JLPT Levels | Word Count | Time to Learn (5/day) |
|-------|------------|-----------|----------------------|
| **MVP** | N5 | ~700 words | ~140 days |
| **Beginner** | N5 + N4 | ~1,300 words | ~260 days |
| **Intermediate** | N5–N3 | ~3,000 words | ~600 days |
| **Advanced** | N5–N2 | ~5,000 words | ~1,000 days |

**Recommended starting target**: N5 + N4 (~1,300 words), expanded incrementally.

### Content Structure

Group vocabulary by part of speech for balanced coverage:

- **Verbs (動詞)**: ~30% — core for sentence construction
- **Nouns (名詞)**: ~45% — highest raw count in any frequency list
- **Adjectives (形容詞/形容動詞)**: ~15% — i-adj and na-adj
- **Adverbs/particles/conjunctions**: ~10%

### Prioritization Within a Level

Within each JLPT level, order cards by **corpus frequency rank** (most frequent first). This ensures learners encounter the most useful words earliest even within a difficulty tier.

---

## 6. Related Tools and Resources

### jReadability (Japanese Text Readability)

**Author**: Satoshi Sato (Nagoya University)  
**URL**: https://jreadability.net/  
**Paper**: "Measuring the readability of Japanese texts for second language learners" (2012)

jReadability scores Japanese *text* (not individual words) on a 6-point scale (0=hardest, 6=easiest). It uses word frequency, sentence length, and kanji density. Not directly applicable to single-word difficulty, but useful for validating example sentences.

No public API. The web tool at jreadability.net accepts text input. The underlying algorithm is described in the paper but no open implementation exists.

### taishi-i/awesome-japanese-nlp-resources

**Repository**: [taishi-i/awesome-japanese-nlp-resources](https://github.com/taishi-i/awesome-japanese-nlp-resources)  
Curated list of Python libraries, LLMs, dictionaries, and corpora for Japanese NLP. Excellent reference for finding additional data sources.

### davidluzgouveia/kanji-data

**Repository**: [davidluzgouveia/kanji-data](https://github.com/davidluzgouveia/kanji-data)  
JSON kanji dataset with JLPT levels and WaniKani level information. Useful for adding kanji-level metadata if the app ever expands to kanji study.

### Yomitan / yomitan-jlpt-vocab

**Repository**: [stephenmk/yomitan-jlpt-vocab](https://github.com/stephenmk/yomitan-jlpt-vocab)  
Adds JLPT-level tags to Yomitan (browser dictionary). Uses Jonathan Waller's vocabulary lists as source. Good validation source — their JLPT assignments are widely trusted.

---

## 7. Implementation Plan

### Step 1: Download Reference Data

```bash
# Option A: Bluskyo JSON files (simplest, ~700KB total)
mkdir -p scripts/data/jlpt
for level in N5 N4 N3 N2 N1; do
  curl -o scripts/data/jlpt/${level}.json \
    "https://raw.githubusercontent.com/Bluskyo/JLPT_Vocabulary/main/${level}.json"
done

# Option B: jmdict-simplified release (~60MB)
# Download jmdict-eng.json from:
# https://github.com/scriptin/jmdict-simplified/releases/latest
```

### Step 2: Build the Lookup Table

Write `scripts/build-lookup.mjs` that:
1. Loads all JLPT-level JSON files
2. Creates a Map of `kana → { jlpt, kanji, english[] }`
3. Also loads Leeds/BCCWJ frequency data for `freq` rank
4. Outputs `scripts/data/lookup.json`

### Step 3: Annotate Existing vocabulary.js

Write `scripts/annotate.mjs` that:
1. Reads `src/data/vocabulary.js`
2. For each entry, looks up JLPT level and freq rank
3. Outputs updated entries with `jlpt` and `freq` fields
4. Reports words with no JLPT match (for manual curation)

### Step 4: Expand the Word List

Write `scripts/generate-vocab.mjs` that:
1. Takes all N5 words from the lookup
2. For each, finds the best English translation (from JMdict sense[0].gloss)
3. Deduplicates against existing vocabulary.js entries
4. Outputs a new/expanded `src/data/vocabulary.js`
5. Sorts by: JLPT level desc (N5 first) then freq rank asc (most common first)

### Step 5: Update the Scheduler

In `src/srs/scheduler.js`, update `getNextCard` to:
- Introduce new cards in difficulty order (N5 before N4, etc.)
- Use `jlpt` field to show appropriate "level badge" in the UI
- Optionally allow user to filter/focus on specific JLPT levels

### Step 6: Validate

Run `scripts/validate.mjs`:
- Coverage: what % of each JLPT level is covered
- No duplicates (by kana)
- All entries have valid jlpt (1–5) or explicit null
- Freq rank populated where available

---

## 8. Licensing Considerations

| Source | License | Usable? |
|--------|---------|---------|
| JMdict / jmdict-simplified | CC BY-SA 4.0 | Yes (attribution required) |
| Jonathan Waller JLPT lists (tanos.co.uk) | Free for personal/educational use | Yes (non-commercial) |
| Bluskyo/JLPT_Vocabulary | Derived from Tanos — informal | Yes (non-commercial) |
| BCCWJ frequency list | Free for research/educational | Yes |
| Leeds Internet Corpus | Free for educational | Yes |
| WaniKani data | Proprietary — requires API key | No (without key) |
| Core 2000/6000 Anki decks | Copyright iKnow/Benesse | No |

---

## 9. Summary Recommendation

**Recommended data pipeline**:

1. Use **Bluskyo/JLPT_Vocabulary** JSON files as the primary word list source (clean, structured, JLPT-labeled, immediately usable)
2. Cross-reference with **jmdict-simplified** for:
   - Richer English glosses (multiple synonyms)
   - Part-of-speech tags
   - Kanji/kana variants
3. Add **Leeds corpus frequency ranks** as secondary ordering signal
4. Schema: `{ english: [...], japanese: "...", kana: "...", jlpt: 5, freq: 523 }`
5. Expand to full N5 (~689 words) + N4 (~602 words) = ~1,300 words as Phase 1 target

The automation script can be run as a one-time build step (or regeneration when the word list needs updating), outputting a static `vocabulary.js` file that the app imports unchanged.
