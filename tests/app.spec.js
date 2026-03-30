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
  // Clear SRS progress for a clean slate
  await page.goto('/')
  await page.evaluate(() => {
    localStorage.removeItem('jp-flashcards-srs-v1')
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
    await expect(page.locator('h1')).toHaveText('Japanese Flashcards')
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

  test('correct answer shows rating buttons', async ({ page }) => {
    await setup(page)
    await speak(page, ['たべる'])
    await expect(page.locator('.rating-buttons')).toBeVisible()
    await expect(page.locator('.rating-hard')).toBeVisible()
    await expect(page.locator('.rating-good')).toBeVisible()
    await expect(page.locator('.rating-easy')).toBeVisible()
  })

  test('incorrect answer shows next-card button, no rating buttons', async ({ page }) => {
    await setup(page)
    await speak(page, ['まったくちがう'])
    await expect(page.locator('.next-btn')).toBeVisible()
    await expect(page.locator('.rating-buttons')).not.toBeVisible()
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
  test('clicking Good after correct answer advances to next card', async ({ page }) => {
    await setup(page)
    await speak(page, ['たべる'])
    await page.locator('.rating-good').click()
    // New card is shown — record button re-appears
    await expect(page.locator('.record-btn')).toBeVisible()
    // Feedback from previous card is gone
    await expect(page.locator('.feedback')).not.toBeVisible()
  })

  test('clicking next after incorrect advances to next card', async ({ page }) => {
    await setup(page)
    await speak(page, ['まったくちがう'])
    await page.locator('.next-btn').click()
    await expect(page.locator('.record-btn')).toBeVisible()
    await expect(page.locator('.feedback')).not.toBeVisible()
  })

  test('session reviewed count increments after each card', async ({ page }) => {
    await setup(page)
    await speak(page, ['たべる'])
    await page.locator('.rating-good').click()
    await expect(page.locator('[data-pill="session"] .pill-val')).toHaveText('1')

    await speak(page, ['まったくちがう'])
    await page.locator('.next-btn').click()
    await expect(page.locator('[data-pill="session"] .pill-val')).toHaveText('2')
  })

  test('new count decrements as new cards are reviewed', async ({ page }) => {
    await setup(page)
    await speak(page, ['たべる'])
    await page.locator('.rating-good').click()
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
    await page.locator('.rating-good').click()

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
    // Review one card
    await speak(page, ['たべる'])
    await page.locator('.rating-good').click()

    // Reload page (init script re-runs, localStorage preserved)
    await page.reload()
    await page.waitForSelector('.flashcard', { timeout: 35_000 })

    // Due count should still be 0 (card is not due yet), new count = 39
    await expect(page.locator('[data-pill="new"] .pill-val')).toHaveText('39')
    await expect(page.locator('[data-pill="due"] .pill-val')).toHaveText('0')
  })

  test('reset button clears all SRS progress', async ({ page }) => {
    await setup(page)
    // Review a card first
    await speak(page, ['たべる'])
    await page.locator('.rating-good').click()

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
