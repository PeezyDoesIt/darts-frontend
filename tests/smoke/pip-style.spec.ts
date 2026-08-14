import { expect, test, type Page } from '@playwright/test'
import { pickBubble, seedRoster } from './helpers'

/**
 * The shape of a cricket mark.
 *
 * The pips had a colour and nothing else, while the dice sitting two fields below them in the
 * same form had a whole theme list — so "pip theme" was a setting that existed by name and
 * offered exactly one shape.
 */

async function seedWith(page: Page, extra: Record<string, unknown>) {
  await seedRoster(page)
  await page.addInitScript(seed => {
    const raw = localStorage.getItem('darts_players')
    if (!raw) return
    const players = JSON.parse(raw) as Array<Record<string, unknown>>
    players[0] = { ...players[0], ...seed }
    localStorage.setItem('darts_players', JSON.stringify(players))
  }, extra)
}

async function cricketBoard(page: Page) {
  await page.goto('/new-game')
  await page.getByRole('button', { name: 'Cricket', exact: true }).click()
  await page.getByRole('button', { name: /NEXT/ }).click()
  await pickBubble(page, 'Peezy')
  await pickBubble(page, 'Sam')
  await page.getByRole('button', { name: /START GAME/ }).click()
  await page.getByRole('button', { name: /^START$/ }).click()
  await expect(page).toHaveURL(/\/game$/)
}

test('the picker offers every style and saves the choice', async ({ page }) => {
  await seedRoster(page)
  await page.goto('/player-setup?edit=smoke-1')

  const field = page.locator('.field', { hasText: 'Cricket: Pip Style' })
  await expect(field).toBeVisible()
  await expect(field.locator('.pipstyle-btn')).toHaveCount(4)
  // Blocks is what every existing player already draws, so it is the one selected by default.
  await expect(field.locator('.pipstyle-btn.active .pipstyle-label')).toHaveText('Blocks')

  await field.locator('.pipstyle-btn', { hasText: 'Classic' }).click()
  await page.getByRole('button', { name: 'Save Changes' }).click()

  await expect.poll(() => page.evaluate(() => {
    const raw = localStorage.getItem('darts_players')
    return raw ? (JSON.parse(raw) as Array<{ pipStyle: string | null }>)[0]?.pipStyle : undefined
  })).toBe('marks')
})

test('the chosen style reaches the board', async ({ page }) => {
  await seedWith(page, { pipStyle: 'dots' })
  await cricketBoard(page)
  await expect(page.locator('.pips-wrap').first()).toHaveClass(/pips-dots/)
})

test('Classic scores the way a board does — slash, cross, ring', async ({ page }) => {
  await seedWith(page, { pipStyle: 'marks' })
  await cricketBoard(page)

  /*
   * Tapping the third mark directly fills all three.
   *
   * Not three taps on the tile: the tile's centre is a pip, so those land on the pip handler
   * — which sets the count to that mark and toggles it off when tapped again — rather than
   * incrementing the tile.
   */
  const tile = page.locator('.board-tile').first()
  await tile.locator('.pip').nth(2).click()

  const glyphs = await tile.locator('.pip').allInnerTexts()
  expect(glyphs.map(g => g.trim())).toEqual(['/', '✕', '⊗'])
})

test('the other styles do not draw the classic glyphs', async ({ page }) => {
  // They are painted in CSS. A glyph leaking into them would double up with the shape.
  await seedWith(page, { pipStyle: 'dots' })
  await cricketBoard(page)

  const tile = page.locator('.board-tile').first()
  await tile.click()
  expect((await tile.locator('.pip').allInnerTexts()).join('').trim()).toBe('')
})

test('a player who never chose a style still gets the blocks', async ({ page }) => {
  await seedWith(page, { pipStyle: null })
  await cricketBoard(page)
  await expect(page.locator('.pips-wrap').first()).toHaveClass(/pips-blocks/)
})
