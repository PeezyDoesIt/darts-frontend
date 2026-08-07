import { expect, test } from '@playwright/test'
import { seedRoster } from './helpers'

/**
 * The narrator settings, checked as a user meets them: at factory defaults, having touched
 * nothing.
 *
 * The personality grid used to be hidden whenever Clean Mode was on — and Clean Mode is on
 * by default — so out of the box none of the six styles could be reached at all, while the
 * panel on the home screen still named the one you were stuck with. The unit suite covers
 * what each personality says and could never have caught that, because the lines were fine.
 * Nothing could reach them.
 */

test.beforeEach(async ({ page }) => {
  await seedRoster(page)
})

const PERSONALITIES = ['Default', 'Hype', 'Savage', 'Anchor', 'Sarcastic', 'Smooth']

test('every narrator personality is reachable at factory defaults', async ({ page }) => {
  await page.goto('/')
  await page.locator('.narrator').click()

  const grid = page.locator('.personality-grid')
  await expect(grid).toBeVisible()

  for (const name of PERSONALITIES) {
    await expect(grid.locator('.per-label', { hasText: new RegExp(`^${name}$`) })).toBeVisible()
  }
})

test('choosing a personality sticks, and does not require turning Clean Mode off', async ({ page }) => {
  await page.goto('/')
  await page.locator('.narrator').click()

  // Clean Mode ships on. Picking a style used to mean turning it off first, which reads as
  // "to choose a narrator voice, allow profanity".
  const cleanToggle = page.locator('.toggle-row', { hasText: 'Clean Mode' }).locator('.toggle-track')
  await expect(cleanToggle).toHaveClass(/active/)

  await page.locator('.personality-btn', { hasText: 'Sarcastic' }).click()
  await expect(page.locator('.personality-btn.active .per-label')).toHaveText('Sarcastic')
  await expect(cleanToggle).toHaveClass(/active/)

  // Survives a reload — this is persisted, not just component state.
  await page.reload()
  await page.locator('.narrator').click()
  await expect(page.locator('.personality-btn.active .per-label')).toHaveText('Sarcastic')
})

test('the panel says which style is active and whether commentary is on', async ({ page }) => {
  await page.goto('/')

  // "Names only" also ships on, so the grid is shown but dimmed with an explanation rather
  // than hidden — the setting that makes personality inert should say so.
  await expect(page.locator('.narrator-scope')).toHaveText('Names only')

  await page.locator('.narrator').click()
  await expect(page.locator('.scope-hint')).toContainText('no effect')
  await expect(page.locator('.personality-grid')).toHaveClass(/grid-dim/)

  await page.locator('.scope-btn', { hasText: 'Full commentary' }).click()
  await expect(page.locator('.personality-grid')).not.toHaveClass(/grid-dim/)
})
