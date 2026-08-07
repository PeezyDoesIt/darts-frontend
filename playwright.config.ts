import { defineConfig, devices } from '@playwright/test'

/**
 * Smoke coverage for the thing the unit suite structurally cannot see: whether a game
 * actually boots and can be played in a browser. The unit tests cover scoring maths and bot
 * logic as pure functions — they never mount a view, so a broken route, a dead button or a
 * setup screen that refuses to start a game stays green all the way to production.
 */
export default defineConfig({
  testDir: './tests/smoke',
  // A failing smoke test means a game is unplayable. Retrying once absorbs the genuinely
  // flaky bits (dice animations, bot timers) without hiding a real break.
  retries: process.env.CI ? 1 : 0,
  forbidOnly: !!process.env.CI,
  reporter: process.env.CI ? [['github'], ['list']] : [['list']],
  use: {
    baseURL: 'http://localhost:5173',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: [
    // The app is phone-first, and every game page is laid out for a phone viewport.
    { name: 'mobile', use: { ...devices['Pixel 5'] } },
  ],
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:5173',
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
})
