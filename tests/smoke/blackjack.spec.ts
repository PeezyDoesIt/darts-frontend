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

/**
 * Seeds a one-player table with a stacked shoe, so the deal is known rather than random.
 *
 * Any test that expects the player to *act* needs this. A natural blackjack settles the
 * round inside deal() — no hole card to hide, no Stand button to press — so roughly one
 * hand in twenty, an unseeded test asserts against a table that has already finished. That
 * is what showed up as a flaky run rather than as a clean failure.
 *
 * The deal takes one card per player then one for the dealer, twice, drawing with pop().
 * Filler sits underneath because the store reshuffles once the shoe falls to fifteen.
 */
async function seedTable(
  page: import('@playwright/test').Page,
  { player, dealer }: { player: [number, number]; dealer: number[] },
) {
  const card = (rank: number) => ({ kind: 'pip', suit: 'spades', rank })
  // Draw order: player, dealer, player, dealer — then anything the dealer hits for.
  const sequence = [player[0], dealer[0], player[1], dealer[1], ...dealer.slice(2)].map(card)
  const filler = Array.from({ length: 40 }, () => card(2))

  await page.addInitScript(({ shoe }) => {
    localStorage.setItem('blackjack_active_game', JSON.stringify({
      id: 'smoke-bj', startedAt: '2026-01-01T00:00:00.000Z',
      players: [{
        id: 'smoke-1', name: 'Peezy', avatarUrl: null, color: '#ff4d6d',
        chips: 100, bet: 10, hand: [], status: 'betting', outcome: null,
      }],
      dealer: [], shoe, currentPlayerIndex: 0, phase: 'betting', round: 1,
      lastAction: 'Place your bets',
    }))
  }, { shoe: [...filler, ...sequence.reverse()] })
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
  /*
   * A fixed shuffle.
   *
   * This test walks the real setup journey instead of seeding a table, so the store builds
   * its own shoe — and roughly one hand in twenty is a natural blackjack, which settles
   * inside deal() and pays out before anything renders. The chip assertion below was
   * therefore wrong about five percent of the time, which is exactly how it behaved: a CI
   * run that failed once and passed on retry. `buildShoe` takes its rng from Math.random, so
   * pinning that pins the deal without touching the journey being tested.
   */
  await page.addInitScript(() => { Math.random = () => 0.5 })
  await page.goto('/blackjack/setup')
  await pickBubble(page, 'Peezy')
  await page.getByRole('button', { name: 'Deal In' }).click()

  // Nothing to deal until somebody backs a hand.
  await expect(page.getByRole('button', { name: 'Place a bet' })).toBeDisabled()

  await betAndDeal(page)

  // Two cards to the player, and the stake off the stack — 100 less a bet of 10.
  await expect(page.locator('.seat').first().locator('.hand button')).toHaveCount(2)
  await expect(page.locator('.seat').first()).toContainText('90 chips')

  // A floor rather than exactly two, and deliberately so. This test deals a real shoe to
  // cover the setup journey, and roughly one hand in twenty is a natural blackjack — which
  // settles inside deal() and sends the dealer drawing to seventeen before anything renders.
  // The seeded tests below pin the exact two-card table; this one must not.
  expect(await page.locator('.dealer .hand button').count()).toBeGreaterThanOrEqual(2)
})

test('blackjack: the hole card stays down until the dealer plays', async ({ page }) => {
  await seedRoster(page)
  // 17 against 18 — the player has to act, so there is a hole card to keep hidden.
  await seedTable(page, { player: [10, 7], dealer: [10, 8] })
  await page.goto('/blackjack')
  await page.getByRole('button', { name: 'Deal', exact: true }).click()

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
  await seedTable(page, { player: [10, 7], dealer: [10, 8] })
  await page.goto('/blackjack')
  await page.getByRole('button', { name: 'Deal', exact: true }).click()

  await page.getByRole('button', { name: 'Stand' }).click()

  // Standing with nobody left to act runs the dealer and settles in one step.
  await expect(page.locator('.seat').first().locator('.outcome')).toHaveCount(1)
  await expect(page.locator('.last-action')).toContainText('Dealer stands on 18')
  await expect(page.getByRole('button', { name: 'Next hand' })).toBeVisible()
})

/**
 * The bug this game shipped with paid winners twice and cost losers nothing, so each case
 * asserts an exact stack rather than that a number moved — a test checking only for change
 * would have passed against it. Stacking the shoe is what lets the number be exact.
 */
for (const { label, player, dealer, outcome, chips } of [
  { label: 'a win returns the stake and pays it', player: [10, 9], dealer: [10, 8], outcome: 'WIN', chips: 110 },
  { label: 'a loss costs the stake and no more', player: [10, 7], dealer: [10, 8], outcome: 'LOSE', chips: 90 },
  { label: 'a push hands the stake back', player: [10, 8], dealer: [10, 8], outcome: 'PUSH', chips: 100 },
  { label: 'blackjack pays three to two', player: [14, 13], dealer: [10, 8], outcome: 'BLACKJACK · pays 3:2', chips: 115 },
] as const) {
  test(`blackjack: ${label}`, async ({ page }) => {
    await seedRoster(page)
    await seedTable(page, { player: [...player] as [number, number], dealer: [...dealer] })
    await page.goto('/blackjack')
    await page.getByRole('button', { name: 'Deal', exact: true }).click()

    // A natural blackjack settles inside the deal, so there is nothing to stand on.
    const stand = page.getByRole('button', { name: 'Stand' })
    if (await stand.count()) await stand.click()

    const seat = page.locator('.seat').first()
    await expect(seat.locator('.outcome')).toHaveText(outcome)
    await expect(seat).toContainText(`${chips} chips`)
  })
}

test('blackjack: the next hand clears the table', async ({ page }) => {
  await seedRoster(page)
  await seedTable(page, { player: [10, 7], dealer: [10, 8] })
  await page.goto('/blackjack')
  await page.getByRole('button', { name: 'Deal', exact: true }).click()
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
