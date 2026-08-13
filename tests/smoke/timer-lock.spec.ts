import { expect, test, type Page } from '@playwright/test'
import { pickBubble, seedRoster } from './helpers'

/**
 * Locking the timers from inside a game.
 *
 * The setting already existed and worked; what it lacked was any way to tell. It sat in the
 * scores panel under the label "Pause" with buttons "Allow" and "Lock" — which reads like it
 * stops the clock, when it governs whether tapping a timer pauses it. And a locked timer
 * absorbed the tap in silence, so the only feedback for "this is locked" was identical to
 * the feedback for "this is broken".
 *
 * These cover both halves: the lock still has to actually stop a pause, and it has to say
 * so. Cricket and Speed Cricket specifically, since that is where it gets used.
 */

async function startGame(page: Page, game: string) {
  await seedRoster(page)
  await page.goto('/new-game')
  await page.getByRole('button', { name: game, exact: true }).click()
  await page.getByRole('button', { name: /NEXT/ }).click()
  await pickBubble(page, 'Peezy')
  await pickBubble(page, 'Sam')
  await page.getByRole('button', { name: /START GAME/ }).click()
}

const pauseGroup = (page: Page) =>
  page.locator('.timer-control-group', { hasText: 'Timer Pause' })

async function setLock(page: Page, locked: boolean) {
  await page.getByRole('button', { name: 'SCORES' }).click()
  await expect(page.locator('.scores-overlay')).toBeVisible()
  await pauseGroup(page).getByRole('button', { name: locked ? 'Locked' : 'Allowed' }).click()
  await page.locator('.close-scores-btn').click()
  await expect(page.locator('.scores-overlay')).toHaveCount(0)
}

for (const game of ['Cricket', 'Speed Cricket']) {
  test(`${game}: the timer lock is reachable mid-game and stops a pause`, async ({ page }) => {
    await startGame(page, game)
    await page.getByRole('button', { name: /^START$/ }).click()
    await expect(page).toHaveURL(/\/game$/)

    const timer = page.locator('.submit-timer-text').first()
    // Pausing works to begin with, so the assertion below is about the lock rather than
    // about the timer being untappable in the first place.
    await page.locator('.submit-left').first().click()
    await expect(timer).toHaveText('PAUSED')
    await page.locator('.submit-left').first().click()
    await expect(timer).not.toHaveText('PAUSED')

    await setLock(page, true)
    await page.locator('.submit-left').first().click()
    // Says why nothing happened, rather than absorbing the tap silently.
    await expect(timer).toHaveText('LOCKED')
    // …and then goes back to counting, still unpaused.
    await expect(timer).toHaveText(/\d+s/, { timeout: 3000 })

    await setLock(page, false)
    await page.locator('.submit-left').first().click()
    await expect(timer).toHaveText('PAUSED')
  })

  test(`${game}: the walk-up timer honours the lock too`, async ({ page }) => {
    await startGame(page, game)
    // Lock it from the board — the only place the control lives — then hand the turn over
    // the way a player does, which is what brings the next walk-up round.
    await page.getByRole('button', { name: /^START$/ }).click()
    await expect(page).toHaveURL(/\/game$/)
    await setLock(page, true)

    await page.getByRole('button', { name: 'NEXT', exact: true }).click()
    await expect(page).toHaveURL(/\/between$/)

    const circle = page.locator('.circle-timer-svg').first()
    await expect(circle).toBeVisible()
    await circle.click()
    await expect(page.locator('.circle-timer-text')).toHaveText('🔒')
    await expect(page.locator('.circle-timer-text')).toHaveText(/^\d+$/, { timeout: 3000 })
  })
}

test('the control is named for what it governs', async ({ page }) => {
  // "Pause / Allow / Lock" was read as a control that stops the clock, which is the opposite
  // of what it does. If it gets renamed again, it should be to something equally explicit.
  await startGame(page, 'Cricket')
  await page.getByRole('button', { name: /^START$/ }).click()
  await page.getByRole('button', { name: 'SCORES' }).click()
  await expect(pauseGroup(page)).toBeVisible()
  await expect(pauseGroup(page).getByRole('button', { name: 'Allowed' })).toBeVisible()
  await expect(pauseGroup(page).getByRole('button', { name: 'Locked' })).toBeVisible()
})
