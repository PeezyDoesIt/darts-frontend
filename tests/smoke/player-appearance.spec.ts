import { expect, test, type Page } from '@playwright/test'
import { seedRoster } from './helpers'

/**
 * Two player settings that the app stored, synced and rendered — but that nothing could set.
 *
 * `targetLabelColor` colours the big 20/19/18 labels and the round text on the cricket board.
 * Every reference to it on the setup screen was script-only plumbing: a ref, a reset, a load
 * and a save, with no control anywhere in between.
 *
 * The background fit trio is worse than missing. The throw screen honours all three — it sets
 * background-size and background-position from them and draws a blurred copy behind a
 * contained image — but the setup screen wrote `null` into all three on *every* save, on both
 * the create and the update path. So they were not merely unsettable; opening a player and
 * pressing Save silently erased them.
 *
 * A 1x1 gif is enough of a background: the controls only need an image to be present, and
 * this avoids putting an image pipeline in the way of the assertion.
 */

const PIXEL = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7'

async function seedPlayerWith(page: Page, extra: Record<string, unknown>) {
  await seedRoster(page)
  await page.addInitScript(seed => {
    const raw = localStorage.getItem('darts_players')
    if (!raw) return
    const players = JSON.parse(raw) as Array<Record<string, unknown>>
    players[0] = { ...players[0], ...seed }
    localStorage.setItem('darts_players', JSON.stringify(players))
  }, extra)
}

/** The stored roster row for the seeded player, read back out of localStorage. */
async function storedPlayer(page: Page) {
  return page.evaluate(() => {
    const raw = localStorage.getItem('darts_players')
    return raw ? (JSON.parse(raw) as Array<Record<string, unknown>>)[0] : null
  })
}

test('the background fit settings survive a save', async ({ page }) => {
  await seedPlayerWith(page, {
    playerBackground: PIXEL,
    playerBackgroundSize: 'contain',
    playerBackgroundPosition: 'top',
    playerBackgroundFill: 'blur',
  })
  await page.goto('/player-setup?edit=smoke-1')

  // They load into the controls…
  await expect(page.locator('.bgfit-btn.active', { hasText: 'Fit whole image' })).toBeVisible()
  await expect(page.locator('.bgfit-btn.active', { hasText: 'Top' })).toBeVisible()
  await expect(page.locator('.bgfit-btn.active', { hasText: 'Blurred image' })).toBeVisible()

  // …and are still there afterwards. This is the regression: saving used to null all three.
  await page.getByRole('button', { name: 'Save Changes' }).click()
  await expect.poll(async () => (await storedPlayer(page))?.playerBackgroundSize).toBe('contain')
  const after = await storedPlayer(page)
  expect(after?.playerBackgroundPosition).toBe('top')
  expect(after?.playerBackgroundFill).toBe('blur')
})

test('the background fit settings can be changed', async ({ page }) => {
  await seedPlayerWith(page, { playerBackground: PIXEL })
  await page.goto('/player-setup?edit=smoke-1')

  // Fill only makes sense once the image is contained, so it is not offered before then.
  await expect(page.locator('.bgfit-btn', { hasText: 'Blurred image' })).toHaveCount(0)

  await page.locator('.bgfit-btn', { hasText: 'Fit whole image' }).click()
  await expect(page.locator('.bgfit-btn', { hasText: 'Blurred image' })).toBeVisible()
  await page.locator('.bgfit-btn', { hasText: 'Bottom' }).click()
  await page.locator('.bgfit-btn', { hasText: 'Blurred image' }).click()

  await page.getByRole('button', { name: 'Save Changes' }).click()
  await expect.poll(async () => (await storedPlayer(page))?.playerBackgroundSize).toBe('contain')
  const after = await storedPlayer(page)
  expect(after?.playerBackgroundPosition).toBe('bottom')
  expect(after?.playerBackgroundFill).toBe('blur')
})

test('the target label colour can be set and saved', async ({ page }) => {
  await seedPlayerWith(page, {})
  await page.goto('/player-setup?edit=smoke-1')

  const group = page.locator('.field', { hasText: 'Cricket: Target Numbers' })
  await expect(group).toBeVisible()
  await expect(group.locator('.color-dropdown-label')).toHaveText('Auto')

  await group.locator('.color-dropdown-btn').click()
  await group.locator('.color-swatch-sm[title="Cyan"]').click()
  await expect(group.locator('.color-dropdown-label')).toHaveText('Cyan')

  await page.getByRole('button', { name: 'Save Changes' }).click()
  await expect.poll(async () => (await storedPlayer(page))?.targetLabelColor).toBe('#00d4ff')
})

test('the target colour reaches the cricket board', async ({ page }) => {
  // The point of the setting: the labels on the throw screen, not just a stored string.
  await seedPlayerWith(page, { targetLabelColor: '#00d4ff' })
  await page.goto('/new-game')
  await page.getByRole('button', { name: 'Cricket', exact: true }).click()
  await page.getByRole('button', { name: /NEXT/ }).click()
  await page.locator('.player-bubble:has(.bubble-name:text-is("Peezy"))').click()
  await page.getByRole('button', { name: /START GAME/ }).click()
  await page.getByRole('button', { name: /^START$/ }).click()
  await expect(page).toHaveURL(/\/game$/)

  const colour = await page.locator('.target-label').first().evaluate(el => getComputedStyle(el).color)
  expect(colour).toBe('rgb(0, 212, 255)')
})
