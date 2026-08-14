import { expect, test } from '@playwright/test'
import { pickBubble, seedRoster } from './helpers'

/**
 * The narrator settings, checked as a user meets them: at factory defaults, having touched
 * nothing.
 *
 * This file used to be about the personality grid — eleven writing styles, one of which had
 * to be reachable at factory defaults. The styles are gone: a style changed which words were
 * picked and nothing about how they sounded, because the narrator never passed a rate or a
 * pitch to the speech engine. What is settable now is how much it says, and which of the
 * device's speech voices says it.
 */

test.beforeEach(async ({ page }) => {
  await seedRoster(page)
})

test('the narrator panel names the voice, since that is what there is to choose', async ({ page }) => {
  await page.goto('/')
  // Not a style name. The panel used to advertise a choice that changed nothing audible.
  await expect(page.locator('.narrator-scope')).toHaveText('Commentary')
  await expect(page.locator('.narrator-name')).not.toHaveText(/savage|hype|farley/i)
})

/*
 * Scoped to the FIRST `.voice-list`, because the bullseye-sound section below reuses both
 * that class and `.voice-btn`, and one of its buttons is always active — so anything less
 * specific matches two elements and fails on strict mode rather than on the behaviour.
 *
 * And waited for, because the browser reports its voices asynchronously: the list renders
 * with Default alone and is rebuilt when `voiceschanged` fires, so clicking immediately
 * races the rebuild.
 */
const voiceButtons = (page: import('@playwright/test').Page) =>
  page.locator('.voice-list').first().locator('.voice-btn')

/**
 * Opens the settings and waits for the voice list to stop growing.
 *
 * Skips outright where the browser has no speech voices, which is the case on the CI runner:
 * a Linux container ships no speech engine, so `getVoices()` returns an empty array and the
 * list is Default alone. There is nothing to choose between and nothing to assert. Asserting
 * anyway is how a test ends up encoding "my laptop" as the contract.
 */
async function openVoices(page: import('@playwright/test').Page) {
  await page.locator('.narrator').click()
  await expect(voiceButtons(page).first()).toBeVisible()
  // A moment for the asynchronous voiceschanged rebuild, before deciding there are none.
  await page.waitForTimeout(1200)
  const found = await voiceButtons(page).count()
  test.skip(found <= 1, 'this browser reports no speech voices')
  // Settled, not merely non-empty: the list is rebuilt as the browser reports more voices,
  // and the accent grouping reorders it as the groups fill. An index taken mid-rebuild
  // points at a different voice a moment later.
  await expect.poll(async () => {
    const a = await voiceButtons(page).count()
    await page.waitForTimeout(250)
    return (await voiceButtons(page).count()) === a
  }).toBe(true)
}

test('the voice list offers the voices this device actually has', async ({ page }) => {
  await page.goto('/')
  await openVoices(page)

  // It used to show Default plus whichever of two hard-coded names happened to exist. This
  // machine has three system voices; the list has to hold more than the one it curated.
  const labels = await voiceButtons(page).locator('.voice-btn-label').allInnerTexts()
  expect(labels.length, labels.join(', ')).toBeGreaterThan(2)
  expect(labels[0]).toBe('Default')
})

test('choosing a voice sticks across a reload', async ({ page }) => {
  await page.goto('/')
  await openVoices(page)

  // Chosen by name rather than position, so the assertion still points at the voice that was
  // clicked even if the list reorders.
  const labels = await voiceButtons(page).locator('.voice-btn-label').allInnerTexts()
  const wanted = labels.find(l => l !== 'Default')!
  const button = voiceButtons(page).filter({ hasText: wanted }).first()

  await button.click()
  await expect(button).toHaveClass(/active/)

  await page.reload()
  await openVoices(page)
  // `.voice-btn.active`, not `.active` under a button — the class is on the button itself.
  await expect(page.locator('.voice-list').first().locator('.voice-btn.active .voice-btn-label'))
    .toHaveText(wanted)
})

test('commentary is on by default, so the narrator is audible out of the box', async ({ page }) => {
  await page.goto('/')
  await expect(page.locator('.narrator-scope')).toHaveText('Commentary')
})

/**
 * Turning the narrator off.
 *
 * There was no way to. The setting was a boolean — full commentary or "Names only" — and
 * "Names only" did not do what it said either: it skipped the events flagged as commentary
 * and let everything else speak its whole line, so the walk-up still delivered a sentence on
 * every single turn.
 */
test('the narrator can be turned off, before a game and during one', async ({ page }) => {
  await page.goto('/')
  await page.locator('.narrator').click()

  await page.locator('.scope-btn', { hasText: 'Off' }).click()
  await expect(page.locator('.settings-muted').first()).toContainText('says nothing')

  // Persisted, not just component state — the complaint was that choosing it did nothing.
  await page.reload()
  await expect(page.locator('.narrator-scope')).toHaveText('Off')

  // And the same three choices are reachable mid-game, where the annoyance actually happens.
  await page.goto('/new-game')
  await page.getByRole('button', { name: 'Cricket', exact: true }).click()
  await page.getByRole('button', { name: /NEXT/ }).click()
  await pickBubble(page, 'Peezy')
  await pickBubble(page, 'Sam')
  await page.getByRole('button', { name: /START GAME/ }).click()
  await page.getByRole('button', { name: /^START$/ }).click()
  await page.getByRole('button', { name: 'SCORES' }).click()

  const group = page.locator('.timer-control-group', { hasText: 'Narrator' })
  await expect(group.getByRole('button', { name: 'Off' })).toHaveClass(/active/)
  await group.getByRole('button', { name: 'Names only' }).click()
  await expect(group.getByRole('button', { name: 'Names only' })).toHaveClass(/active/)
})
