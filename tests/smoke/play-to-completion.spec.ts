import { expect, test, type Page } from '@playwright/test'
import { pickBubble, seedRoster } from './helpers'

/**
 * Playing on for the other places after somebody is out.
 *
 * The option existed for cricket only, and its stored fields were named for cricket, so
 * extending it to the 01 games was mostly a matter of the checkout taking a place instead of
 * ending the game. The part worth testing is the part that was easy to get wrong: the game
 * must not finish at the first check-out, because that is when the result gets recorded and
 * the winner's stats are written.
 *
 * Reaching a checkout by playing 301 properly would take four turns of arithmetic, so these
 * start a real game through the UI and then shorten what each player has left. Everything
 * after that — the submit, the finish order, the win screen — is the real thing.
 */

async function startOhOne(page: Page, { playToCompletion }: { playToCompletion: boolean }) {
  // keepGames: seedRoster otherwise clears the active game on every navigation, which would
  // wipe the game out from under the reload these tests rely on.
  await seedRoster(page, { keepGames: true })
  await page.goto('/new-game')
  await page.getByRole('button', { name: '301', exact: true }).click()

  // Advanced Options lives on the pick-a-game step, so the toggle has to be set before
  // moving on to the players.
  if (playToCompletion) {
    await page.getByRole('button', { name: /Advanced Options/ }).click()
    await page.locator('.toggle-row', { hasText: 'Play to Completion' }).click()
  }

  await page.getByRole('button', { name: /NEXT/ }).click()
  await pickBubble(page, 'Peezy')
  await pickBubble(page, 'Sam')
  await page.getByRole('button', { name: /START GAME/ }).click()
  await page.getByRole('button', { name: /^START$/ }).click()
  await expect(page).toHaveURL(/\/game$/)
}

/** Leaves every player one dart from home, so a checkout is a single key press. */
async function setEveryoneTo(page: Page, remaining: number) {
  // The store persists on a 300ms debounce, so the key is not there the instant the board is.
  await expect.poll(() => page.evaluate(() => localStorage.getItem('darts_active_game') !== null)).toBe(true)
  /*
   * Written until it sticks, rather than written once.
   *
   * The store persists on a debounce, so a write already in flight can land after this edit
   * and put the original score back — rare on a quiet machine, and it showed up as one
   * failure in a full parallel run. Re-reading proves the edit survived before anything
   * depends on it.
   */
  await expect.poll(async () => {
    return page.evaluate(left => {
      const raw = localStorage.getItem('darts_active_game')
      if (!raw) return null
      const game = JSON.parse(raw)
      for (const id of Object.keys(game.scores)) {
        if (game.scores[id].kind === 'ohOne') game.scores[id].data.remaining = left
      }
      localStorage.setItem('darts_active_game', JSON.stringify(game))

      const after = JSON.parse(localStorage.getItem('darts_active_game')!)
      const first = Object.values(after.scores)[0] as { data: { remaining: number } }
      return first.data.remaining
    }, remaining)
  }).toBe(remaining)
  await page.reload()
  await expect(page.locator('.remaining-val')).toHaveText(String(remaining))
}

/** Scores exactly `n` (single digit) and hands over. */
async function checkout(page: Page, n: number) {
  await page.locator('.key', { hasText: String(n) }).first().click()
  await page.getByRole('button', { name: 'NEXT', exact: true }).click()
}

test('301: checking out takes a place instead of ending the game', async ({ page }) => {
  await startOhOne(page, { playToCompletion: true })
  await setEveryoneTo(page, 5)

  // First player out — the game must keep going, because this is where the result would
  // otherwise be recorded and the other players would never get their turn.
  await checkout(page, 5)
  await expect(page).not.toHaveURL(/\/win$/)

  // Play passes to the other player rather than back to the one who is already out.
  await page.getByRole('button', { name: /^START$/ }).click()
  await expect(page).toHaveURL(/\/game$/)
  await expect(page.locator('.turn-name')).toHaveText('Sam')

  await checkout(page, 5)
  await expect(page).toHaveURL(/\/win$/)

  // Places, in the order they went out.
  await expect(page.locator('.final-place').first()).toHaveText('1st')
  await expect(page.locator('.final-row').first()).toContainText('Peezy')
  await expect(page.locator('.final-row').nth(1)).toContainText('Sam')
})

test('301: without the option, the first checkout still wins immediately', async ({ page }) => {
  // The default has to be untouched — this is the behaviour every existing game has.
  await startOhOne(page, { playToCompletion: false })
  await setEveryoneTo(page, 5)

  await checkout(page, 5)
  await expect(page).toHaveURL(/\/win$/)
})

test('the option is offered for 01 games, not only cricket', async ({ page }) => {
  await seedRoster(page)
  await page.goto('/new-game')
  await page.getByRole('button', { name: '301', exact: true }).click()
  await page.getByRole('button', { name: /Advanced Options/ }).click()

  const row = page.locator('.toggle-row', { hasText: 'Play to Completion' })
  await expect(row).toBeVisible()
  await expect(row).toContainText('checked out')
})

test('the option is not offered for games that have no notion of being out', async ({ page }) => {
  // Killer ends on its own terms; offering it there would be a promise the store never keeps.
  await seedRoster(page)
  await page.goto('/new-game')
  await page.getByRole('button', { name: 'Killer', exact: true }).click()
  await page.getByRole('button', { name: /Advanced Options/ }).click()

  await expect(page.locator('.toggle-row', { hasText: 'Play to Completion' })).toHaveCount(0)
})
