import { test, expect } from '@playwright/test'

/**
 * Smoke tests for the Metro web bundle.
 *
 * These are intentionally light — the old Playwright suite hooked into the
 * implementation details of the JSX components (CSS classnames like
 * `.flashcard`, `.record-btn`). After the Tamagui port those classes are
 * gone, so the old test file was removed.
 *
 * What's still meaningful to test end-to-end:
 *   1. The static bundle boots and hydrates without JS errors.
 *   2. The language selector shows after manifest load.
 *   3. The service worker registers (walk-mode prerequisite).
 *
 * Deeper flashcard flows are covered by unit tests in packages/core.
 */
test('app boots and renders language selector', async ({ page }) => {
  const errors: string[] = []
  page.on('pageerror', (e) => errors.push(e.message))

  await page.goto('/')
  await expect(page.getByText('Choose a language to learn')).toBeVisible({ timeout: 30_000 })
  expect(errors).toEqual([])
})

test('service worker registers for offline caching', async ({ page }) => {
  await page.goto('/')
  const hasSW = await page.evaluate(async () => {
    if (!('serviceWorker' in navigator)) return false
    const reg = await navigator.serviceWorker.getRegistration()
    return !!reg
  })
  expect(hasSW).toBe(true)
})

test('language selector offers at least one language', async ({ page }) => {
  await page.goto('/')
  await page.waitForSelector('text=Choose a language to learn', { timeout: 30_000 })
  const japanese = page.getByRole('button', { name: /Japanese/i })
  await expect(japanese).toBeVisible()
})
