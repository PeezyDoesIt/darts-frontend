import { expect, test } from '@playwright/test'
import { seedRoster } from './helpers'

/**
 * The controls in the hero sit above the fold and have to stay there: they are the ones you
 * reach for without hunting, and as unlabelled header glyphs they were three pixels on a
 * tablet nobody could identify.
 *
 * The page below them does scroll — `.home` is the scroll container, not the document — so
 * a tile further down is reachable rather than lost. That distinction is worth stating,
 * because measuring `document.scrollHeight` says the page cannot scroll and it is wrong.
 */

const VIEWPORTS = [
  { name: 'phone', width: 375, height: 812 },
  { name: 'ipad', width: 768, height: 1024 },
]

/** The hero chips, which must be visible without scrolling. Coin flip is its own tile now. */
const ACTIONS = ['Sync', 'Narrator']

test.beforeEach(async ({ page }) => {
  await seedRoster(page)
})

for (const vp of VIEWPORTS) {
  test(`every home control is reachable on ${vp.name}`, async ({ page }) => {
    await page.setViewportSize({ width: vp.width, height: vp.height })
    await page.goto('/')

    for (const label of ACTIONS) {
      const button = page.locator('.hero-action', { hasText: label })
      await expect(button, `${label} is missing`).toBeVisible()

      const box = await button.boundingBox()
      expect(box, `${label} has no layout box`).not.toBeNull()

      // Fully inside the viewport, not just present in the DOM — these are the controls
      // that must not need hunting for.
      expect(
        box!.y + box!.height,
        `${label} sits at y=${Math.round(box!.y)} on a ${vp.height}px screen`,
      ).toBeLessThanOrEqual(vp.height)

      // Still a real touch target after being squeezed onto one row.
      expect(box!.height, `${label} is only ${Math.round(box!.height)}px tall`).toBeGreaterThanOrEqual(44)
    }
  })

  test(`the coin flip is reachable and opens on ${vp.name}`, async ({ page }) => {
    await page.setViewportSize({ width: vp.width, height: vp.height })
    await page.goto('/')

    // Its own tile among the games rather than a glyph in the header. It sits below the
    // fold, which is fine — clicking it has to work, which is what this asserts.
    const tile = page.locator('.mode', { hasText: 'COIN FLIP' })
    await expect(tile, 'the coin flip tile is missing').toHaveCount(1)
    await tile.click()

    await expect(page.locator('.coin-overlay')).toBeVisible()
  })

  test(`the page never scrolls sideways on ${vp.name}`, async ({ page }) => {
    await page.setViewportSize({ width: vp.width, height: vp.height })
    await page.goto('/')

    const overflows = await page.evaluate(
      () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
    )
    expect(overflows).toBe(false)
  })
}
