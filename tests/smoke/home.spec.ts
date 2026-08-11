import { expect, test } from '@playwright/test'
import { seedRoster } from './helpers'

/**
 * The home screen is sized to one viewport and does not scroll, so anything pushed past the
 * bottom edge is not merely hard to find — it cannot be reached at all.
 *
 * Moving the hero above the top bar did exactly that: on a 1024px iPad the bar landed at
 * y=1029, taking the coin flip, cloud sync and narrator settings off the screen with it. The
 * suite was all green, because nothing asserted that a control was reachable.
 */

const VIEWPORTS = [
  { name: 'phone', width: 375, height: 812 },
  { name: 'ipad', width: 768, height: 1024 },
]

const ACTIONS = ['Coin flip', 'Sync', 'Narrator']

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

      // Fully inside the viewport, not just present in the DOM.
      expect(
        box!.y + box!.height,
        `${label} sits at y=${Math.round(box!.y)} on a ${vp.height}px screen that cannot scroll`,
      ).toBeLessThanOrEqual(vp.height)

      // Still a real touch target after being squeezed onto one row.
      expect(box!.height, `${label} is only ${Math.round(box!.height)}px tall`).toBeGreaterThanOrEqual(44)
    }
  })

  test(`the coin flip actually opens on ${vp.name}`, async ({ page }) => {
    await page.setViewportSize({ width: vp.width, height: vp.height })
    await page.goto('/')

    await page.locator('.hero-action', { hasText: 'Coin flip' }).click()

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
