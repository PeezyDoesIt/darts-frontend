import { expect, test } from '@playwright/test'
import { pickBubble, seedRoster } from './helpers'

/**
 * One test per game, each asserting the same contract: the setup screen accepts players,
 * the start button becomes usable, the game board renders, and the first real action works.
 *
 * That last step matters — a board that paints but whose primary control is dead is exactly
 * the failure the unit suite cannot see.
 */

test.beforeEach(async ({ page }) => {
  await seedRoster(page)
})

test('home lists every game', async ({ page }) => {
  await page.goto('/')
  for (const title of [
    'DARTS', 'YAHTZEE', 'LEFT RIGHT CENTER', 'FARKLE', 'SHIP CAPTAIN CREW', 'PIG', 'SPADES',
  ]) {
    await expect(page.locator('.mode-title', { hasText: title })).toBeVisible()
  }
})

test('darts: cricket reaches the board', async ({ page }) => {
  await page.goto('/new-game')
  await page.getByRole('button', { name: /NEXT/ }).click()
  await pickBubble(page, 'Peezy')
  await pickBubble(page, 'Sam')

  await page.getByRole('button', { name: /START GAME/ }).click()
  // The walk-up screen sits between setup and the board unless it is switched off.
  await page.getByRole('button', { name: /^START$/ }).click()

  await expect(page).toHaveURL(/\/game$/)
  await expect(page.getByText(/ROUND 1/).first()).toBeVisible()
})

test('yahtzee: board opens on round 1 and rolls', async ({ page }) => {
  await page.goto('/yahtzee/setup')
  await pickBubble(page, 'Peezy')
  await pickBubble(page, 'Sam')
  await page.getByRole('button', { name: /START GAME/ }).click()

  await expect(page).toHaveURL(/\/yahtzee$/)
  // Regression: yahtzeeBonusCount starts at 0 rather than null, so counting non-null
  // scorecard values opened the game on "RD 2/13".
  await expect(page.locator('.sc-round-label')).toHaveText('RD 1/13')

  await page.getByRole('button', { name: /^ROLL$/ }).click()
  await expect(page.locator('.sc-round-label')).toHaveText('RD 1/13')
})

test('left right center: board opens and rolls', async ({ page }) => {
  await page.goto('/lrc/setup')
  for (const name of ['Peezy', 'Sam', 'Jo']) await pickBubble(page, name)

  const start = page.getByRole('button', { name: /START GAME/ })
  await expect(start).toBeEnabled()
  await start.click()

  await expect(page).toHaveURL(/\/lrc$/)
  await expect(page.getByRole('button', { name: /^ROLL$/ })).toBeVisible()
})

for (const [game, path, heading] of [
  ['farkle', '/dice/farkle', 'FARKLE'],
  ['ship captain crew', '/dice/scc', 'SHIP CAPTAIN CREW'],
  ['pig', '/dice/pig', 'PIG'],
] as const) {
  test(`${game}: board opens and rolls`, async ({ page }) => {
    await page.goto(`${path}/setup`)
    await pickBubble(page, 'Peezy')
    await pickBubble(page, 'Sam')
    await page.getByRole('button', { name: /START GAME/ }).click()

    await expect(page).toHaveURL(new RegExp(`${path}$`))
    await expect(page.getByText(heading).first()).toBeVisible()
    await expect(page.getByRole('button', { name: /^Roll( \d+)?$/ })).toBeEnabled()
  })
}

test('spades: solo vs bots skips the pass-the-device screen', async ({ page }) => {
  await page.goto('/spades/setup')
  await pickBubble(page, 'Peezy')
  await page.getByRole('button', { name: /DEAL/ }).click()

  await expect(page).toHaveURL(/\/spades$/)

  // With one human there is nobody to hide the hand from. The privacy screen used to fire
  // on every bid and all 13 tricks, asking the only player to pass the device to themselves.
  await expect(page.locator('.bid-grid')).toBeVisible({ timeout: 15_000 })
  await expect(page.locator('.pass-screen')).toHaveCount(0)

  // Bidding and playing a card both have to work, not just render.
  await page.locator('.bid-btn', { hasText: /^3$/ }).click()
  const card = page.locator('.hand-row .card.playable').first()
  await expect(card).toBeEnabled({ timeout: 15_000 })
  await card.click()
  await expect(page.locator('.trick-card')).not.toHaveCount(0)
})

test('spades: a shared table still gets the pass-the-device screen', async ({ page }) => {
  await page.goto('/spades/setup')
  await pickBubble(page, 'Peezy')
  await pickBubble(page, 'Sam')
  await page.getByRole('button', { name: /DEAL/ }).click()

  await expect(page).toHaveURL(/\/spades$/)
  await expect(page.locator('.pass-screen')).toBeVisible({ timeout: 15_000 })
})
