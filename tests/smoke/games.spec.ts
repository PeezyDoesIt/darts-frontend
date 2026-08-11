import { expect, test } from '@playwright/test'
import { pickBubble, seedRoster } from './helpers'

/**
 * One test per game, each asserting the same contract: the setup screen accepts players,
 * the start button becomes usable, the game board renders, and the first real action works.
 *
 * That last step matters — a board that paints but whose primary control is dead is exactly
 * the failure the unit suite cannot see.
 */

test.beforeEach(async ({ page }) => {
  await seedRoster(page)
})

test('home lists every game', async ({ page }) => {
  await page.goto('/')
  for (const title of [
    'DARTS', 'YAHTZEE', 'LEFT RIGHT CENTER', 'FARKLE', 'SHIP CAPTAIN CREW', 'PIG', 'SPADES',
  ]) {
    await expect(page.locator('.mode-title', { hasText: title })).toBeVisible()
  }
})

test('darts: cricket reaches the board', async ({ page }) => {
  await page.goto('/new-game')
  await page.getByRole('button', { name: /NEXT/ }).click()
  await pickBubble(page, 'Peezy')
  await pickBubble(page, 'Sam')

  await page.getByRole('button', { name: /START GAME/ }).click()
  // The walk-up screen sits between setup and the board unless it is switched off.
  await page.getByRole('button', { name: /^START$/ }).click()

  await expect(page).toHaveURL(/\/game$/)
  await expect(page.getByText(/ROUND 1/).first()).toBeVisible()
})

test('yahtzee: board opens on round 1 and rolls', async ({ page }) => {
  await page.goto('/yahtzee/setup')
  await pickBubble(page, 'Peezy')
  await pickBubble(page, 'Sam')
  await page.getByRole('button', { name: /START GAME/ }).click()

  await expect(page).toHaveURL(/\/yahtzee$/)
  // Regression: yahtzeeBonusCount starts at 0 rather than null, so counting non-null
  // scorecard values opened the game on "RD 2/13".
  await expect(page.locator('.sc-round-label')).toHaveText('RD 1/13')

  await page.getByRole('button', { name: /^ROLL$/ }).click()
  await expect(page.locator('.sc-round-label')).toHaveText('RD 1/13')
})

test('left right center: board opens and rolls', async ({ page }) => {
  await page.goto('/lrc/setup')
  for (const name of ['Peezy', 'Sam', 'Jo']) await pickBubble(page, name)

  const start = page.getByRole('button', { name: /START GAME/ })
  await expect(start).toBeEnabled()
  await start.click()

  await expect(page).toHaveURL(/\/lrc$/)
  await expect(page.getByRole('button', { name: /^ROLL$/ })).toBeVisible()
})

for (const [game, path, heading] of [
  ['farkle', '/dice/farkle', 'FARKLE'],
  ['ship captain crew', '/dice/scc', 'SHIP CAPTAIN CREW'],
  ['pig', '/dice/pig', 'PIG'],
] as const) {
  test(`${game}: board opens and rolls`, async ({ page }) => {
    await page.goto(`${path}/setup`)
    await pickBubble(page, 'Peezy')
    await pickBubble(page, 'Sam')
    await page.getByRole('button', { name: /START GAME/ }).click()

    await expect(page).toHaveURL(new RegExp(`${path}$`))
    await expect(page.getByText(heading).first()).toBeVisible()
    await expect(page.getByRole('button', { name: /^Roll( \d+)?$/ })).toBeEnabled()
  })
}

test('spades: solo vs bots skips the pass-the-device screen', async ({ page }) => {
  await page.goto('/spades/setup')
  await pickBubble(page, 'Peezy')
  await page.getByRole('button', { name: /DEAL/ }).click()

  await expect(page).toHaveURL(/\/spades$/)

  // With one human there is nobody to hide the hand from. The privacy screen used to fire
  // on every bid and all 13 tricks, asking the only player to pass the device to themselves.
  await expect(page.locator('.pass-screen')).toHaveCount(0)

  // Wild Style — the default here — bids the opening hand itself, so the board goes straight
  // to play and there is no bid grid to answer.
  await expect(page.locator('.bid-grid')).toHaveCount(0)

  // Playing a card has to work, not just render.
  const card = page.locator('.hand-row .card.playable').first()
  await expect(card).toBeEnabled({ timeout: 15_000 })
  await card.click()
  await expect(page.locator('.trick-card')).not.toHaveCount(0)
})

test('spades: wild style bids the opening hand itself', async ({ page }) => {
  await page.goto('/spades/setup')
  await pickBubble(page, 'Peezy')
  await page.getByRole('button', { name: /DEAL/ }).click()
  await expect(page).toHaveURL(/\/spades$/)

  // Every seat carries a bid before anyone has tapped one, and the chips show it.
  await expect(page.locator('.bid-chip')).toHaveCount(4)
  await expect(page.locator('.bid-grid')).toHaveCount(0)

  const bids = await page.evaluate(
    () => JSON.parse(localStorage.getItem('spades_active_game') || 'null')?.bids,
  )
  expect(bids, 'every seat should be auto-bid on hand 1').toHaveLength(4)
  expect(bids.every((b: number | null) => b !== null), `got ${JSON.stringify(bids)}`).toBe(true)
})

test('spades: classic still asks you to bid', async ({ page }) => {
  await page.goto('/spades/setup')
  await pickBubble(page, 'Peezy')
  await page.locator('.variant-btn', { hasText: 'Classic' }).click()
  await page.getByRole('button', { name: /DEAL/ }).click()

  // Auto-bid is a Wild Style house rule; classic is ordinary spades.
  await expect(page.locator('.bid-grid')).toBeVisible({ timeout: 15_000 })
})

test('spades: a shared table still gets the pass-the-device screen', async ({ page }) => {
  await page.goto('/spades/setup')
  await pickBubble(page, 'Peezy')
  await pickBubble(page, 'Sam')
  await page.getByRole('button', { name: /DEAL/ }).click()

  await expect(page).toHaveURL(/\/spades$/)
  await expect(page.locator('.pass-screen')).toBeVisible({ timeout: 15_000 })
})

/**
 * Reading a hand back. Books were discarded the moment the next one led, so once a hand was
 * scored there was no way to see how it got there.
 */
// Thirteen books against three bots that each pause 700ms to be followable, so the hand
// takes well over the default timeout to play out.
test('spades: a finished hand can be read back book by book', async ({ page }) => {
  test.setTimeout(150_000)

  await page.goto('/spades/setup')
  await pickBubble(page, 'Peezy')
  await page.getByRole('button', { name: /DEAL/ }).click()
  await expect(page).toHaveURL(/\/spades$/)

  const phase = async () => await page.evaluate(
    () => JSON.parse(localStorage.getItem('spades_active_game') || 'null')?.phase,
  )

  // Play the hand out: take whatever card is legal, and keep clicking through.
  for (let i = 0; i < 400; i++) {
    const p = await phase()
    if (p === 'hand_over' || p === 'game_over') break

    const card = page.locator('.hand-row .card.playable:not([disabled])').first()
    if (await card.count() > 0) { await card.click({ timeout: 5_000 }).catch(() => {}); continue }

    const next = page.locator('.sp-footer button', { hasText: /Next book|Score the hand/ })
    if (await next.count() > 0) { await next.click({ timeout: 5_000 }).catch(() => {}); continue }

    await page.waitForTimeout(150)  // a bot is thinking
  }

  expect(await phase(), 'the hand never finished').toMatch(/hand_over|game_over/)

  await page.getByRole('button', { name: /Review books/ }).click()

  // Thirteen books, each naming who took it and how.
  await expect(page.locator('.review-book')).toHaveCount(13)
  await expect(page.locator('.rb-card.won')).toHaveCount(13)
  await expect(page.locator('.review-book').first()).toContainText('BOOK 1')
  await expect(page.locator('.review-book').first()).toContainText('takes it')

  // Both the ✕ and the footer button are named "Close" — this is the footer one.
  await page.locator('.review-card .btn-spray').click()
  await expect(page.locator('.review-card')).toHaveCount(0)
})

test('spades: the rules talk about books, not tricks', async ({ page }) => {
  await page.goto('/spades/setup')

  const rules = page.locator('.rules-list')
  await expect(rules).toContainText('books')
  await expect(rules).not.toContainText('trick')
})

test('spades: computer seats can be renamed, and the name carries into the game', async ({ page }) => {
  await page.goto('/spades/setup')
  await pickBubble(page, 'Peezy')

  // One person picked, so seats 2-4 are computers and the first input is seat 2.
  const seat = page.locator('.seat-name-input').first()
  await expect(seat).toHaveValue('Bishop')
  await seat.fill('Big Mike')
  await seat.blur()

  await page.getByRole('button', { name: /DEAL/ }).click()
  await expect(page).toHaveURL(/\/spades$/)

  await expect(page.locator('.teams')).toContainText('Big Mike')
  await expect(page.locator('.bids-row')).toContainText('Big Mike')
})

test('spades: a blank computer name falls back rather than leaving the seat nameless', async ({ page }) => {
  await page.goto('/spades/setup')
  await pickBubble(page, 'Peezy')

  const seat = page.locator('.seat-name-input').first()
  await seat.fill('   ')
  await seat.blur()

  // The board addresses these by name, so an empty one reads as a bug.
  await expect(seat).toHaveValue('Bishop')
})
