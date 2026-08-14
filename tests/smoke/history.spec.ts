import { expect, test } from '@playwright/test'
import { seedRoster, signIn } from './helpers'

/**
 * The game history screen, with the API stubbed.
 *
 * game_results has been collecting a row for every completed game since it shipped and
 * nothing ever read one back. This is the read path, so it is worth proving it renders real
 * rows and not just its empty state — the empty state is what shows on any machine that
 * isn't signed in, which is every machine a test runs on.
 */

/**
 * A fixed evening, local time, shared by the seed data and by the page.
 *
 * `dayLabel` buckets by local calendar date, so anything that reads the real clock twice can
 * straddle a date boundary between the two reads. This file has now been bitten by that
 * twice: first by seeding `Date.now() - 26 * 3600_000` and calling it "yesterday" (an
 * elapsed-hours offset is not a calendar day, so it only read as Yesterday after 02:00);
 * then by seeding "tonight" as `new Date()` at module load and asserting the label after the
 * page rendered — which failed at 00:00:06 and passed on the retry three seconds later.
 *
 * Freezing the page's clock to the same instant the fixtures are built from removes the race
 * rather than making it rarer. No offset written here is a real-time offset any more.
 *
 * 20:00 is chosen for distance from both midnights; the date is arbitrary but fixed.
 */
const NOW = new Date('2026-03-10T20:00:00')

/** Noon the previous calendar day. Local, like `dayKey`, so this survives DST too. */
function yesterdayNoon(): Date {
  const d = new Date(NOW)
  d.setDate(d.getDate() - 1)
  d.setHours(12, 0, 0, 0)
  return d
}

const GAMES = [
  {
    id: 'g1', clientGameId: 'c1', gameType: 'cricket', winnerId: 'smoke-1',
    playerIds: ['smoke-1', 'smoke-2'], startedAt: null,
    finishedAt: NOW.toISOString(), roundCount: 7, finalScores: null,
    createdAt: NOW.toISOString(),
  },
  {
    id: 'g2', clientGameId: 'c2', gameType: 'spades', winnerId: 'smoke-2',
    playerIds: ['smoke-1', 'smoke-2'], startedAt: null,
    finishedAt: yesterdayNoon().toISOString(),
    roundCount: null, finalScores: null, createdAt: NOW.toISOString(),
  },
]

test.beforeEach(async ({ page }) => {
  // Before seedRoster: both add init scripts, and the clock has to be fixed before any page
  // script reads it.
  await page.clock.setFixedTime(NOW)
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
