import { expect, test, type Page } from '@playwright/test'
import { seedRoster } from './helpers'

/**
 * The coin flip modal, at the size it is actually used on.
 *
 * "↺ Reset Series" was arriving cut in half on an iPad: the button rendered 30px tall for
 * 52px of content and clipped the rest. It is a flex item in a column taller than itself, and
 * the automatic minimum size that normally stops a flex item shrinking below its content only
 * applies while `overflow` is `visible` — this button sets `overflow: hidden` for the ripple,
 * which opts it out. Every sibling kept its height, which is why only this one showed it.
 *
 * The assertion is scrollHeight against clientHeight, because the boxes themselves never
 * overlapped and nothing was missing from the DOM. Only the paint was wrong.
 */

test.use({ viewport: { width: 1000, height: 620 } })

async function openSeries(page: Page) {
  await seedRoster(page)
  await page.goto('/')
  await page.locator('.chip', { hasText: /coin/i }).first().click()
  await page.locator('.coin-mode-btn', { hasText: 'Best of 3' }).click()
  await page.locator('.coin').first().click()
  // The flip animation runs 2.2s, and the reset button only appears once a flip has landed.
  await expect(page.locator('.coin-reset-btn')).toBeVisible({ timeout: 8000 })
}

test('the reset button shows its whole label', async ({ page }) => {
  await openSeries(page)

  const fits = await page.locator('.coin-reset-btn').evaluate(el => ({
    text: el.textContent?.trim(),
    clientH: el.clientHeight,
    scrollH: el.scrollHeight,
    clientW: el.clientWidth,
    scrollW: el.scrollWidth,
  }))

  expect(fits.text).toBe('↺ Reset Series')
  expect(fits.scrollH, 'label is clipped vertically').toBeLessThanOrEqual(fits.clientH + 1)
  expect(fits.scrollW, 'label is clipped horizontally').toBeLessThanOrEqual(fits.clientW + 1)
})

test('nothing else in the modal is squeezed either', async ({ page }) => {
  // The modal scrolls, so no child needs to give up height — and one that does will clip its
  // own content exactly as the reset button did.
  await openSeries(page)

  /*
   * Polled rather than sampled once.
   *
   * The result slides in on a transition, so an element caught mid-animation is briefly
   * shorter than its own content and reads as squeezed — which failed roughly one run in six.
   * What matters is where it settles, not every frame on the way there.
   */
  await expect.poll(() => page.evaluate(() => {
    const modal = document.querySelector('.coin-modal')!
    return [...modal.children]
      .map(c => ({ cls: c.className.toString(), h: c.getBoundingClientRect().height, scrollH: (c as HTMLElement).scrollHeight }))
      .filter(c => c.scrollH > c.h + 1)
      .map(c => `${c.cls} (${Math.round(c.h)}px holding ${c.scrollH}px)`)
  })).toEqual([])
})

test('the reset button actually resets the series', async ({ page }) => {
  await openSeries(page)
  await page.locator('.coin-reset-btn').click()
  // Gone, because it only shows once a series has flips in it.
  await expect(page.locator('.coin-reset-btn')).toHaveCount(0)
  await expect(page.locator('.series-count').first()).toHaveText('0')
})

/**
 * Scrolling, on the screen size where the modal does not fit.
 *
 * On an iPad in landscape the modal stayed put and the page behind it moved instead. Every
 * other scroller in the app pairs `overflow-y: auto` with `-webkit-overflow-scrolling: touch`
 * and `overscroll-behavior: contain`; this one had neither, so a drag inside it chained
 * straight through to the page.
 */
test.describe('landscape, where the content is taller than the modal', () => {
  test.use({ viewport: { width: 1024, height: 768 } })

  test('the modal scrolls, and keeps the scroll to itself', async ({ page }) => {
    await seedRoster(page)
    await page.goto('/')
    await page.locator('.chip', { hasText: /coin/i }).first().click()
    await page.locator('.coin-mode-btn', { hasText: 'Best of 3' }).click()

    const modal = page.locator('.coin-modal')
    await expect.poll(() => modal.evaluate(el => el.scrollHeight > el.clientHeight)).toBe(true)

    await modal.hover()
    await page.mouse.wheel(0, 600)
    await expect.poll(() => modal.evaluate(el => el.scrollTop)).toBeGreaterThan(0)

    // The page behind it stayed where it was — that is the containment.
    expect(await page.evaluate(() => document.scrollingElement?.scrollTop ?? 0)).toBe(0)
  })

  test('the bottom of the modal can actually be reached', async ({ page }) => {
    // The reset button and the customise row live down there; if the scroll does not work
    // they are simply unreachable.
    await seedRoster(page)
    await page.goto('/')
    await page.locator('.chip', { hasText: /coin/i }).first().click()
    await page.locator('.coin-mode-btn', { hasText: 'Best of 3' }).click()

    const last = page.locator('.coin-customize')
    await last.scrollIntoViewIfNeeded()
    await expect(last).toBeInViewport()
  })
})
