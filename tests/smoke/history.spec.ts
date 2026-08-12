import { expect, test } from '@playwright/test'
import { seedRoster } from './helpers'

/**
 * The game history screen, with the API stubbed.
 *
 * game_results has been collecting a row for every completed game since it shipped and
 * nothing ever read one back. This is the read path, so it is worth proving it renders real
 * rows and not just its empty state — the empty state is what shows on any machine that
 * isn't signed in, which is every machine a test runs on.
 */

/** supabase-js reads the session straight out of localStorage, so a fake one is enough. */
const SUPABASE_KEY = 'sb-lnojmgfnqaxtodjjlyni-auth-token'

const FAR_FUTURE = 4102444800  // 2100-01-01, so the session never reads as expired

async function signIn(page: import('@playwright/test').Page) {
  await page.addInitScript(({ key, exp }) => {
    localStorage.setItem(key, JSON.stringify({
      access_token: 'test-token',
      refresh_token: 'test-refresh',
      expires_at: exp,
      token_type: 'bearer',
      user: { id: 'user-1', aud: 'authenticated' },
    }))
  }, { key: SUPABASE_KEY, exp: FAR_FUTURE })
}

/**
 * Noon on the previous calendar day, local time.
 *
 * This used to seed `Date.now() - 26 * 3600_000`, and an elapsed-hours offset is not a
 * calendar day: `dayLabel` buckets by local calendar date, so 26 hours back only reads as
 * "Yesterday" once the clock is past 02:00. Before that it lands two days back and falls
 * through to the weekday branch — the suite went green at 22:33 and red at 01:11 on the
 * same commit, labelling the row "Monday".
 *
 * Noon is the furthest point from either midnight, and `setDate`/`setHours` are local like
 * `dayKey` is, so this survives DST too.
 */
function yesterdayNoon(): Date {
  const d = new Date()
  d.setDate(d.getDate() - 1)
  d.setHours(12, 0, 0, 0)
  return d
}

const GAMES = [
  {
    id: 'g1', clientGameId: 'c1', gameType: 'cricket', winnerId: 'smoke-1',
    playerIds: ['smoke-1', 'smoke-2'], startedAt: null,
    finishedAt: new Date().toISOString(), roundCount: 7, finalScores: null,
    createdAt: new Date().toISOString(),
  },
  {
    id: 'g2', clientGameId: 'c2', gameType: 'spades', winnerId: 'smoke-2',
    playerIds: ['smoke-1', 'smoke-2'], startedAt: null,
    finishedAt: yesterdayNoon().toISOString(),
    roundCount: null, finalScores: null, createdAt: new Date().toISOString(),
  },
]

test.beforeEach(async ({ page }) => {
  await seedRoster(page)
  await signIn(page)
})

test('history lists recorded games, newest day first', async ({ page }) => {
  await page.route('**/games?**', route =>
    route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ success: true, data: GAMES }) }))

  await page.goto('/history')

  await expect(page.locator('.hist-row')).toHaveCount(2)
  await expect(page.locator('.hist-day-label').first()).toHaveText('Tonight')
  await expect(page.locator('.hist-day-label').nth(1)).toHaveText('Yesterday')

  // Names resolved off the roster, winner first — not raw ids.
  await expect(page.locator('.hist-row').first()).toContainText('Cricket')
  await expect(page.locator('.hist-row').first()).toContainText('Peezy beat Sam')
  await expect(page.locator('.hist-row').nth(1)).toContainText('Sam beat Peezy')
})

test('history says so when there are no games rather than looking broken', async ({ page }) => {
  await page.route('**/games?**', route =>
    route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ success: true, data: [] }) }))

  await page.goto('/history')

  await expect(page.getByText('No games recorded yet.')).toBeVisible()
  await expect(page.locator('.hist-row')).toHaveCount(0)
})

test('history offers a retry when the API fails', async ({ page }) => {
  await page.route('**/games?**', route =>
    route.fulfill({ status: 502, contentType: 'application/json', body: JSON.stringify({ success: false, error: 'upstream' }) }))

  await page.goto('/history')

  await expect(page.getByRole('button', { name: /Try again/ })).toBeVisible()
})

test('history is reachable from the main menu', async ({ page }) => {
  await page.goto('/')

  await page.getByRole('button', { name: /History/ }).click()

  await expect(page).toHaveURL(/\/history$/)
})
