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
  let activeRecognition = null

  class MockSpeechRecognition {
    constructor() {
      this.lang = ''
      this.interimResults = false
      this.maxAlternatives = 1
      this.onstart = null
      this.onresult = null
      this.onend = null
      this.onerror = null
      activeRecognition = this
    }

    start() {
      setTimeout(() => this.onstart?.(), 0)
    }

    stop() {
      setTimeout(() => this.onend?.(), 0)
    }
  }

  window.SpeechRecognition = MockSpeechRecognition
  window.webkitSpeechRecognition = MockSpeechRecognition

  window.__triggerSpeechResult = (transcripts) => {
    if (!activeRecognition) return
    activeRecognition.onresult?.({
      results: [transcripts.map((t) => ({ transcript: t }))],
    })
    setTimeout(() => activeRecognition?.onend?.(), 0)
  }

  window.__triggerSpeechError = (code) => {
    activeRecognition?.onerror?.({ error: code })
  }

  window.SpeechSynthesisUtterance = class {
    constructor(text) {
      this.text = text
      this.lang = ''
      this.rate = 1
      this.voice = null
      this.onstart = null
      this.onend = null
      this.onerror = null
    }
  }

  window.speechSynthesis = {
    speak(utterance) {
      setTimeout(() => {
        utterance.onstart?.()
        utterance.onend?.()
      }, 10)
    },
    cancel() {},
    getVoices: () => [],
  }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function setup(page) {
  await page.addInitScript(speechMockScript)
  // Seed localStorage with a clean SRS slate and pre-selected language/level
  // so the onboarding screen is skipped and we land directly in the study view.
  await page.goto('/')
  await page.evaluate(() => {
    localStorage.setItem(
      'jp-flashcards-srs-v1',
      JSON.stringify({ cards: {}, selectedLanguageId: 'ja', selectedLevelId: 'n5' })
    )
  })
  await page.reload()
  // Wait for kuromoji dictionary to finish loading (served from /dict)
  await page.waitForSelector('.flashcard', { timeout: 35_000 })
}

/** Simulate the user pressing the record button and speaking. */
async function speak(page, transcripts) {
  await page.locator('.record-btn').click()
  await page.evaluate(
    (t) => window.__triggerSpeechResult(t),
    transcripts
  )
}

// ---------------------------------------------------------------------------
// Tests — App structure
// ---------------------------------------------------------------------------

test.describe('App loads', () => {
  test('renders header and default mode 1 card', async ({ page }) => {
    await setup(page)
    await expect(page.locator('h1')).toContainText('Japanese')
    await expect(page.locator('.card-label')).toHaveText('Say this in Japanese:')
    await expect(page.locator('.record-btn')).toBeVisible()
  })

  test('shows correct initial session stats with all cards new', async ({ page }) => {
    await setup(page)
    // All 40 vocab items start as new
    await expect(page.locator('[data-pill="new"] .pill-val')).toHaveText('40')
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
  })

  test('record button disappears after answer is submitted', async ({ page }) => {
    await setup(page)
    await speak(page, ['たべる'])
    await expect(page.locator('.record-btn')).not.toBeVisible()
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
    await expect(page.locator('[data-pill="new"] .pill-val')).toHaveText('39')
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
      return raw ? JSON.parse(raw) : null
    })

    expect(stored).not.toBeNull()
    expect(stored.cards).toBeDefined()
    // たべる should now have a dueDate set
    const card = stored.cards['たべる']
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
    await expect(page.locator('[data-pill="new"] .pill-val')).toHaveText('39')
    await expect(page.locator('[data-pill="due"] .pill-val')).toHaveText('0')
  })

  test('reset button clears all SRS progress', async ({ page }) => {
    await setup(page)
    // Review a card first and wait for auto-advance
    await speak(page, ['たべる'])
    await expect(page.locator('.record-btn')).toBeVisible({ timeout: 5000 })

    // Reset
    page.once('dialog', (dialog) => dialog.accept())
    await page.locator('.reset-btn').click()

    // All 40 cards should be new again
    await expect(page.locator('[data-pill="new"] .pill-val')).toHaveText('40')
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

    await page.evaluate((due) => {
      const vocab = [
        'たべる','のむ','いく','くる','みる','する','はなす','きく','よむ','かく',
        'かう','うる','ねる','おきる','たつ','すわる','かえる','はいる','でる','わかる',
        'みず','たべもの','ひと','じかん','ひ','ほん','おかね','がっこう','くるま','いえ',
        'おおきい','ちいさい','あたらしい','ふるい','いい','わるい','はやい','おそい','あつい','さむい',
      ]
      const cards = {}
      vocab.forEach((kana) => {
        cards[kana] = { repetitions: 1, easeFactor: 2.5, interval: 1, dueDate: due, lastReview: Date.now() - 1000 }
      })
      localStorage.setItem('jp-flashcards-srs-v1', JSON.stringify({ cards }))
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
    await page.getByRole('button', { name: 'Profile' }).click()
    await expect(page.locator('.profile-page')).toBeVisible()
    await expect(page.locator('.summary-grid')).toBeVisible()
    await expect(page.locator('.word-table')).toBeVisible()
  })

  test('shows correct total word count', async ({ page }) => {
    await setup(page)
    await page.getByRole('button', { name: 'Profile' }).click()
    // 40 total words, first summary card
    await expect(page.locator('.summary-card').first()).toContainText('40')
  })

  test('all 40 words listed in All tab', async ({ page }) => {
    await setup(page)
    await page.getByRole('button', { name: 'Profile' }).click()
    await expect(page.locator('.word-row')).toHaveCount(40)
  })

  test('new words show New badge when nothing reviewed', async ({ page }) => {
    await setup(page)
    await page.getByRole('button', { name: 'Profile' }).click()
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

    await page.getByRole('button', { name: 'Profile' }).click()
    // たべる should now be Learning
    await expect(page.locator('.badge-learning')).toHaveCount(1)
    await expect(page.locator('.badge-new')).toHaveCount(39)
  })

  test('New filter shows only new cards', async ({ page }) => {
    await setup(page)
    await page.getByRole('button', { name: 'Profile' }).click()
    await page.locator('.profile-tab', { hasText: 'New' }).click()
    const rows = page.locator('.word-row')
    await expect(rows).toHaveCount(40)
    await expect(page.locator('.badge-new')).toHaveCount(40)
  })

  test('Study tab returns to flashcard view', async ({ page }) => {
    await setup(page)
    await page.getByRole('button', { name: 'Profile' }).click()
    await page.getByRole('button', { name: 'Study' }).click()
    await expect(page.locator('.flashcard')).toBeVisible()
    await expect(page.locator('.profile-page')).not.toBeVisible()
  })
})
