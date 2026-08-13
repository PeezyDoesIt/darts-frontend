import { expect, test, type Page } from '@playwright/test'
import { pickBubble, seedRoster } from './helpers'

/**
 * The 01 keypad must fit the box flex gives it, at every screen size.
 *
 * The keys used to carry a `min-height`, which the grid honoured even when there was less
 * room than that — so the grid overflowed downward and painted its bottom rows over the
 * DOUBLE / TRIPLE row and the NEXT bar. On a landscape tablet that was 223px of box holding
 * 426px of keys. Nothing about it was visible to the existing suite: the boxes themselves
 * never overlapped, only their contents did, so every element was still "visible" and in the
 * right place. That is why this measures scrollHeight against clientHeight rather than
 * asserting on the elements' own rectangles.
 *
 * It regressed once during the fix, too: the phone rule set `min-height` again a few lines
 * below, which is exactly the mistake this guards.
 */

async function openBoard(page: Page) {
  await seedRoster(page)
  await page.goto('/new-game')
  await page.getByRole('button', { name: '501', exact: true }).click()
  await page.getByRole('button', { name: /NEXT/ }).click()
  await pickBubble(page, 'Peezy')
  await pickBubble(page, 'Sam')
  await page.getByRole('button', { name: /START GAME/ }).click()
  await page.getByRole('button', { name: /^START$/ }).click()
  await expect(page).toHaveURL(/\/game$/)
  await expect(page.locator('.numpad')).toBeVisible()
}

async function expectKeypadFits(page: Page) {
  const fit = await page.evaluate(() => {
    const pad = document.querySelector('.numpad')!
    const keys = [...document.querySelectorAll('.key')]
    const padBox = pad.getBoundingClientRect()
    const lowestKey = Math.max(...keys.map(k => k.getBoundingClientRect().bottom))
    return {
      scrollH: pad.scrollHeight,
      clientH: pad.clientHeight,
      // Sub-pixel row heights make the two differ by a fraction even when nothing overflows.
      keyOverhang: lowestKey - padBox.bottom,
      keyCount: keys.length,
    }
  })

  expect(fit.keyCount, 'ten digits and a backspace').toBe(11)
  expect(fit.scrollH, 'keypad content taller than its box').toBeLessThanOrEqual(fit.clientH + 1)
  expect(fit.keyOverhang, 'bottom key hangs below the keypad').toBeLessThanOrEqual(1)
}

test('keypad fits its box', async ({ page }) => {
  await openBoard(page)
  await expectKeypadFits(page)
})

test.describe('landscape tablet', () => {
  // The reported case: wide enough for the desktop layout, short enough to be squeezed.
  test.use({ viewport: { width: 1194, height: 834 } })
  test('keypad fits its box', async ({ page }) => {
    await openBoard(page)
    await expectKeypadFits(page)
  })
})

test.describe('a short desktop window', () => {
  // Shorter than any tablet — the keypad has to give up height rather than overflow.
  test.use({ viewport: { width: 1440, height: 700 } })
  test('keypad fits its box', async ({ page }) => {
    await openBoard(page)
    await expectKeypadFits(page)
  })
})
