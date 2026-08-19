import { expect, test, type Page } from '@playwright/test'
import { pickBubble, seedRoster } from './helpers'

/**
 * Which layout the walk-up screen chooses.
 *
 * This file used to be about the avatar watermark's corner — it was anchored bottom-right and
 * flipped to bottom-left for one hand-written list of game types, so every game outside that
 * list showed the same player's avatar in the opposite corner. The watermark has since been
 * removed outright: the walk-up already names the player and shows their photo as the
 * backdrop, and the mark was a third copy of the same fact sitting over the top of it. Those
 * assertions went with it rather than being rewritten, because there is nothing left to
 * assert about a corner nothing occupies.
 *
 * What survives is the layout check, which guards a different and live fault. Cricket and 01
 * render two different layouts from a `v-if` / `v-if="!isCricket"` pair, and those two blocks
 * are separated by the floating cricket START button. When it was `v-else`, anything inserted
 * between the two silently re-paired it with the button instead — valid Vue that lint cannot
 * flag, and an 01 game quietly rendered cricket's layout. That happened twice. Anything added
 * to this template, including the photo layer, can do it again.
 */

async function walkUpFor(page: Page, gameType: string | null) {
  await page.goto('/new-game')
  if (gameType) await page.getByRole('button', { name: gameType, exact: true }).click()
  await page.getByRole('button', { name: /NEXT/ }).click()
  await pickBubble(page, 'Peezy')
  await pickBubble(page, 'Sam')
  await page.getByRole('button', { name: /START GAME/ }).click()
  await expect(page).toHaveURL(/\/between$/)
}

test.beforeEach(async ({ page }) => {
  await seedRoster(page)
})

test('an 01 walk-up uses the default layout', async ({ page }) => {
  await walkUpFor(page, '301')
  await expect(page.locator('.default-layout')).toBeVisible()
  await expect(page.locator('.cricket-layout')).toHaveCount(0)
})

/* The other half of the pair. Asserting only the 01 case would pass just as happily if BOTH
   games rendered the default layout, which is the same bug from the other side. */
test('a cricket walk-up uses the cricket layout', async ({ page }) => {
  await walkUpFor(page, 'Cricket')
  await expect(page.locator('.cricket-layout')).toBeVisible()
  await expect(page.locator('.default-layout')).toHaveCount(0)
})

/*
 * Speed Cricket is the case that was actually wrong. It is grouped with cricket at every other
 * decision in the app — the board's marks column, the wild-number row, the setup screen — but
 * this screen carried its own copy of the list and was written without it, so a Speed Cricket
 * walk-up quietly used the 01 games' layout. The list is one shared predicate now, and this is
 * what stops a second copy of it appearing.
 */
test('a speed cricket walk-up uses the cricket layout too', async ({ page }) => {
  await walkUpFor(page, 'Speed Cricket')
  await expect(page.locator('.cricket-layout')).toBeVisible()
  await expect(page.locator('.default-layout')).toHaveCount(0)
})

/* The watermark is gone, so nothing should be drawing it. */
test('no avatar watermark is left on the walk-up', async ({ page }) => {
  await walkUpFor(page, '301')
  await expect(page.locator('.between-avatar-bg')).toHaveCount(0)
})
