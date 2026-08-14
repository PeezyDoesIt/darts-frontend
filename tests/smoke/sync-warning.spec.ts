import { expect, test, type Page } from '@playwright/test'
import { seedRoster, signIn } from './helpers'

/**
 * Saying so when the roster stops syncing.
 *
 * This reproduces a real incident. Three columns the app writes were missing from the live
 * table, and PostgREST rejects the *whole row* when one is — so every player save failed,
 * including names, colours and win counts, not just the new fields. The only trace was a
 * `console.warn`, so on screen it was indistinguishable from working, and it stayed that way
 * for days.
 *
 * The rejection below is the exact shape PostgREST returns for a missing column.
 */

const MISSING_COLUMN = {
  code: 'PGRST204',
  message: "Could not find the 'pip_color' column of 'players' in the schema cache",
}

/**
 * Serves the players table: reads succeed, writes do what the caller asks.
 *
 * Reads have to be stubbed too. Letting them through to the real service means the fabricated
 * session is rejected on its way past — "Expected 3 parts in JWT" — and that read failure
 * lands on top of the write failure being tested, which is a different message about a
 * different thing.
 */
async function serveWrites(page: Page, mode: 'reject' | 'accept') {
  await page.route('**/rest/v1/players*', async route => {
    if (route.request().method() === 'GET') {
      return route.fulfill({ status: 200, contentType: 'application/json', body: '[]' })
    }
    if (mode === 'accept') {
      return route.fulfill({ status: 200, contentType: 'application/json', body: '[]' })
    }
    await route.fulfill({ status: 400, contentType: 'application/json', body: JSON.stringify(MISSING_COLUMN) })
  })
}

/** The first roster name as actually stored, since the roster list is on the page we left. */
const savedName = (page: Page) => page.evaluate(() => {
  const raw = localStorage.getItem('darts_players')
  return raw ? (JSON.parse(raw) as Array<{ name: string }>)[0]?.name : undefined
})

async function openRoster(page: Page) {
  await seedRoster(page)
  await signIn(page)
  await page.goto('/player-setup?edit=smoke-1')
}

/**
 * Renames the edited player and saves.
 *
 * Saving navigates away — back to wherever you came from — so the warning has to be waiting
 * on the screen you land on rather than the one you left. That is why these assert after the
 * navigation, and why the component sits on the home screen as well as the setup one.
 */
async function saveEdit(page: Page, name: string) {
  await page.locator('.name-input').fill(name)
  await page.getByRole('button', { name: 'Save Changes' }).click()
  await expect(page).not.toHaveURL(/player-setup/)
}

test('a rejected save says the roster is not synced', async ({ page }) => {
  await serveWrites(page, 'reject')
  await openRoster(page)

  // Opening the app signed in already pushes any local players the cloud has not seen, so
  // the warning is up before anything is typed — which is exactly right, and is what would
  // have made the real outage obvious on the first launch after it started.
  await expect(page.locator('.sync-warn')).toBeVisible()

  await saveEdit(page, 'Peezy Two')

  const warn = page.locator('.sync-warn')
  await expect(warn).toBeVisible()
  await expect(warn).toContainText('Not synced')
  // The local copy is still saved — the warning is about the other devices, not this one.
  await expect.poll(() => savedName(page)).toBe('Peezy Two')
})

test('the warning is on the first screen, not somewhere down the page', async ({ page }) => {
  /*
   * `toBeVisible()` is not enough here and this is why: the home page's sections carry
   * negative `order` values, so the warning — first in the template, default order 0 —
   * sorted last and rendered 2189px down a 727px screen. Visible, in the CSS sense, and
   * completely useless. This asserts it is actually within the first screenful.
   */
  await serveWrites(page, 'reject')
  await seedRoster(page)
  await signIn(page)
  await page.goto('/')

  const warn = page.locator('.sync-warn')
  await expect(warn).toBeVisible()
  const box = await warn.boundingBox()
  const viewport = page.viewportSize()
  expect(box, 'no box').not.toBeNull()
  expect(box!.y, 'warning is below the fold').toBeLessThan(viewport!.height)
})

test('the sync dot stops claiming everything is fine', async ({ page }) => {
  // The dot means "signed in", and it is the one thing on the home screen that reads as sync
  // status. Left green it contradicts the warning directly above it.
  await serveWrites(page, 'reject')
  await seedRoster(page)
  await signIn(page)
  await page.goto('/')

  await expect(page.locator('.sync-warn')).toBeVisible()
  await expect(page.locator('.sync-dot')).toHaveClass(/sync-dot-bad/)
})

test('the reason is available without opening a console', async ({ page }) => {
  await serveWrites(page, 'reject')
  await openRoster(page)
  await saveEdit(page, 'Peezy Two')

  const warn = page.locator('.sync-warn')
  await expect(warn).toBeVisible()
  await expect(warn).not.toContainText('schema cache')

  await warn.getByRole('button', { name: 'Why?' }).click()
  await expect(warn).toContainText("Could not find the 'pip_color' column")
})

test('the warning clears once a write gets through', async ({ page }) => {
  await serveWrites(page, 'reject')
  await openRoster(page)
  await saveEdit(page, 'Peezy Two')
  await expect(page.locator('.sync-warn')).toBeVisible()

  // The database gets its columns back — the equivalent of running the migration.
  await page.unroute('**/rest/v1/players*')
  await serveWrites(page, 'accept')

  // Retry rather than another save: this is the path after fixing the database, and it is
  // the button's whole reason for existing. A full sync also pushes everything that failed
  // earlier, not just the most recent edit.
  await page.locator('.sync-warn').getByRole('button', { name: 'Retry' }).click()
  await expect(page.locator('.sync-warn')).toHaveCount(0)
})

test('nothing is said when writes are getting through', async ({ page }) => {
  // The warning has to stay out of the way when it has nothing to report, or it becomes
  // furniture that nobody reads.
  await serveWrites(page, 'accept')
  await openRoster(page)
  await saveEdit(page, 'Peezy Two')

  await expect.poll(() => savedName(page)).toBe('Peezy Two')
  await expect(page.locator('.sync-warn')).toHaveCount(0)
})

test('signed out, a save is local and says nothing', async ({ page }) => {
  // No session means no cloud write is attempted at all, so there is nothing to warn about.
  await seedRoster(page)
  await page.goto('/player-setup?edit=smoke-1')
  await saveEdit(page, 'Peezy Two')

  await expect.poll(() => savedName(page)).toBe('Peezy Two')
  await expect(page.locator('.sync-warn')).toHaveCount(0)
})
