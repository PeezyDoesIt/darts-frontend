import { expect, test, type Page } from '@playwright/test'
import { pickBubble, seedRoster } from './helpers'

/**
 * The walk-up watermark's corner.
 *
 * It used to be anchored bottom-right and flip to bottom-left for one hand-written list of
 * game types — dodging the floating START button those games draw in the right corner. Every
 * game outside that list (301, Speed Cricket, Around the Clock…) therefore showed the same
 * player's avatar in the opposite corner, which reads as a bug rather than a layout choice.
 *
 * These assert the corner and nothing else: a game where the watermark drifts back to the
 * right should fail here, but restyling the watermark should not.
 */

async function seedWithAvatars(page: Page) {
  await seedRoster(page)
  // Init scripts run in the order they were added, so this sees the roster the call above
  // wrote. The watermark renders nothing at all unless the player has an avatar.
  await page.addInitScript(() => {
    const raw = localStorage.getItem('darts_players')
    if (!raw) return
    const players = JSON.parse(raw) as Array<Record<string, unknown>>
    localStorage.setItem('darts_players', JSON.stringify(players.map(p => ({ ...p, avatarUrl: '🎯' }))))
  })
}

/** Leaves the browser on the walk-up screen, before START hands over to the board. */
async function walkUpFor(page: Page, gameType: string | null) {
  await page.goto('/new-game')
  if (gameType) await page.getByRole('button', { name: gameType, exact: true }).click()
  await page.getByRole('button', { name: /NEXT/ }).click()
  await pickBubble(page, 'Peezy')
  await pickBubble(page, 'Sam')
  await page.getByRole('button', { name: /START GAME/ }).click()
  await expect(page).toHaveURL(/\/between$/)
}

async function expectWatermarkBottomLeft(page: Page) {
  const mark = page.locator('.between-avatar-bg')
  await expect(mark).toBeVisible()

  /*
   * Measured against the screen container, not the viewport.
   *
   * The route transition slides this page in, so a viewport-relative box read too early is
   * offset by however far the slide has left to run — which made this pass or fail on
   * timing rather than on layout. Both boxes ride the same transform, so their relationship
   * holds at every frame of it.
   */
  const boxes = await page.evaluate(() => {
    const r = (s: string) => {
      const el = document.querySelector(s)
      return el ? el.getBoundingClientRect().toJSON() : null
    }
    return { mark: r('.between-avatar-bg'), screen: r('.between') }
  })
  expect(boxes.mark, 'no watermark box').not.toBeNull()
  expect(boxes.screen, 'no screen box').not.toBeNull()

  // Flush to the screen's left edge, with its weight in the left half. Centre rather than
  // right edge: the watermark is deliberately huge (35vmin) and on a 375px phone it spills
  // past the midpoint while still plainly being the left-hand corner.
  const markCentre = boxes.mark!.left + boxes.mark!.width / 2
  expect(boxes.mark!.left).toBeCloseTo(boxes.screen!.left, 0)
  expect(markCentre).toBeLessThan(boxes.screen!.left + boxes.screen!.width / 2)
  // …and sitting on the bottom rather than floating mid-screen.
  expect(boxes.mark!.bottom).toBeGreaterThan(boxes.screen!.top + boxes.screen!.height * 0.6)
}

test.beforeEach(async ({ page }) => {
  await seedWithAvatars(page)
})

test('cricket walk-up puts the avatar bottom-left', async ({ page }) => {
  await walkUpFor(page, 'Cricket')
  await expectWatermarkBottomLeft(page)
})

test('a 301 walk-up puts the avatar in the same corner as cricket', async ({ page }) => {
  // The regression case: this one was bottom-right.
  await walkUpFor(page, '301')
  await expectWatermarkBottomLeft(page)
})

test('speed cricket walk-up puts the avatar bottom-left', async ({ page }) => {
  await walkUpFor(page, 'Speed Cricket')
  await expectWatermarkBottomLeft(page)
})

/**
 * The same screen picks its whole layout from the same list the watermark used, and Speed
 * Cricket was missing from it — so it got the 01 games' stacked layout and inline button
 * rather than cricket's composition and floating START, despite being grouped with cricket at
 * every other decision in the app. That list is one shared predicate now.
 */
for (const game of ['Cricket', 'Speed Cricket']) {
  test(`${game} walk-up uses the cricket layout`, async ({ page }) => {
    await walkUpFor(page, game)
    await expect(page.locator('.cricket-layout')).toBeVisible()
    await expect(page.locator('.btn-cricket-start')).toBeVisible()
    await expect(page.locator('.default-layout')).toHaveCount(0)
  })
}

test('an 01 walk-up still uses the default layout', async ({ page }) => {
  await walkUpFor(page, '301')
  await expect(page.locator('.default-layout')).toBeVisible()
  await expect(page.locator('.cricket-layout')).toHaveCount(0)
})
