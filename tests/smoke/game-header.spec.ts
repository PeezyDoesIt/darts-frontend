import { expect, test, type Page } from '@playwright/test'
import { pickBubble, seedRoster } from './helpers'

/**
 * Whose turn it is has to be readable on the board.
 *
 * `.turn-name-wrap` is absolutely positioned across the whole header and centred, at z-index
 * 0 — below the round pill and the action buttons, which both paint opaque backgrounds. Given
 * room it reads as a centred name; on a phone the avatar, pill and cricket's four buttons
 * came to 364px of a 375px row, so the name was painted over from both sides and a twelve
 * character name showed as a single letter.
 *
 * The check is a real two-dimensional intersection. A one-dimensional one passes for the
 * wrong reason once the name moves to its own row, since it still shares an x-range with
 * everything above it.
 */

type Box = { left: number; right: number; top: number; bottom: number; width: number }

async function openBoard(page: Page, game: string) {
  await seedRoster(page)
  await page.addInitScript(() => {
    const raw = localStorage.getItem('darts_players')
    if (!raw) return
    const players = JSON.parse(raw) as Array<Record<string, unknown>>
    // Long enough to need the room, and the name from the reported screenshot.
    players[0].name = 'Peezy F Baby'
    localStorage.setItem('darts_players', JSON.stringify(players))
  })
  await page.goto('/new-game')
  await page.getByRole('button', { name: game, exact: true }).click()
  await page.getByRole('button', { name: /NEXT/ }).click()
  await pickBubble(page, 'Peezy F Baby')
  await pickBubble(page, 'Sam')
  await page.getByRole('button', { name: /START GAME/ }).click()
  await page.getByRole('button', { name: /^START$/ }).click()
  await expect(page).toHaveURL(/\/game$/)
  await expect(page.locator('.turn-name')).toBeVisible()
}

async function expectNameClear(page: Page) {
  const m = await page.evaluate(() => {
    const box = (s: string) => {
      const el = document.querySelector(s)
      if (!el) return null
      const b = el.getBoundingClientRect()
      return { left: b.left, right: b.right, top: b.top, bottom: b.bottom, width: b.width }
    }
    return {
      vw: innerWidth,
      name: box('.turn-name'),
      pill: box('.turn-round-pill'),
      right: box('.turn-right'),
      nameText: document.querySelector('.turn-name')?.textContent?.trim() ?? '',
    }
  })

  const intersects = (a: Box, b: Box) =>
    Math.min(a.right, b.right) - Math.max(a.left, b.left) > 1
    && Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top) > 1

  expect(m.name, 'no name in the header').not.toBeNull()
  expect(m.nameText).toBe('Peezy F Baby')
  expect(intersects(m.name!, m.pill!), 'name overlaps the round pill').toBe(false)
  expect(intersects(m.name!, m.right!), 'name overlaps the action buttons').toBe(false)
  // Both must also be on screen — the buttons used to run 38px past the right edge, hidden
  // by the header's `overflow: hidden` rather than fitting.
  expect(m.right!.right, 'action buttons run off screen').toBeLessThanOrEqual(m.vw + 1)
  expect(m.name!.right, 'name runs off screen').toBeLessThanOrEqual(m.vw + 1)
  // Enough width to actually read it rather than an ellipsis.
  expect(m.name!.width, 'name squeezed to nothing').toBeGreaterThan(100)
}

// Cricket is the tight case: it puts four buttons in the header rather than two.
for (const game of ['Cricket', '501']) {
  test(`${game}: the player name is not covered by the header controls`, async ({ page }) => {
    await openBoard(page, game)
    await expectNameClear(page)
  })
}
