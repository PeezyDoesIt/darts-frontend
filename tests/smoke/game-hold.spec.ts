import { expect, test, type Page } from '@playwright/test'
import { pickBubble, seedRoster } from './helpers'

/**
 * Stopping the game itself, as opposed to pausing one timer for one throw.
 *
 * Pausing never survived a turn: `startThrowTimer` clears it on every turn and the walk-up's
 * own pause is a fresh ref each time that screen mounts. So there was no way to stop play for
 * a few minutes without the clock eating somebody's turn.
 *
 * The half worth testing hardest is the game clock, because it is wall-clock — elapsed time is
 * `Date.now() - gameStartedAt`, not a decrementing counter. Skipping a tick would freeze the
 * *display* and then jump the moment it resumed. Releasing a hold pushes the anchor forward
 * instead, so these assert the reading afterwards rather than only that it stopped.
 */

async function startHeldGame(page: Page) {
  // keepGames, because these reload to prove the hold survives one.
  await seedRoster(page, { keepGames: true })
  await page.goto('/new-game')
  await page.getByRole('button', { name: 'Cricket', exact: true }).click()
  await page.getByRole('button', { name: /NEXT/ }).click()
  await pickBubble(page, 'Peezy')
  await pickBubble(page, 'Sam')
  await page.getByRole('button', { name: /START GAME/ }).click()
  await page.getByRole('button', { name: /^START$/ }).click()
  await expect(page).toHaveURL(/\/game$/)
}

async function hold(page: Page) {
  await page.getByRole('button', { name: 'SCORES' }).click()
  await page.locator('.timer-control-group', { hasText: 'Game Hold' }).getByRole('button', { name: 'Hold' }).click()
}

/**
 * `null` when running, a timestamp when held — and `undefined` when the game has not been
 * written yet, which is a different thing and must not be mistaken for either.
 *
 * The store persists on a 300ms debounce. An earlier version of this asserted
 * `.not.toBeNull()`, which `undefined` satisfies, so the poll returned on its first call and
 * the reload below happened against empty storage: the app came back up on "No active game"
 * and the failure looked like the hold not surviving rather than never having been saved.
 */
const heldSince = (page: Page) => page.evaluate(() => {
  const raw = localStorage.getItem('darts_active_game')
  return raw ? (JSON.parse(raw) as { heldSince: number | null }).heldSince : undefined
})

/** Waits for the debounced write, so a reload or a storage edit has something to act on. */
async function persisted(page: Page) {
  await expect.poll(() => page.evaluate(() => localStorage.getItem('darts_active_game') !== null)).toBe(true)
}

test('holding stops the throw timer and resuming starts it again', async ({ page }) => {
  await startHeldGame(page)
  const timer = page.locator('.submit-timer-text').first()
  await expect(timer).toHaveText(/\d+s/)

  await hold(page)
  await expect(page.locator('.hold-overlay')).toBeVisible()

  // Frozen: the same reading two seconds apart.
  const frozen = await timer.textContent()
  await page.waitForTimeout(2200)
  await expect(timer).toHaveText(frozen!)

  await page.getByRole('button', { name: 'Resume' }).click()
  await expect(page.locator('.hold-overlay')).toHaveCount(0)
  await expect(timer).not.toHaveText(frozen!)
})

test('a paused throw timer is cleared by the turn change — the reason holds exist', async ({ page }) => {
  await startHeldGame(page)

  const timer = page.locator('.submit-timer-text').first()
  await page.locator('.submit-left').first().click()
  await expect(timer).toHaveText('PAUSED')

  // Hand over. startThrowTimer sets throwPaused back to false for the incoming player, so the
  // pause is gone — there is no way to stop play for a few minutes with this alone.
  await page.getByRole('button', { name: 'NEXT', exact: true }).click()
  await expect(page).toHaveURL(/\/between$/)
  await page.getByRole('button', { name: /^START$/ }).click()
  await expect(page).toHaveURL(/\/game$/)

  await expect(timer).toHaveText(/\d+s/)
})

test('a hold is only lifted by Resume', async ({ page }) => {
  await startHeldGame(page)
  await hold(page)
  await expect(page.locator('.hold-overlay')).toBeVisible()

  /*
   * Nothing behind the overlay is reachable — that is what stops a stray tap entering darts
   * for whoever happens to be on turn.
   *
   * Asserted as a blocked click rather than `not.toBeVisible()`: the button is still visible
   * in the CSS sense, since visibility says nothing about what is painted on top of it. The
   * click fails because the overlay takes the pointer event, which is the actual guarantee.
   */
  await expect(page.getByRole('button', { name: 'NEXT', exact: true }).click({ timeout: 1500 }))
    .rejects.toThrow(/intercept|timeout/i)
  await expect.poll(() => heldSince(page)).toBeGreaterThan(0)

  await page.getByRole('button', { name: 'Resume' }).click()
  await expect(page.locator('.hold-overlay')).toHaveCount(0)
  await expect(page.getByRole('button', { name: 'NEXT', exact: true })).toBeVisible()
})

test('the walk-up countdown stops while held', async ({ page }) => {
  await startHeldGame(page)

  /*
   * The longest walk-up timer, because this test spends a second or two editing storage and
   * reloading before it can assert anything, and a walk-up countdown that reaches zero starts
   * the turn by itself — navigating away from the very screen under test. On a quiet machine
   * the default had room; in a full parallel run it did not, and this failed as a flake.
   */
  await page.getByRole('button', { name: 'SCORES' }).click()
  await page.locator('.timer-control-group', { hasText: 'Walk-up' }).first()
    .getByRole('button', { name: '120s' }).click()
  await page.locator('.close-scores-btn').click()

  await page.getByRole('button', { name: 'NEXT', exact: true }).click()
  await expect(page).toHaveURL(/\/between$/)

  const countdown = page.locator('.circle-timer-text')
  const before = await countdown.textContent()
  expect(Number(before)).toBeGreaterThan(0)

  /*
   * Held from this screen's own control.
   *
   * This used to write `heldSince` into storage and reload, which raced the store's own
   * debounced persist — under a full parallel run the pending write landed after the edit
   * and put the game back to running, so the overlay never appeared. It also faked a state
   * that at the time nothing could reach: holding was board-only, and the board's overlay
   * blocks play, so there was no route to this screen while held.
   */
  await page.getByRole('button', { name: /Hold/ }).click()

  await expect(page.locator('.hold-overlay')).toBeVisible()
  const frozen = await countdown.textContent()
  await page.waitForTimeout(2200)
  await expect(countdown).toHaveText(frozen!)
})

test('a hold survives a reload', async ({ page }) => {
  await startHeldGame(page)
  await hold(page)
  await persisted(page)
  await expect.poll(() => heldSince(page)).toBeGreaterThan(0)

  await page.reload()
  await expect(page.locator('.hold-overlay')).toBeVisible()

  await page.getByRole('button', { name: 'Resume' }).click()
  await expect(page.locator('.hold-overlay')).toHaveCount(0)
  await expect.poll(() => heldSince(page)).toBeNull()
})

test('the game clock does not lose the held time', async ({ page }) => {
  await startHeldGame(page)

  // Give it a game clock, then hold it for a measurable stretch.
  await page.getByRole('button', { name: 'SCORES' }).click()
  await page.locator('.timer-control-group', { hasText: 'Game Timer' }).getByRole('button', { name: '30m' }).click()
  await page.locator('.timer-control-group', { hasText: 'Game Hold' }).getByRole('button', { name: 'Hold' }).click()

  await persisted(page)
  const startedBefore = await page.evaluate(() => {
    const raw = localStorage.getItem('darts_active_game')!
    return (JSON.parse(raw) as { gameStartedAt: number }).gameStartedAt
  })

  await page.waitForTimeout(2500)
  await page.getByRole('button', { name: 'Resume' }).click()

  // The anchor moved forward by roughly the length of the hold, so the clock picks up where
  // it left off instead of jumping. Generous bounds: this is wall-clock in a browser.
  await expect.poll(async () => {
    const after = await page.evaluate(() => {
      const raw = localStorage.getItem('darts_active_game')!
      return (JSON.parse(raw) as { gameStartedAt: number }).gameStartedAt
    })
    return after - startedBefore
  }).toBeGreaterThan(1500)
})
