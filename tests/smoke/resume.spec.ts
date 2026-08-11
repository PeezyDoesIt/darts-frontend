import { expect, test } from '@playwright/test'
import { pickBubble, seedRoster } from './helpers'

/**
 * Opening the app lands on the main menu, always.
 *
 * A game in progress used to redirect the home page straight into darts or Left Right
 * Center, so on an iPad the app never showed its own menu. Getting back into a game is now
 * the home screen's job.
 */

// Games have to survive the reload, or every assertion here passes for the wrong reason.
test.beforeEach(async ({ page }) => {
  await seedRoster(page, { keepGames: true })
})

test('a game in progress no longer hijacks the home page', async ({ page }) => {
  await page.goto('/new-game')
  await page.getByRole('button', { name: /NEXT/ }).click()
  await pickBubble(page, 'Peezy')
  await pickBubble(page, 'Sam')
  await page.getByRole('button', { name: /START GAME/ }).click()
  await page.getByRole('button', { name: /^START$/ }).click()
  await expect(page).toHaveURL(/\/game$/)

  // The darts store debounces its save by 300ms. Navigating straight away leaves nothing on
  // disk, and then this test passes because there is no game to redirect — not because the
  // redirect is gone.
  await expect
    .poll(async () => await page.evaluate(
      () => JSON.parse(localStorage.getItem('darts_active_game') || 'null')?.status,
    ), { timeout: 10_000 })
    .toBe('playing')

  // Reopening the app — the case an iPad hits every launch.
  await page.goto('/')

  await expect(page).toHaveURL(/\/$/)
  await expect(page.locator('.hero-wordmark')).toBeVisible()
})

test('the menu offers the game back instead', async ({ page }) => {
  await page.goto('/lrc/setup')
  for (const name of ['Peezy', 'Sam', 'Jo']) await pickBubble(page, name)
  await page.getByRole('button', { name: /START GAME/ }).click()
  await expect(page).toHaveURL(/\/lrc$/)

  await page.goto('/')

  // Left Right Center had no resume card at all — only the redirect, which is now gone.
  const card = page.locator('.resume-card', { hasText: 'LEFT RIGHT CENTER' })
  await expect(card).toBeVisible()

  await card.getByRole('button', { name: /RESUME/ }).click()
  await expect(page).toHaveURL(/\/lrc$/)
})

test('a spades game is offered back too, which nothing ever did before', async ({ page }) => {
  await page.goto('/spades/setup')
  await pickBubble(page, 'Peezy')
  await page.getByRole('button', { name: /DEAL/ }).click()
  await expect(page).toHaveURL(/\/spades$/)

  await page.goto('/')

  const card = page.locator('.resume-card', { hasText: 'SPADES' })
  await expect(card).toBeVisible()
  await card.getByRole('button', { name: /RESUME/ }).click()
  await expect(page).toHaveURL(/\/spades$/)
})

test('the menu is clean when nothing is in progress', async ({ page }) => {
  await page.goto('/')

  await expect(page.locator('.resume-card')).toHaveCount(0)
})
