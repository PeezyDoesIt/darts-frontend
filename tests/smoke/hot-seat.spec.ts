import { expect, test, type Page } from '@playwright/test'
import { pickBubble, seedRoster } from './helpers'

/**
 * Choosing who the narrator picks on, during a game.
 *
 * Deliberately not a player-profile setting: it is aimed at whoever is winning tonight, and
 * it should not follow somebody into next week's game. It lives on the game and dies with it.
 */

async function openScores(page: Page) {
  await seedRoster(page, { keepGames: true })
  await page.goto('/new-game')
  await page.getByRole('button', { name: 'Cricket', exact: true }).click()
  await page.getByRole('button', { name: /NEXT/ }).click()
  await pickBubble(page, 'Peezy')
  await pickBubble(page, 'Sam')
  await page.getByRole('button', { name: /START GAME/ }).click()
  await page.getByRole('button', { name: /^START$/ }).click()
  await expect(page).toHaveURL(/\/game$/)
  await page.getByRole('button', { name: 'SCORES' }).click()
  return page.locator('.timer-control-group', { hasText: 'Hot Seat' })
}

const target = (page: Page) => page.evaluate(() => {
  const raw = localStorage.getItem('darts_active_game')
  return raw ? (JSON.parse(raw) as { heckleTargetId: string | null }).heckleTargetId : undefined
})

test('nobody is in the hot seat until somebody is put there', async ({ page }) => {
  const group = await openScores(page)
  await expect(group.getByRole('button', { name: 'Nobody' })).toHaveClass(/active/)

  await group.getByRole('button', { name: 'Sam' }).click()
  await expect(group.getByRole('button', { name: 'Sam' })).toHaveClass(/active/)
  await expect.poll(() => target(page)).toBe('smoke-2')
})

test('the hot seat can be moved and switched off mid-game', async ({ page }) => {
  const group = await openScores(page)

  await group.getByRole('button', { name: 'Sam' }).click()
  await group.getByRole('button', { name: 'Peezy' }).click()
  await expect.poll(() => target(page)).toBe('smoke-1')

  await group.getByRole('button', { name: 'Nobody' }).click()
  await expect.poll(() => target(page)).toBeNull()
})

test('it survives a reload, like the rest of the game', async ({ page }) => {
  const group = await openScores(page)
  await group.getByRole('button', { name: 'Sam' }).click()
  await expect.poll(() => target(page)).toBe('smoke-2')

  await page.reload()
  await page.getByRole('button', { name: 'SCORES' }).click()
  await expect(page.locator('.timer-control-group', { hasText: 'Hot Seat' })
    .getByRole('button', { name: 'Sam' })).toHaveClass(/active/)
})

test('it says when the narrator is too quiet for it to be heard', async ({ page }) => {
  // Picking a target while the narrator is on Names only does nothing audible. Saying so
  // beats letting somebody wonder why the bit is not landing.
  const group = await openScores(page)
  await group.getByRole('button', { name: 'Sam' }).click()
  await expect(page.locator('.hot-seat-note')).toHaveCount(0)

  await page.locator('.timer-control-group', { hasText: 'Narrator' })
    .getByRole('button', { name: 'Names only' }).click()
  await expect(page.locator('.hot-seat-note')).toContainText('Commentary')
})
