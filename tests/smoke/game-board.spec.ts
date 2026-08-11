import { expect, test } from '@playwright/test'
import { pickBubble, seedRoster } from './helpers'

/**
 * The primary action on the darts board, driven the way a thumb drives it.
 *
 * The smoke suite already checks the board renders, which is not the same thing: a button
 * can paint correctly and still be unreachable, and a scripted element.click() will not
 * notice, because it bypasses pointer-events and anything overlapping the button. Playwright
 * clicks where the control actually is, on a touch viewport.
 */

test.beforeEach(async ({ page }) => {
  await seedRoster(page)
})

async function startCricket(page: import('@playwright/test').Page) {
  await page.goto('/new-game')
  await page.getByRole('button', { name: /NEXT/ }).click()
  await pickBubble(page, 'Peezy')
  await pickBubble(page, 'Sam')
  await page.getByRole('button', { name: /START GAME/ }).click()
  await page.getByRole('button', { name: /^START$/ }).click()
  await expect(page).toHaveURL(/\/game$/)
}

test('the NEXT button on the board submits the turn', async ({ page }) => {
  await startCricket(page)

  const next = page.locator('.submit-inline-btn')
  await expect(next).toBeVisible()
  await expect(next).toBeEnabled()

  await next.click()

  // Submitting hands over to the next player, via the walk-up screen.
  await expect(page).not.toHaveURL(/\/game$/, { timeout: 10_000 })
})

test('nothing is sitting on top of the NEXT button', async ({ page }) => {
  await startCricket(page)

  const next = page.locator('.submit-inline-btn')
  const box = await next.boundingBox()
  expect(box, 'NEXT has no layout box').not.toBeNull()

  // What actually receives a tap at the centre of the button.
  const hit = await page.evaluate(({ x, y, width, height }) => {
    const el = document.elementFromPoint(x + width / 2, y + height / 2)
    const btn = document.querySelector('.submit-inline-btn')
    return {
      isTheButton: !!el && !!btn && (el === btn || btn.contains(el)),
      actual: el ? `${el.tagName}.${String(el.className || '').split(' ')[0]}` : null,
      pointerEvents: btn ? getComputedStyle(btn).pointerEvents : null,
    }
  }, box!)

  expect(hit.pointerEvents, 'NEXT should accept pointer events').not.toBe('none')
  expect(hit.isTheButton, `a tap at the centre of NEXT lands on ${hit.actual}`).toBe(true)
})

/**
 * A hat-trick bonus sends the same player again in the same round, so the entry component's
 * :key — playerId + round — does not change and Vue reuses the instance. Its `submitted`
 * flag is a one-way latch with no reset, so NEXT comes back already disabled.
 *
 * The walk-up screen normally hides this: it is a route change, which unmounts everything
 * and gets a fresh component regardless of the key. With "Skip Walk-up Screen" on there is
 * no navigation — GamePage stays mounted — and the turn simply cannot be submitted.
 */
test('NEXT still works on a hat-trick bonus turn with the walk-up screen skipped', async ({ page }) => {
  await page.goto('/new-game')
  await page.locator('.toggle-row', { hasText: 'Skip Walk-up Screen' }).click()
  await page.locator('.advanced-toggle-btn').click()
  await page.locator('.toggle-row', { hasText: 'Hat Trick Bonus' }).click()
  await page.getByRole('button', { name: /NEXT/ }).click()
  await pickBubble(page, 'Peezy')
  await pickBubble(page, 'Sam')
  await page.getByRole('button', { name: /START GAME/ }).click()
  await expect(page).toHaveURL(/\/game$/)

  const state = async () =>
    await page.evaluate(() => JSON.parse(localStorage.getItem('darts_active_game') || 'null'))

  // Assert the preconditions rather than assume them. Without both settings on, this test
  // passes whether the bug is present or not, which is exactly how it first went green.
  // Assert the preconditions rather than assume them. Without both settings on this test
  // passes whether the bug is present or not, which is exactly how it first went green.
  // Polled because the game is persisted asynchronously — reading once races the write.
  await expect
    .poll(async () => (await state())?.skipWalkup, { timeout: 10_000 })
    .toBe(true)
  const before = await state()
  expect(before.cricketHatTrickBonus, 'hat trick bonus must be on').toBe(true)

  // Tapping the third pip sets all three marks at once. Tapping the tile three times is what
  // a script would do, but a real tap lands on a pip, which sets a value rather than adding.
  const twenty = page.locator('.board-tile').first()
  await twenty.locator('.pip').nth(2).click()
  await expect(twenty.locator('.hit-badge')).toHaveText('+3')

  const next = page.locator('.submit-inline-btn')
  await next.click()

  // The bonus is what makes this case special: same player, same round, no navigation.
  const after = await state()
  expect(after.currentPlayerIndex, 'bonus returns to the same player').toBe(before.currentPlayerIndex)
  expect(after.round, 'bonus stays in the same round').toBe(before.round)
  await expect(page).toHaveURL(/\/game$/)

  await expect(next, 'NEXT is dead on the bonus turn — the turn cannot be submitted').toBeEnabled()

  // And it has to actually submit, not merely look alive.
  await next.click()
  await expect
    .poll(async () => (await state()).currentPlayerIndex, { timeout: 10_000 })
    .not.toBe(before.currentPlayerIndex)
})
