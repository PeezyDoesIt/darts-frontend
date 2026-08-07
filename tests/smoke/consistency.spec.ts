import { expect, test } from '@playwright/test'
import { SETUP_ROUTES, pickBubble, seedRoster } from './helpers'

/**
 * These guard the cross-screen conventions rather than any one game. They exist because the
 * screens had quietly drifted apart: three different player pickers, four fallback avatars,
 * and a quit button that lived somewhere different in Yahtzee than everywhere else. Nothing
 * in the unit suite could see any of it.
 */

test.beforeEach(async ({ page }) => {
  await seedRoster(page)
})

for (const { game, path } of SETUP_ROUTES) {
  test(`${game}: setup uses the shared player picker`, async ({ page }) => {
    await page.goto(path)

    const bubbles = page.locator('.player-bubble')
    // Four roster players plus the "New Player" bubble.
    await expect(bubbles).toHaveCount(5)

    // Every one is a real <button>, not a div with a click handler — that is what makes the
    // grid reachable by keyboard and announced to a screen reader.
    for (const tag of await bubbles.evaluateAll(els => els.map(e => e.tagName))) {
      expect(tag).toBe('BUTTON')
    }

    // The roster order is shared too, so the same people appear in the same order everywhere.
    await expect(page.locator('.bubble-name')).toHaveText(
      ['New Player', 'Peezy', 'Sam', 'Jo', 'Rex']
    )
  })
}

test('player picker is keyboard operable', async ({ page }) => {
  await page.goto('/spades/setup')

  const peezy = page.locator('.player-bubble:has(.bubble-name:text-is("Peezy"))')
  await peezy.focus()
  await expect(peezy).toBeFocused()

  await page.keyboard.press('Enter')

  // Picking moves the player out of the grid and into the seat list.
  await expect(peezy).toHaveCount(0)
  await expect(page.locator('.seat-name').first()).toHaveText('Peezy')
})

test('a player with a custom emoji keeps it across every game', async ({ page }) => {
  // The screens used to hardcode their own fallback — 🎲 on dice, 🂡 on Spades, "?" on LRC —
  // and Spades' pass screen printed 🂡 even when the player had chosen an emoji.
  await page.addInitScript(() => {
    const raw = localStorage.getItem('darts_players')
    if (!raw) return
    const players = JSON.parse(raw)
    players[0].avatarUrl = '🐺'
    localStorage.setItem('darts_players', JSON.stringify(players))
  })

  for (const { path } of SETUP_ROUTES) {
    await page.goto(path)
    await expect(page.locator('.player-bubble:has(.bubble-name:text-is("Peezy"))'))
      .toContainText('🐺')
  }
})

test('spades pass screen shows the player emoji, not a card back', async ({ page }) => {
  await page.addInitScript(() => {
    const raw = localStorage.getItem('darts_players')
    if (!raw) return
    const players = JSON.parse(raw)
    players[0].avatarUrl = '🐺'
    localStorage.setItem('darts_players', JSON.stringify(players))
  })

  await page.goto('/spades/setup')
  await pickBubble(page, 'Peezy')
  await pickBubble(page, 'Sam')
  await page.getByRole('button', { name: /DEAL/ }).click()

  const pass = page.locator('.pass-screen')
  await expect(pass).toBeVisible({ timeout: 15_000 })
  await expect(pass.locator('.pass-avatar')).not.toContainText('🂡')
})

test('yahtzee can be quit from the header like every other game', async ({ page }) => {
  await page.goto('/yahtzee/setup')
  await pickBubble(page, 'Peezy')
  await page.getByRole('button', { name: /START GAME/ }).click()
  await expect(page).toHaveURL(/\/yahtzee$/)

  // It used to be two taps deep inside the ⚙ panel, which is itself hidden on iPad portrait.
  await page.locator('.turn-header').getByRole('button', { name: /Quit/ }).click()
  await expect(page).toHaveURL(/\/$/)
})

for (const { game, path, quit } of [
  { game: 'farkle', path: '/dice/farkle', quit: /Quit/ },
  { game: 'ship captain crew', path: '/dice/scc', quit: /Quit/ },
  { game: 'pig', path: '/dice/pig', quit: /Quit/ },
] as const) {
  test(`${game}: quit is reachable from the game header`, async ({ page }) => {
    await page.goto(`${path}/setup`)
    await pickBubble(page, 'Peezy')
    await pickBubble(page, 'Sam')
    await page.getByRole('button', { name: /START GAME/ }).click()
    await expect(page).toHaveURL(new RegExp(`${path}$`))

    await expect(page.getByRole('button', { name: quit }).first()).toBeVisible()
  })
}
