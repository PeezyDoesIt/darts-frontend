import { expect, test } from '@playwright/test'
import { pickBubble, seedRoster } from './helpers'

/**
 * A computer Yahtzee player takes its whole turn on its own — rolls, decides what to keep,
 * rolls again, and scores. Nothing here touches the board on its behalf, so if the bot ever
 * stops driving itself these time out rather than quietly passing.
 */

test.beforeEach(async ({ page }) => {
  await seedRoster(page)
})

async function startWithBots(page: import('@playwright/test').Page, bots: number) {
  await page.goto('/yahtzee/setup')
  await pickBubble(page, 'Peezy')
  for (let i = 0; i < bots; i++) {
    await page.locator('.bot-btn', { hasText: '+' }).click()
  }
  await page.getByRole('button', { name: /START GAME/ }).click()
  await expect(page).toHaveURL(/\/yahtzee$/)
}

const state = async (page: import('@playwright/test').Page) =>
  await page.evaluate(() => JSON.parse(localStorage.getItem('yahtzee_active_game') || 'null'))

test('a computer seat joins the game and is marked as one', async ({ page }) => {
  await startWithBots(page, 2)

  const g = await state(page)
  expect(g.playerStates.map((p: { player: { name: string } }) => p.player.name))
    .toEqual(['Peezy', 'Ada', 'Bishop'])
  expect(g.playerStates.map((p: { isBot?: boolean }) => !!p.isBot)).toEqual([false, true, true])
})

test('computer players force the app to roll, since they cannot pick up real dice', async ({ page }) => {
  await page.goto('/yahtzee/setup')
  await pickBubble(page, 'Peezy')
  await page.locator('.dice-mode-btn', { hasText: 'Physical' }).click()
  await page.locator('.bot-btn', { hasText: '+' }).click()

  // Said out loud rather than switched silently underneath you.
  await expect(page.locator('.bot-warn')).toContainText('electronic')

  await page.getByRole('button', { name: /START GAME/ }).click()
  expect((await state(page)).diceMode).toBe('electronic')
})

test('the computer plays its own turn with no help', async ({ page }) => {
  test.setTimeout(90_000)
  await startWithBots(page, 1)

  // Hand the turn over: roll, then take whatever box is going. `.live` is a row this throw
  // can actually take; tapping it arms the row, and the second tap commits it.
  await page.getByRole('button', { name: /^ROLL/ }).click()
  await page.locator('.sc-row.live').first().click()
  await page.locator('.sc-row.pending').click()

  await expect.poll(async () => (await state(page)).currentPlayerIndex, { timeout: 15_000 }).toBe(1)

  // From here nothing touches the board. The computer has to fill a box by itself.
  await expect
    .poll(async () => {
      const g = await state(page)
      return Object.values(g.playerStates[1].scorecard).filter(v => v !== null && v !== 0).length
    }, { timeout: 45_000 })
    .toBeGreaterThan(0)

  // And hand the turn back when it is done.
  await expect.poll(async () => (await state(page)).currentPlayerIndex, { timeout: 30_000 }).toBe(0)
})
