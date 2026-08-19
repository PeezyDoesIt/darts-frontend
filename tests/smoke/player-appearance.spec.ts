import { expect, test, type Page } from '@playwright/test'
import { seedRoster } from './helpers'

/**
 * Two player settings that the app stored, synced and rendered — but that nothing could set.
 *
 * `targetLabelColor` colours the big 20/19/18 labels and the round text on the cricket board.
 * Every reference to it on the setup screen was script-only plumbing: a ref, a reset, a load
 * and a save, with no control anywhere in between.
 *
 * The background settings were worse than missing. The throw screen honoured them — it set
 * background-size and background-position from them and drew a blurred copy behind a
 * contained image — but the setup screen wrote `null` into all three on *every* save, on both
 * the create and the update path. So they were not merely unsettable; opening a player and
 * pressing Save silently erased them.
 *
 * Placement has since moved from three buttons to a drag placer, so the assertions about
 * Centre / Top / Bottom are gone. The regression underneath them has not gone anywhere, and
 * that is what these still guard: whatever a player chose is still there after a save.
 *
 * A 1x1 gif is enough of a background: the controls only need an image to be present, and
 * this avoids putting an image pipeline in the way of the assertion.
 */

const PIXEL = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7'

async function seedPlayerWith(page: Page, extra: Record<string, unknown>) {
  await seedRoster(page)
  await page.addInitScript(seed => {
    const raw = localStorage.getItem('darts_players')
    if (!raw) return
    const players = JSON.parse(raw) as Array<Record<string, unknown>>
    players[0] = { ...players[0], ...seed }
    localStorage.setItem('darts_players', JSON.stringify(players))
  }, extra)
}

/** The stored roster row for the seeded player, read back out of localStorage. */
async function storedPlayer(page: Page) {
  return page.evaluate(() => {
    const raw = localStorage.getItem('darts_players')
    return raw ? (JSON.parse(raw) as Array<Record<string, unknown>>)[0] : null
  })
}

test('the background settings survive a save', async ({ page }) => {
  await seedPlayerWith(page, {
    playerBackground: PIXEL,
    playerBackgroundSize: 'contain',
    playerBackgroundPosition: 'top',
    playerBackgroundFill: 'blur',
  })
  await page.goto('/player-setup?edit=smoke-1')

  // They load into the controls…
  await expect(page.locator('.bgfit-btn.active', { hasText: 'Fit whole image' })).toBeVisible()
  await expect(page.locator('.bgfit-btn.active', { hasText: 'Blurred image' })).toBeVisible()

  // …and are still there afterwards. This is the regression: saving used to null all three.
  await page.getByRole('button', { name: 'Save Changes' }).click()
  await expect.poll(async () => (await storedPlayer(page))?.playerBackgroundSize).toBe('contain')
  const after = await storedPlayer(page)
  expect(after?.playerBackgroundFill).toBe('blur')
  /*
   * 'top' is what players saved before the placer existed. It is still valid CSS and still
   * means what it meant, so opening a player and saving without touching the photo must leave
   * it exactly as it was rather than rewriting it into the placer's own format — a save that
   * silently rewrites untouched values is how the original bug looked from the outside.
   */
  expect(after?.playerBackgroundPosition).toBe('top')
})

test('the background fit and fill can be changed', async ({ page }) => {
  await seedPlayerWith(page, { playerBackground: PIXEL })
  await page.goto('/player-setup?edit=smoke-1')

  // Fill only makes sense once the image is contained, so it is not offered before then.
  await expect(page.locator('.bgfit-btn', { hasText: 'Blurred image' })).toHaveCount(0)

  await page.locator('.bgfit-btn', { hasText: 'Fit whole image' }).click()
  await expect(page.locator('.bgfit-btn', { hasText: 'Blurred image' })).toBeVisible()
  await page.locator('.bgfit-btn', { hasText: 'Blurred image' }).click()

  await page.getByRole('button', { name: 'Save Changes' }).click()
  await expect.poll(async () => (await storedPlayer(page))?.playerBackgroundSize).toBe('contain')
  expect((await storedPlayer(page))?.playerBackgroundFill).toBe('blur')
})

/**
 * The placer itself, which replaced Centre / Top / Bottom.
 *
 * Those three stops rarely landed on the part of a photo anyone meant, and — the reason they
 * were replaced rather than fixed — the throw screen ignored them anyway, so nothing a player
 * picked was visible. This asserts the whole round trip: drag, save, read it back.
 */
test('dragging the placer stores where the photo was put', async ({ page }) => {
  await seedPlayerWith(page, { playerBackground: PIXEL })
  await page.goto('/player-setup?edit=smoke-1')

  const placer = page.locator('.bgplace').first()
  await expect(placer).toBeVisible()
  // Untouched, so it advertises what to do rather than claiming a position nobody chose.
  await expect(page.locator('.bgplace-hint')).toBeVisible()

  /*
   * `hover` rather than moving to a boundingBox read cold. The form is taller than a phone and
   * sits inside a clipping scroll container, so a box read before scrolling describes where
   * the placer WOULD be — the mouse then presses whatever is actually at those coordinates and
   * the drag never starts. hover scrolls it into view and lands on it, and the box is read
   * afterwards so the offsets below are measured from where it ended up.
   */
  await placer.scrollIntoViewIfNeeded()
  await placer.hover()
  const box = (await placer.boundingBox())!
  const cx = box.x + box.width / 2
  const cy = box.y + box.height / 2

  await page.mouse.down()
  // Push the photo left and up, which moves the kept spot right and down. Stepped, because
  // the drag reads pointermove events and one jump would report a single sample.
  await page.mouse.move(cx - box.width * 0.2, cy - box.height * 0.2, { steps: 8 })
  await page.mouse.up()

  // The hint clears on pointerdown, so it going means the drag was received at all — worth
  // asserting separately from the value, because "nothing happened" and "wrong number" are
  // different faults and the stored position cannot tell them apart.
  await expect(page.locator('.bgplace-hint'), 'the drag never reached the placer').toHaveCount(0)

  await page.getByRole('button', { name: 'Save Changes' }).click()
  await expect
    .poll(async () => (await storedPlayer(page))?.playerBackgroundPosition)
    .toMatch(/^\d+% \d+%$/)

  // Both axes moved away from centre, in the direction the photo was pushed.
  const stored = String((await storedPlayer(page))?.playerBackgroundPosition)
  const [x, y] = stored.split(' ').map(v => Number.parseInt(v, 10))
  expect(x, `x should have moved right of centre, got ${stored}`).toBeGreaterThan(50)
  expect(y, `y should have moved below centre, got ${stored}`).toBeGreaterThan(50)
})

test('the target label colour can be set and saved', async ({ page }) => {
  await seedPlayerWith(page, {})
  await page.goto('/player-setup?edit=smoke-1')

  const group = page.locator('.field', { hasText: 'Cricket: Target Numbers' })
  await expect(group).toBeVisible()
  await expect(group.locator('.color-dropdown-label')).toHaveText('Auto')

  await group.locator('.color-dropdown-btn').click()
  await group.locator('.color-swatch-sm[title="Cyan"]').click()
  await expect(group.locator('.color-dropdown-label')).toHaveText('Cyan')

  await page.getByRole('button', { name: 'Save Changes' }).click()
  await expect.poll(async () => (await storedPlayer(page))?.targetLabelColor).toBe('#00d4ff')
})

test('the target colour reaches the cricket board', async ({ page }) => {
  // The point of the setting: the labels on the throw screen, not just a stored string.
  await seedPlayerWith(page, { targetLabelColor: '#00d4ff' })
  await page.goto('/new-game')
  await page.getByRole('button', { name: 'Cricket', exact: true }).click()
  await page.getByRole('button', { name: /NEXT/ }).click()
  await page.locator('.player-bubble:has(.bubble-name:text-is("Peezy"))').click()
  await page.getByRole('button', { name: /START GAME/ }).click()
  await page.getByRole('button', { name: /^START$/ }).click()
  await expect(page).toHaveURL(/\/game$/)

  const colour = await page.locator('.target-label').first().evaluate(el => getComputedStyle(el).color)
  expect(colour).toBe('rgb(0, 212, 255)')
})
