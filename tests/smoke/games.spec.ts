import { expect, test, type Locator, type Page } from '@playwright/test'
import { pickBubble, seedRoster } from './helpers'

/**
 * Play the first legal card in the hand, on either tap contract: one tap from 768 up,
 * lift-then-play below it.
 *
 * The tap is aimed at the card's left edge because the hand is a fan — each card shows only a
 * sliver, about 24px on a phone, and the rest is under its neighbour, so the default centre
 * point lands on the wrong card. Which contract is in force is a property of the viewport at
 * the moment of the tap, not of the project, so a test that resized mid-run would change its
 * own answer; reading the card back rather than branching on width stays right either way.
 *
 * Two more things here are deliberate and both were failures before.
 *
 * `force` — the fan overlaps each card down to a ~24px sliver, so Playwright's actionability
 * check sees a neighbour covering the click point and refuses. Correct by its own rules, but
 * that point IS reachable by a finger and is exactly what a player taps. Swallowing the
 * refusal was worse than either outcome: the card never played, the caller's loop retried
 * forever, and the run died on its budget with no failed assertion to read.
 *
 * The poll — the lift is a Vue render, so reading `.selected` immediately after the click can
 * return false before the class lands. Skipping the second tap on that reading leaves the card
 * in the hand and produces the same silent spin. So wait for the card to either rise or leave,
 * and if it does neither, say so.
 */
async function tapCard(card: Locator) {
  const at = { position: { x: 10, y: 40 }, timeout: 5_000, force: true } as const
  const label = await card.getAttribute('aria-label')
  await card.click(at)

  // Pin the same card by name: the caller's locator is `.first()` of whatever is legal, which
  // silently becomes a DIFFERENT card the moment this one is played.
  const same = label
    ? card.page().locator(`.hand-row .card[aria-label="${label}"]`)
    : card

  for (let i = 0; i < 20; i++) {
    if (await same.count() === 0) return  // one tap played it
    const lifted = await same.evaluate(el => el.classList.contains('selected')).catch(() => false)
    if (lifted) {
      await same.click(at)                // phone: the second tap plays it
      return
    }
    await card.page().waitForTimeout(50)
  }
  throw new Error(`tapping "${label ?? 'a card'}" neither lifted it nor played it`)
}

/**
 * The first card that is legal to play right now, if there is one.
 *
 * `:not(.faceDown)` is load-bearing. While a bot is thinking the screen draws a decoy fan of
 * face-down cards where the hand goes, so the table cannot read the bot's cards. Those decoys
 * are not interactive, but `PlayingCard` defaults `playable` to true and only sets `disabled`
 * when `interactive` is set — so they carry `.card.playable` with no `disabled`, and matched
 * here. The loop then spent every turn tapping a bot's back-of-card, which does nothing, and
 * never reached the "a bot is thinking" wait at all.
 */
function firstLegal(page: Page): Locator {
  return page.locator('.hand-row .card.playable:not(.faceDown):not([disabled])').first()
}

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
  const card = firstLegal(page)
  await expect(card).toBeEnabled({ timeout: 15_000 })
  await tapCard(card)
  // A played card sits with the seat that played it now, not in a shared book strip.
  await expect(page.locator('.seat-card .card')).not.toHaveCount(0)
})

test('spades: wild style bids the opening hand itself', async ({ page }) => {
  await page.goto('/spades/setup')
  await pickBubble(page, 'Peezy')
  await page.getByRole('button', { name: /DEAL/ }).click()
  await expect(page).toHaveURL(/\/spades$/)

  // Bid chips are per side, not per seat — two in a partnership game, four in solo.
  // Each seat carries its own books-of-bid on its plate; the side strip is gone.
  await expect(page.locator('.seat-plate').first()).toBeVisible()
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
  /*
   * This plays a whole thirteen-book hand. On a phone every card takes two taps — one to lift
   * it, one to play it — plus a read-back of `.selected` between them, so the run costs
   * roughly double what it did when one tap played. 150s was enough then and is not now: the
   * budget ran out mid-hand and Playwright tore the browser down, which surfaces as
   * "Target page, context or browser has been closed" rather than as a failed assertion.
   */
  test.setTimeout(300_000)

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

    const card = firstLegal(page)
    if (await card.count() > 0) { await tapCard(card); continue }

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

  // The ✕ in the header, not the button under thirteen books — that one needs scrolling to.
  await page.locator('.review-close').click()
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
  await expect(page.locator('.table-area')).toContainText('Big Mike')
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

/**
 * The seats do not stack on a phone — the three you are not sitting in share one row under
 * the cards they played. That row is the one that can wrap, and wrapping is where the defect
 * lived: a flex row left the last item stretched across the full width on its own, three
 * narrow and one enormous. The bid chips this guarded are gone, but the row is not, so the
 * guard moves onto the plates rather than being deleted with them.
 */
for (const [mode, label] of [
  ['partners', 'PARTNERS'],
  ['solo', 'EVERY PLAYER FOR THEMSELVES'],
] as const) {
  test(`spades: the ${mode} seat plates are evenly sized on a phone`, async ({ page }) => {
    test.setTimeout(90_000)

    // Deliberately no explicit viewport: this runs on both projects and it is the narrow
    // one that matters. At the default 393 the four chips fit one row and this passes
    // whether the fix is there or not; at 375 the row wraps and the defect appears.
    await page.goto('/spades/setup')
    // hasText is case-insensitive and the solo blurb says "no partners", so it matches both
    // buttons. Match the name element exactly instead.
    await page.locator(`.mode-btn:has(.mb-name:text-is("${label}"))`).click()
    await pickBubble(page, 'Peezy')

    // A long name is what forces the row to wrap, and wrapping is where the defect lives.
    // With the stock four-letter names the chips happen to fit one row, so a test that did
    // not do this passed whether the fix was present or not.
    const seat = page.locator('.seat-name-input').first()
    await seat.fill('Bartholomew')
    await seat.blur()
    await page.getByRole('button', { name: /DEAL/ }).click()
    await expect(page).toHaveURL(/\/spades$/)

    // Auto-bid is partnerships only, so a solo game asks this seat for a number first.
    // Chips only appear once bidding is done and play starts.
    for (let i = 0; i < 40 && await page.locator('.table-area').count() === 0; i++) {
      const bid = page.locator('.bid-btn:not([disabled])').nth(3)
      if (await bid.count() > 0) { await bid.click({ timeout: 5_000 }).catch(() => {}) }
      else await page.waitForTimeout(250)   // a computer seat is bidding
    }
    await expect(page.locator('.table-area')).toBeVisible({ timeout: 30_000 })
    // The three other seats share one row under the cards they played; your own plate is on
    // its own line above the hand, so it is not part of the row that can wrap.
    const plates = page.locator('.seat:not(.seat-you) .seat-plate')
    await expect(plates).toHaveCount(3)

    const widths = await plates.evaluateAll(
      els => els.map(e => Math.round(e.getBoundingClientRect().width)),
    )
    // Every seat has to read with the same weight. Comparing the widest against the narrowest
    // rather than demanding they be identical: the defect was one plate three times the rest,
    // and a rounding difference of a pixel is not a bug.
    const ratio = Math.max(...widths) / Math.min(...widths)
    expect(ratio, `plate widths were ${widths.join(', ')}`).toBeLessThan(1.5)

    const overflows = await page.evaluate(
      () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
    )
    expect(overflows).toBe(false)
  })
}
