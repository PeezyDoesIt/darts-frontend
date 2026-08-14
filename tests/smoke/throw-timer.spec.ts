import { expect, test, type Page } from '@playwright/test'
import { pickBubble, seedRoster } from './helpers'

/**
 * The throw clock looks the same in every game.
 *
 * The markup for it was written out identically in five places across four entry components,
 * but each carried its own container — so cricket drew a full-width bar whose red fill drains
 * away, while the 01 games and Around the Clock boxed the same thing into a fixed rounded
 * tile. An 80px "PAUSED" in a 90px tile is what that looked like.
 *
 * The look lives in ThrowTimer now. These assert the properties that diverged, on every board
 * that has a clock, rather than trusting that four copies stayed in step.
 */

async function board(page: Page, game: string) {
  await seedRoster(page)
  await page.goto('/new-game')
  await page.getByRole('button', { name: game, exact: true }).click()
  await page.getByRole('button', { name: /NEXT/ }).click()
  await pickBubble(page, 'Peezy')
  await pickBubble(page, 'Sam')
  await page.getByRole('button', { name: /START GAME/ }).click()
  await page.getByRole('button', { name: /^START$/ }).click()
  await expect(page).toHaveURL(/\/game$/)
  await expect(page.locator('.throw-timer')).toBeVisible()
}

for (const game of ['Cricket', 'Speed Cricket', '301', '1001', 'Around the Clock', 'Horse']) {
  test(`${game}: the clock is a bar, not a boxed tile`, async ({ page }) => {
    await board(page, game)

    const shape = await page.evaluate(() => {
      const el = document.querySelector('.throw-timer') as HTMLElement
      const box = el.getBoundingClientRect()
      const cs = getComputedStyle(el)
      const text = el.querySelector('.throw-timer-text') as HTMLElement | null
      return {
        radius: parseFloat(cs.borderTopLeftRadius),
        border: parseFloat(cs.borderTopWidth),
        // Transparent: the red fill is the bar, so a background of its own is the tile look.
        transparent: cs.backgroundColor === 'rgba(0, 0, 0, 0)' || cs.backgroundColor === 'transparent',
        w: box.width, h: box.height,
        textW: text?.getBoundingClientRect().width ?? 0,
        textH: text?.getBoundingClientRect().height ?? 0,
      }
    })

    expect(shape.radius, 'rounded like a tile').toBe(0)
    expect(shape.border, 'bordered like a tile').toBe(0)
    expect(shape.transparent, 'has a background of its own').toBe(true)

    // The label fits. This is the failure that was actually visible: a 90px tile holding an
    // 80px word, with the word spilling out of it.
    expect(shape.textW, `label wider than the clock on ${game}`).toBeLessThanOrEqual(shape.w + 1)
    expect(shape.textH, `label taller than the clock on ${game}`).toBeLessThanOrEqual(shape.h + 1)
  })
}
