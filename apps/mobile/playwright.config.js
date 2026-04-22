import { defineConfig, devices } from '@playwright/test'

/**
 * E2E tests for the Metro web output. `expo export --platform web` emits
 * a static site to ./dist; Playwright serves that via `wrangler dev` (same
 * runtime as production) so the service worker + _headers are exercised.
 *
 * The previous Playwright suite (apps/web/tests/app.spec.ts) was written
 * against CSS classnames that don't exist in the Tamagui port. Those tests
 * were removed; new smoke tests target accessibility labels instead. See
 * tests/smoke.spec.ts for the replacement.
 */
export default defineConfig({
  testDir: './tests',
  timeout: 40_000,
  expect: { timeout: 30_000 },
  fullyParallel: false,
  reporter: 'list',

  use: {
    baseURL: 'http://localhost:8787',
    trace: 'on-first-retry',
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],

  webServer: {
    command: 'npm run preview:web',
    port: 8787,
    reuseExistingServer: true,
    timeout: 120_000,
  },
})
