import { expect, test } from '@playwright/test'
import { pickBubble, seedRoster } from './helpers'

/**
 * Blackjack, driven the way somebody plays it.
 *
 * It shipped with 49 unit tests and none of this: nothing asserted the tile navigated, the
 * table rendered on a phone, or a hand could be played end to end. The chip bug that unit
 * tests could not reach was found by hand in a browser, which is exactly the gap this file
 * closes — the seam between pure rules and a rendered table.
 *
 * Every test runs on both viewport projects, so the 375px phone is covered without any of
 * them setting a viewport of their own.
 */

/** Bets start at zero and step by five, so one press is the smallest legal bet. */
async function betAndDeal(page: import('@playwright/test').Page, presses = 2) {
  for (let i = 0; i < presses; i++) {
    await page.locator('.bet-btn', { hasText: '+' }).first().click()
  }
  await page.getByRole('button', { name: 'Deal', exact: true }).click()
}

test('blackjack: the home tile opens the table', async ({ page }) => {
  await seedRoster(page)
  await page.goto('/')
  // Below the fold on a phone, which is fine — it has to be reachable, not visible.
  const tile = page.locator('.mode', { hasText: 'BLACKJACK' })
  await expect(tile, 'the blackjack tile is missing from home').toHaveCount(1)
  await tile.click()
  await expect(page).toHaveURL(/\/blackjack\/setup$/)
})

test('blackjack: the deal button refuses to start without players', async ({ page }) => {
  await seedRoster(page)
  await page.goto('/blackjack/setup')
  const start = page.getByRole('button', { name: /Select players|Deal In/ })
  await expect(start).toBeDisabled()
  await expect(start).toHaveText(/Select players/)

  await pickBubble(page, 'Peezy')
  await expect(start).toBeEnabled()
  await expect(start).toHaveText(/Deal In/)
})

test('blackjack: a chosen stack is what everyone sits down with', async ({ page }) => {
  await seedRoster(page)
  await page.goto('/blackjack/setup')
  await pickBubble(page, 'Peezy')
  await pickBubble(page, 'Sam')
  await page.locator('.chip-opt', { hasText: '250' }).click()
  await page.getByRole('button', { name: 'Deal In' }).click()

  await expect(page).toHaveURL(/\/blackjack$/)
  await expect(page.locator('.seat').first()).toContainText('250 chips')
  await expect(page.locator('.seat').nth(1)).toContainText('250 chips')
})

test('blackjack: dealing takes the stake and puts cards on the table', async ({ page }) => {
  await seedRoster(page)
  await page.goto('/blackjack/setup')
  await pickBubble(page, 'Peezy')
  await page.getByRole('button', { name: 'Deal In' }).click()

  // Nothing to deal until somebody backs a hand.
  await expect(page.getByRole('button', { name: 'Place a bet' })).toBeDisabled()

  await betAndDeal(page)

  // Two cards each, and the stake is off the stack — 100 less a bet of 10.
  await expect(page.locator('.seat').first().locator('.hand button')).toHaveCount(2)
  await expect(page.locator('.seat').first()).toContainText('90 chips')
  await expect(page.locator('.dealer .hand button')).toHaveCount(2)
})

test('blackjack: the hole card stays down until the dealer plays', async ({ page }) => {
  await seedRoster(page)
  await page.goto('/blackjack/setup')
  await pickBubble(page, 'Peezy')
  await page.getByRole('button', { name: 'Deal In' }).click()
  await betAndDeal(page)

  // The whole tension of the game. Showing it early makes every decision trivial.
  const hole = page.locator('.dealer').getByRole('button', { name: 'Face-down card' })
  await expect(hole, 'the dealer hole card is face up during play').toHaveCount(1)
  // And no dealer total, which would leak the same information.
  await expect(page.locator('.dealer .seat-total')).toHaveCount(0)

  await page.getByRole('button', { name: 'Stand' }).click()

  await expect(page.locator('.dealer').getByRole('button', { name: 'Face-down card' })).toHaveCount(0)
  await expect(page.locator('.dealer .seat-total')).toHaveCount(1)
})

test('blackjack: a hand plays out and the round settles', async ({ page }) => {
  await seedRoster(page)
  await page.goto('/blackjack/setup')
  await pickBubble(page, 'Peezy')
  await page.getByRole('button', { name: 'Deal In' }).click()
  await betAndDeal(page)

  await page.getByRole('button', { name: 'Stand' }).click()

  // Standing with nobody left to act runs the dealer and settles in one step.
  await expect(page.locator('.seat').first().locator('.outcome')).toHaveCount(1)
  await expect(page.locator('.last-action')).toContainText(/Dealer (stands|busts) on \d+/)
  await expect(page.getByRole('button', { name: 'Next hand' })).toBeVisible()
})

test('blackjack: chips only ever move by the stake', async ({ page }) => {
  await seedRoster(page)
  await page.goto('/blackjack/setup')
  await pickBubble(page, 'Peezy')
  await page.getByRole('button', { name: 'Deal In' }).click()
  await betAndDeal(page)
  await page.getByRole('button', { name: 'Stand' }).click()

  // The bug this game shipped with paid winners twice and cost losers nothing, so the
  // assertion is on the arithmetic rather than merely that a number changed.
  const seat = page.locator('.seat').first()
  const outcome = (await seat.locator('.outcome').innerText()).trim()
  const chips = Number((await seat.innerText()).match(/(\d+) chips/)![1])

  const expected: Record<string, number> = {
    'WIN': 110, 'BLACKJACK · pays 3:2': 115, 'PUSH': 100, 'LOSE': 90, 'BUST': 90,
  }
  expect(expected[outcome], `unexpected outcome label "${outcome}"`).toBeDefined()
  expect(chips, `${outcome} left the stack at ${chips}`).toBe(expected[outcome])
})

test('blackjack: the next hand clears the table', async ({ page }) => {
  await seedRoster(page)
  await page.goto('/blackjack/setup')
  await pickBubble(page, 'Peezy')
  await page.getByRole('button', { name: 'Deal In' }).click()
  await betAndDeal(page)
  await page.getByRole('button', { name: 'Stand' }).click()
  await page.getByRole('button', { name: 'Next hand' }).click()

  await expect(page.locator('.bj-round')).toContainText('ROUND 2')
  await expect(page.locator('.dealer .hand button')).toHaveCount(0)
  await expect(page.locator('.seat').first().locator('.outcome')).toHaveCount(0)
  await expect(page.getByRole('button', { name: 'Place a bet' })).toBeDisabled()
})

test('blackjack: a game in progress survives a reload', async ({ page }) => {
  await seedRoster(page, { keepGames: true })
  await page.goto('/blackjack/setup')
  await pickBubble(page, 'Peezy')
  await page.getByRole('button', { name: 'Deal In' }).click()
  await betAndDeal(page)

  await page.reload()

  // The store reloads from localStorage rather than bouncing back to setup.
  await expect(page).toHaveURL(/\/blackjack$/)
  await expect(page.locator('.seat').first().locator('.hand button')).toHaveCount(2)
})

test('blackjack: opening the table with no game sends you to pick players', async ({ page }) => {
  await seedRoster(page)
  await page.goto('/blackjack')
  await expect(page).toHaveURL(/\/blackjack\/setup$/)
})

test('blackjack: the table never scrolls sideways', async ({ page }) => {
  await seedRoster(page)
  await page.goto('/blackjack/setup')
  await pickBubble(page, 'Peezy')
  await pickBubble(page, 'Sam')
  await pickBubble(page, 'Jo')
  await pickBubble(page, 'Rex')
  await page.getByRole('button', { name: 'Deal In' }).click()
  await betAndDeal(page)

  // Four seats of cards is the widest this screen gets.
  const overflow = await page.evaluate(() =>
    document.documentElement.scrollWidth - document.documentElement.clientWidth)
  expect(overflow, 'the blackjack table scrolls sideways').toBeLessThanOrEqual(0)
})
