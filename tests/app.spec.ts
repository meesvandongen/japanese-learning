import { test, expect } from '@playwright/test'

// ---------------------------------------------------------------------------
// Speech API mock — injected before every page load via addInitScript.
//
// Replaces SpeechRecognition and SpeechSynthesis with controllable stubs.
// Tests drive recognition via:
//   page.evaluate(() => window.__triggerSpeechResult(['transcript']))
//   page.evaluate(() => window.__triggerSpeechError('no-speech'))
// ---------------------------------------------------------------------------
function speechMockScript() {
  let activeRecognition: {
    lang: string
    interimResults: boolean
    maxAlternatives: number
    onstart: (() => void) | null
    onresult: ((e: { results: { transcript: string }[][] }) => void) | null
    onend: (() => void) | null
    onerror: ((e: { error: string }) => void) | null
    start(): void
    stop(): void
  } | null = null

  class MockSpeechRecognition {
    lang = ''
    interimResults = false
    maxAlternatives = 1
    onstart: (() => void) | null = null
    onresult: ((e: { results: { transcript: string }[][] }) => void) | null = null
    onend: (() => void) | null = null
    onerror: ((e: { error: string }) => void) | null = null

    constructor() {
      activeRecognition = this
    }

    start() {
      setTimeout(() => this.onstart?.(), 0)
    }

    stop() {
      setTimeout(() => this.onend?.(), 0)
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (window as any).SpeechRecognition = MockSpeechRecognition
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ;(window as any).webkitSpeechRecognition = MockSpeechRecognition

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ;(window as any).__triggerSpeechResult = (transcripts: string[]) => {
    if (!activeRecognition) return
    activeRecognition.onresult?.({
      results: [transcripts.map((t) => ({ transcript: t }))],
    })
    setTimeout(() => activeRecognition?.onend?.(), 0)
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ;(window as any).__triggerSpeechError = (code: string) => {
    activeRecognition?.onerror?.({ error: code })
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ;(window as any).SpeechSynthesisUtterance = class {
    text: string
    lang = ''
    rate = 1
    voice = null
    onstart: (() => void) | null = null
    onend: (() => void) | null = null
    onerror: (() => void) | null = null
    constructor(text: string) {
      this.text = text
    }
  }

  // Use Object.defineProperty to ensure the mock replaces the native API
  // even when the browser defines speechSynthesis as non-writable.
  Object.defineProperty(window, 'speechSynthesis', {
    value: {
      speak(utterance: { onstart: (() => void) | null; onend: (() => void) | null }) {
        setTimeout(() => {
          utterance.onstart?.()
          utterance.onend?.()
        }, 10)
      },
      cancel() {},
      getVoices: () => [],
    },
    writable: true,
    configurable: true,
  })
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** Number of words in the ja/n5 vocabulary set. Update if the vocab file changes. */
const VOCAB_COUNT = 704

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function setup(page: import('@playwright/test').Page) {
  await page.addInitScript(speechMockScript)
  // Seed localStorage with a clean SRS slate and pre-selected language/level
  // so the onboarding screen is skipped and we land directly in the study view.
  // Zustand persist middleware wraps state in { state: {...}, version: 0 }.
  await page.goto('/')
  await page.evaluate(() => {
    localStorage.setItem(
      'jp-flashcards-srs-v1',
      JSON.stringify({
        state: { cards: {}, selectedLanguageId: 'ja', selectedLevelId: 'n5', streakCount: 0, streakLastDate: null },
        version: 0,
      })
    )
  })
  await page.reload()
  // Wait for kuromoji dictionary to finish loading (served from /dict)
  await page.waitForSelector('.flashcard', { timeout: 35_000 })
}

/** Simulate the user pressing the record button and speaking. */
async function speak(page: import('@playwright/test').Page, transcripts: string[]) {
  await page.locator('.record-btn').click()
  await page.evaluate(
    (t) => (window as unknown as { __triggerSpeechResult: (t: string[]) => void }).__triggerSpeechResult(t),
    transcripts
  )
}

/** Assert that every visible element matching `selector` is fully inside the viewport. */
async function assertInViewport(page: import('@playwright/test').Page, selector: string) {
  const viewport = page.viewportSize()!
  const boxes = await page.locator(selector).evaluateAll((els) =>
    els
      .filter((el) => {
        const style = window.getComputedStyle(el)
        return style.display !== 'none' && style.visibility !== 'hidden'
      })
      .map((el) => {
        const r = el.getBoundingClientRect()
        return { top: r.top, bottom: r.bottom, left: r.left, right: r.right }
      })
  )
  for (const box of boxes) {
    expect(box.top).toBeGreaterThanOrEqual(0)
    expect(box.bottom).toBeLessThanOrEqual(viewport.height)
    expect(box.left).toBeGreaterThanOrEqual(0)
    expect(box.right).toBeLessThanOrEqual(viewport.width)
  }
}

// ---------------------------------------------------------------------------
// Tests — App structure
// ---------------------------------------------------------------------------

test.describe('App loads', () => {
  test('renders header and default mode 1 card', async ({ page }) => {
    await setup(page)
    await expect(page.locator('.header-title-compact')).toContainText('Japanese')
    await expect(page.locator('.card-label')).toHaveText('Say this in Japanese:')
    await expect(page.locator('.record-btn')).toBeVisible()
  })

  test('shows correct initial session stats with all cards new', async ({ page }) => {
    await setup(page)
    await expect(page.locator('[data-pill="new"] .pill-val')).toHaveText(String(VOCAB_COUNT))
    await expect(page.locator('[data-pill="due"] .pill-val')).toHaveText('0')
    await expect(page.locator('[data-pill="session"] .pill-val')).toHaveText('0')
  })

  test('first card is labelled New', async ({ page }) => {
    await setup(page)
    await expect(page.locator('.badge-new')).toBeVisible()
  })
})

// ---------------------------------------------------------------------------
// Tests — Mode switching
// ---------------------------------------------------------------------------

test.describe('Mode switching', () => {
  test('switching to mode 4 shows audio card', async ({ page }) => {
    await setup(page)
    await page.getByText('Translate to English').click()
    await expect(page.locator('.card-label')).toHaveText('What does this mean in English?')
    await expect(page.locator('.play-btn')).toBeVisible()
  })

  test('switching back to mode 1 shows English prompt', async ({ page }) => {
    await setup(page)
    await page.getByText('Translate to English').click()
    await page.getByText('Say in Japanese').click()
    await expect(page.locator('.card-label')).toHaveText('Say this in Japanese:')
  })

  test('active mode button has active class', async ({ page }) => {
    await setup(page)
    await expect(page.locator('.mode-nav button.active')).toHaveText('Say in Japanese')
    await page.getByText('Translate to English').click()
    await expect(page.locator('.mode-nav button.active')).toHaveText('Translate to English')
  })
})

// ---------------------------------------------------------------------------
// Tests — Mode 1: English → Japanese speech
// ---------------------------------------------------------------------------

test.describe('Mode 1 — say in Japanese', () => {
  test('correct Japanese answer shows correct feedback', async ({ page }) => {
    await setup(page)
    // First card is always vocabulary[0] = { english: ['eat', 'to eat'], kana: 'たべる' }
    await speak(page, ['たべる'])
    await expect(page.locator('.feedback.correct')).toBeVisible()
    await expect(page.locator('.answer-shown')).toBeVisible()
  })

  test('incorrect answer shows incorrect feedback with correct answer', async ({ page }) => {
    await setup(page)
    await speak(page, ['まったくちがう'])
    await expect(page.locator('.feedback.incorrect')).toBeVisible()
    await expect(page.locator('.answer-shown')).toBeVisible()
    // All flashcard content must stay within the viewport
    await assertInViewport(page, '.flashcard')
    await assertInViewport(page, '.feedback')
  })

  test('dont-know button is visible before answering', async ({ page }) => {
    await setup(page)
    await expect(page.locator('.dont-know-btn')).toBeVisible()
  })

  test('dont-know button reveals the answer as incorrect', async ({ page }) => {
    await setup(page)
    await page.locator('.dont-know-btn').click()
    await expect(page.locator('.feedback.incorrect')).toBeVisible()
    await expect(page.locator('.answer-shown')).toBeVisible()
    await assertInViewport(page, '.flashcard')
  })

  test('record button disappears after answer is submitted', async ({ page }) => {
    await setup(page)
    await speak(page, ['たべる'])
    await expect(page.locator('.record-btn')).not.toBeVisible()
  })
})

// ---------------------------------------------------------------------------
// Tests — Viewport overflow (worst case)
// ---------------------------------------------------------------------------

test.describe('Viewport overflow', () => {
  test('wrong answer with all feedback options fits in viewport (mode 1)', async ({ page }) => {
    await setup(page)
    // Enable every optional element that adds height: text prompt, transcript, manual grading
    // Zustand persist wraps settings in { state: {...}, version: 0 }.
    await page.evaluate(() => {
      localStorage.setItem(
        'jp-flashcards-settings-v1',
        JSON.stringify({
          state: {
            autoListen: false,
            autoStartDelay: 500,
            maxListenDuration: 10000,
            keepScreenAwake: false,
            feedbackText: true,
            feedbackVoice: false,
            feedbackSound: false,
            phoneticSoundex: true,
            phoneticMetaphone: false,
            showTranscript: true,
            japaneseExerciseMode: 'audio',
            englishExerciseMode: 'text',
            manualGrading: true,
            speakToCorrect: false,
          },
          version: 0,
        })
      )
    })
    await page.reload()
    await page.waitForSelector('.flashcard', { timeout: 35_000 })

    // Trigger a wrong answer so feedback, transcript, and manual override all render
    await speak(page, ['まったくちがう'])
    await expect(page.locator('.feedback.incorrect')).toBeVisible()
    await expect(page.locator('.transcript-heard')).toBeVisible()
    await expect(page.locator('.manual-grading')).toBeVisible()

    // The entire flashcard and all its children must be within the viewport
    await assertInViewport(page, '.flashcard')
    await assertInViewport(page, '.feedback')
    await assertInViewport(page, '.transcript-heard')
    await assertInViewport(page, '.manual-grading')
    await assertInViewport(page, '.report-mistake-link')
  })

  test('wrong answer with all feedback options fits in viewport (mode 4)', async ({ page }) => {
    await setup(page)
    await page.evaluate(() => {
      localStorage.setItem(
        'jp-flashcards-settings-v1',
        JSON.stringify({
          state: {
            autoListen: false,
            autoStartDelay: 500,
            maxListenDuration: 10000,
            keepScreenAwake: false,
            feedbackText: true,
            feedbackVoice: false,
            feedbackSound: false,
            phoneticSoundex: true,
            phoneticMetaphone: false,
            showTranscript: true,
            japaneseExerciseMode: 'both',
            englishExerciseMode: 'text',
            manualGrading: true,
            speakToCorrect: false,
          },
          version: 0,
        })
      )
    })
    await page.reload()
    await page.waitForSelector('.flashcard', { timeout: 35_000 })

    await page.getByText('Translate to English').click()
    await speak(page, ['completely wrong answer here'])
    await expect(page.locator('.feedback.incorrect')).toBeVisible()
    await expect(page.locator('.transcript-heard')).toBeVisible()
    await expect(page.locator('.manual-grading')).toBeVisible()

    await assertInViewport(page, '.flashcard')
    await assertInViewport(page, '.feedback')
    await assertInViewport(page, '.transcript-heard')
    await assertInViewport(page, '.manual-grading')
  })
})

// ---------------------------------------------------------------------------
// Tests — Card progression and session stats
// ---------------------------------------------------------------------------

test.describe('Card progression', () => {
  test('correct answer auto-advances to next card', async ({ page }) => {
    await setup(page)
    await speak(page, ['たべる'])
    await expect(page.locator('.feedback.correct')).toBeVisible()
    // Auto-advances after ~1.2s — wait for the new card's record button
    await expect(page.locator('.record-btn')).toBeVisible({ timeout: 5000 })
    await expect(page.locator('.feedback')).not.toBeVisible()
  })

  test('incorrect answer auto-advances to next card', async ({ page }) => {
    await setup(page)
    await speak(page, ['まったくちがう'])
    await expect(page.locator('.feedback.incorrect')).toBeVisible()
    // Auto-advances after ~2.5s
    await expect(page.locator('.record-btn')).toBeVisible({ timeout: 6000 })
    await expect(page.locator('.feedback')).not.toBeVisible()
  })

  test('session reviewed count increments after auto-advance', async ({ page }) => {
    await setup(page)
    await speak(page, ['たべる'])
    await expect(page.locator('.record-btn')).toBeVisible({ timeout: 5000 })
    await expect(page.locator('[data-pill="session"] .pill-val')).toHaveText('1')

    await speak(page, ['まったくちがう'])
    await expect(page.locator('.record-btn')).toBeVisible({ timeout: 6000 })
    await expect(page.locator('[data-pill="session"] .pill-val')).toHaveText('2')
  })

  test('new count decrements after auto-advance', async ({ page }) => {
    await setup(page)
    await speak(page, ['たべる'])
    await expect(page.locator('.record-btn')).toBeVisible({ timeout: 5000 })
    await expect(page.locator('[data-pill="new"] .pill-val')).toHaveText(String(VOCAB_COUNT - 1))
  })
})

// ---------------------------------------------------------------------------
// Tests — Mode 4: Japanese audio → English speech
// ---------------------------------------------------------------------------

test.describe('Mode 4 — translate to English', () => {
  test('play button is visible and card hint shown', async ({ page }) => {
    await setup(page)
    await page.getByText('Translate to English').click()
    await expect(page.locator('.play-btn')).toBeVisible()
    await expect(page.locator('.card-hint')).toHaveText('Speak the English translation')
  })

  test('correct English answer shows correct feedback', async ({ page }) => {
    await setup(page)
    await page.getByText('Translate to English').click()
    // vocabulary[0].english[0] = 'eat'; STT returns 'eat'
    await speak(page, ['eat'])
    await expect(page.locator('.feedback.correct')).toBeVisible()
  })

  test('synonym is also accepted as correct', async ({ page }) => {
    await setup(page)
    await page.getByText('Translate to English').click()
    // vocabulary[0].english includes 'to eat'
    await speak(page, ['to eat'])
    await expect(page.locator('.feedback.correct')).toBeVisible()
  })

  test('wrong English answer shows incorrect feedback', async ({ page }) => {
    await setup(page)
    await page.getByText('Translate to English').click()
    await speak(page, ['completely wrong answer here'])
    await expect(page.locator('.feedback.incorrect')).toBeVisible()
    await assertInViewport(page, '.flashcard')
    await assertInViewport(page, '.feedback')
  })
})

// ---------------------------------------------------------------------------
// Tests — SRS persistence (localStorage)
// ---------------------------------------------------------------------------

test.describe('SRS persistence', () => {
  test('reviewed card state is saved to localStorage', async ({ page }) => {
    await setup(page)
    await speak(page, ['たべる'])
    // wait for auto-advance
    await expect(page.locator('.record-btn')).toBeVisible({ timeout: 5000 })

    const stored = await page.evaluate(() => {
      const raw = localStorage.getItem('jp-flashcards-srs-v1')
      return raw ? JSON.parse(raw) as { state: { cards: Record<string, { dueDate: number; repetitions: number }> } } : null
    })

    expect(stored).not.toBeNull()
    expect(stored!.state.cards).toBeDefined()
    // たべる should now have a dueDate set
    const card = stored!.state.cards['たべる']
    expect(card).toBeDefined()
    expect(card.dueDate).toBeGreaterThan(Date.now())
    expect(card.repetitions).toBe(1)
  })

  test('progress persists across page reload', async ({ page }) => {
    await setup(page)
    // Review one card and wait for auto-advance
    await speak(page, ['たべる'])
    await expect(page.locator('.record-btn')).toBeVisible({ timeout: 5000 })

    // Reload page (init script re-runs, localStorage preserved)
    await page.reload()
    await page.waitForSelector('.flashcard', { timeout: 35_000 })

    // Due count should still be 0 (card is not due yet), new count = 39
    await expect(page.locator('[data-pill="new"] .pill-val')).toHaveText(String(VOCAB_COUNT - 1))
    await expect(page.locator('[data-pill="due"] .pill-val')).toHaveText('0')
  })

  test('reset button clears all SRS progress', async ({ page }) => {
    await setup(page)
    // Review a card first and wait for auto-advance
    await speak(page, ['たべる'])
    await expect(page.locator('.record-btn')).toBeVisible({ timeout: 5000 })

    // Navigate to Settings page where the reset button lives
    await page.locator('.menu-btn').click()
    await page.locator('.menu-item', { hasText: 'Settings' }).click()
    await expect(page.locator('.reset-btn-settings')).toBeVisible()

    // Reset — this clears the store including language/level selection
    page.once('dialog', (dialog) => dialog.accept())
    await page.locator('.reset-btn-settings').click()

    // After reset, the app navigates to / and shows language selector.
    // Re-select language and level to get back to the study view.
    await page.locator('.selector-card', { hasText: 'Japanese' }).click()
    await page.locator('.selector-card').first().click()
    await page.waitForSelector('.flashcard', { timeout: 35_000 })

    // All cards should be new again
    await expect(page.locator('[data-pill="new"] .pill-val')).toHaveText(String(VOCAB_COUNT))
    await expect(page.locator('[data-pill="session"] .pill-val')).toHaveText('0')
  })
})

// ---------------------------------------------------------------------------
// Tests — Extra practice (unlimited exercises)
// ---------------------------------------------------------------------------

test.describe('Extra practice', () => {
  test('extra practice badge appears when all new cards reviewed', async ({ page }) => {
    await setup(page)

    // Seed localStorage so all cards are reviewed and due far in the future
    const now = Date.now()
    const futureDate = now + 24 * 60 * 60 * 1000 // tomorrow

    await page.evaluate(async (due) => {
      // Fetch the actual vocab list so the test stays in sync with vocabulary changes
      const resp = await fetch('/vocab/ja/n5.json')
      const data = await resp.json() as { words: { kana: string }[] }
      const cards: Record<string, { repetitions: number; easeFactor: number; interval: number; dueDate: number; lastReview: number }> = {}
      data.words.forEach((w) => {
        cards[w.kana] = { repetitions: 1, easeFactor: 2.5, interval: 1, dueDate: due, lastReview: Date.now() - 1000 }
      })
      localStorage.setItem('jp-flashcards-srs-v1', JSON.stringify({
        state: { cards, selectedLanguageId: 'ja', selectedLevelId: 'n5', streakCount: 0, streakLastDate: null },
        version: 0,
      }))
    }, futureDate)

    await page.reload()
    await page.waitForSelector('.flashcard', { timeout: 35_000 })

    // All cards are upcoming — scheduler returns 'extra' type
    await expect(page.locator('.badge-extra')).toBeVisible()
    await expect(page.locator('.caught-up-badge')).toBeVisible()
  })
})

// ---------------------------------------------------------------------------
// Tests — Profile page
// ---------------------------------------------------------------------------

test.describe('Profile page', () => {
  test('Profile tab opens the profile page', async ({ page }) => {
    await setup(page)
    await page.locator('.menu-btn').click()
    await page.locator('.menu-item', { hasText: 'Profile' }).click()
    await expect(page.locator('.profile-page')).toBeVisible()
    await expect(page.locator('.summary-grid')).toBeVisible()
    await expect(page.locator('.word-table')).toBeVisible()
  })

  test('shows correct total word count', async ({ page }) => {
    await setup(page)
    await page.locator('.menu-btn').click()
    await page.locator('.menu-item', { hasText: 'Profile' }).click()
    await expect(page.locator('.summary-card').first()).toContainText(String(VOCAB_COUNT))
  })

  test('all words listed in All tab', async ({ page }) => {
    await setup(page)
    await page.locator('.menu-btn').click()
    await page.locator('.menu-item', { hasText: 'Profile' }).click()
    await expect(page.locator('.word-row')).toHaveCount(VOCAB_COUNT)
  })

  test('new words show New badge when nothing reviewed', async ({ page }) => {
    await setup(page)
    await page.locator('.menu-btn').click()
    await page.locator('.menu-item', { hasText: 'Profile' }).click()
    await expect(page.locator('.badge-new').first()).toBeVisible()
    // No learning or mastered rows
    await expect(page.locator('.badge-learning')).toHaveCount(0)
    await expect(page.locator('.badge-mastered')).toHaveCount(0)
  })

  test('reviewed card appears as Learning in profile', async ({ page }) => {
    await setup(page)
    // Review first card correctly and wait for auto-advance
    await speak(page, ['たべる'])
    await expect(page.locator('.record-btn')).toBeVisible({ timeout: 5000 })

    await page.locator('.menu-btn').click()
    await page.locator('.menu-item', { hasText: 'Profile' }).click()
    // たべる should now be Learning
    await expect(page.locator('.badge-learning')).toHaveCount(1)
    await expect(page.locator('.badge-new')).toHaveCount(VOCAB_COUNT - 1)
  })

  test('New filter shows only new cards', async ({ page }) => {
    await setup(page)
    await page.locator('.menu-btn').click()
    await page.locator('.menu-item', { hasText: 'Profile' }).click()
    await page.locator('.profile-tab', { hasText: 'New' }).click()
    const rows = page.locator('.word-row')
    await expect(rows).toHaveCount(VOCAB_COUNT)
    await expect(page.locator('.badge-new')).toHaveCount(VOCAB_COUNT)
  })

  test('Study tab returns to flashcard view', async ({ page }) => {
    await setup(page)
    await page.locator('.menu-btn').click()
    await page.locator('.menu-item', { hasText: 'Profile' }).click()
    await page.locator('.back-btn').click()
    await expect(page.locator('.flashcard')).toBeVisible()
    await expect(page.locator('.profile-page')).not.toBeVisible()
  })
})
