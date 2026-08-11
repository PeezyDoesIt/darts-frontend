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

    /**
     * The same suite on a narrow phone.
     *
     * Pixel 5 is 393px, and layout defects between 320 and 392 are invisible there. The
     * Spades bid chips were exactly that: at 393 the four sides fit one row and the suite
     * was green, while at 375 the fourth wrapped and stretched to triple the width of the
     * others. 375 is what an iPhone SE, 12 mini or 13 mini gives you, so it is a real
     * width rather than a contrived one.
     *
     * Height is held at 812 so this varies width alone — a shorter viewport changes what
     * sits above the fold, which is a different question and would muddy this one.
     */
    {
      name: 'narrow',
      use: { ...devices['Pixel 5'], viewport: { width: 375, height: 812 } },
    },
  ],
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:5173',
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
})
