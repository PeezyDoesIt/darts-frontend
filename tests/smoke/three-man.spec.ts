import { expect, test } from '@playwright/test'
import { seedRoster } from './helpers'

/**
 * Three Man's screen.
 *
 * The unit tests cover the rules by pinning the dice, but nothing had ever rendered this page
 * — CI could go green on a screen that crashed on mount, a route that went nowhere, or a
 * button wired to nothing. That gap is what this file closes, and it is why the assertions
 * below are about the screen rather than about the arithmetic.
 *
 * The spotlight rebuild made it worth more than a smoke check. The whole complaint being
 * fixed was "you cannot tell whose roll it is", which is a claim about the DOM: one card
 * carries the avatar, one card wears the turn tape, and the next player is labelled. Those
 * are checkable, so they are checked.
 */


/**
 * Pin the dice for the rest of the run.
 *
 * The first draft of this file rolled live and failed one time in six, because doubles put the
 * store into `assigning` — which deliberately replaces ROLL and PASS with the hand-out buttons,
 * so every assertion after the click referred to something that was no longer on screen.
 *
 * `cycle` is served round-robin. Two different values therefore guarantee that any two
 * CONSECUTIVE draws differ, so the pair is never doubles no matter how many values something
 * else consumed first — which matters because the counter is shared with anything else on the
 * page that reaches for Math.random. A single value guarantees the opposite: doubles, every
 * time. Both are wanted, so both are reachable.
 */
async function pinDice(page: import('@playwright/test').Page, faces: number[]) {
  await page.addInitScript(cycle => {
    let i = 0
    Math.random = () => cycle[i++ % cycle.length]!
  }, faces.map(n => (n - 0.5) / 6))
}

async function startGame(page: import('@playwright/test').Page, faces: number[] = [2, 5]) {
  await seedRoster(page)
  await pinDice(page, faces)
  await page.goto('/dice/threeman/setup')
  // Three is the minimum — the 7 and 11 rules both point at the same person with two.
  for (const name of ['Peezy', 'Sam', 'Jo']) {
    // `:text-is` rather than hasText: a substring match would pick the wrong bubble the
    // first time two players share a prefix, and it would do it silently.
    await page.locator(`.player-bubble:has(.bubble-name:text-is("${name}"))`).click()
  }
  await page.getByRole('button', { name: /START GAME/ }).click()
  await expect(page).toHaveURL(/\/dice\/threeman$/)
}

test('the setup screen offers house rules and no target', async ({ page }) => {
  await seedRoster(page)
  await page.goto('/dice/threeman/setup')

  await expect(page.getByText('HOUSE RULES')).toBeVisible()
  // Three Man has no win condition, so a "play to" section would be inventing a rule.
  await expect(page.getByText('PLAY TO')).toHaveCount(0)
  await expect(page.getByText('ROUNDS TO WIN')).toHaveCount(0)
})

test('under three players it will not start', async ({ page }) => {
  await seedRoster(page)
  await page.goto('/dice/threeman/setup')
  await page.locator('.player-bubble', { hasText: 'Peezy' }).first().click()
  await expect(page.getByRole('button', { name: /Select 3 or more players/ })).toBeDisabled()
})

test('the screen renders, and exactly one player is in the spotlight', async ({ page }) => {
  await startGame(page)

  await expect(page.locator('.tm-page')).toBeVisible()
  // The fix, stated as a DOM fact: one active card, and it is the only one with an avatar.
  await expect(page.locator('.tm-card.active')).toHaveCount(1)
  await expect(page.locator('.tm-avatar')).toHaveCount(1)
  await expect(page.locator('.tm-tape-turn')).toHaveCount(1)
  await expect(page.locator('.tm-card.idle')).toHaveCount(2)
  // And you can see when you are up, not only when you are on.
  await expect(page.locator('.tm-next')).toHaveCount(1)

  // The glass screen this replaced. If any of it comes back, it comes back here first.
  await expect(page.locator('.gp-header')).toHaveCount(0)
  await expect(page.getByText('🎲')).toHaveCount(0)
})

test('rolling shows two real dice and a total, then the dice are held until you pass', async ({ page }) => {
  await startGame(page)   // pinned 2 and 5: a total of 7, and never doubles

  await expect(page.locator('.tm-die-empty')).toHaveCount(2)
  await page.getByRole('button', { name: 'ROLL', exact: true }).click()

  // Two cubes from DiceFace, not squares and not an emoji.
  await expect(page.locator('.tm-dice .die-stage')).toHaveCount(2)
  await expect(page.locator('.tm-total')).toHaveText('7')

  /*
   * The bug the roll guard exists for: without it the same player could throw again and again,
   * re-applying outcomes, and the turn never moved. The button says so rather than silently
   * doing nothing.
   */
  await expect(page.getByRole('button', { name: 'ROLLED' })).toBeDisabled()

  await page.getByRole('button', { name: /PASS/ }).click()
  await expect(page.locator('.tm-die-empty')).toHaveCount(2)
  await expect(page.getByRole('button', { name: 'ROLL', exact: true })).toBeEnabled()
})

test('the turn is stated in the roster and again in the footer', async ({ page }) => {
  await startGame(page)

  // Two statements of the same fact, on purpose — one for eyes on the row, one for eyes on
  // the buttons. They have to agree, which is the part worth asserting.
  const spotlit = (await page.locator('.tm-card.active .tm-active-name').innerText()).trim()
  const footer = (await page.locator('.tm-turn-label').innerText()).trim()
  expect(footer).toContain(spotlit.toUpperCase())

  await page.getByRole('button', { name: 'ROLL', exact: true }).click()
  await page.getByRole('button', { name: /PASS/ }).click()

  const nextSpotlit = (await page.locator('.tm-card.active .tm-active-name').innerText()).trim()
  expect(nextSpotlit).not.toBe(spotlit)
  expect((await page.locator('.tm-turn-label').innerText()).trim()).toContain(nextSpotlit.toUpperCase())
})

test('the rules panel says what this table plays', async ({ page }) => {
  await startGame(page)
  await page.getByRole('button', { name: 'RULES' }).click()
  await expect(page.locator('.tm-panel-title')).toHaveText('THREE MAN')
  // House rules are settings, so the panel has to report the ones in force, not a generic list.
  await expect(page.locator('.tm-house')).toContainText('7 goes')
})

test('doubles take over the footer band instead of opening a panel', async ({ page }) => {
  // Pinned to a single face, so both dice land on 4 — the branch that made the two tests
  // above flaky before the dice were pinned. Now it is covered rather than avoided.
  await startGame(page, [4])
  await page.getByRole('button', { name: 'ROLL', exact: true }).click()

  await expect(page.locator('.tm-total')).toHaveText('8')
  // The band is where your hands already are, so the choice replaces the buttons in it.
  await expect(page.getByRole('button', { name: 'ROLL', exact: true })).toHaveCount(0)
  await expect(page.getByRole('button', { name: /PASS/ })).toHaveCount(0)
  await expect(page.locator('.tm-turn-label')).toContainText('PICK WHO TAKES THEM')

  // One button per player, and they are handed out one at a time.
  const buttons = page.locator('.tm-assign-btn')
  await expect(buttons).toHaveCount(3)
  for (let i = 0; i < 4; i++) await buttons.first().click()

  // Pile empty: the band gives the buttons back.
  await expect(page.locator('.tm-assign-btn')).toHaveCount(0)
  await expect(page.getByRole('button', { name: 'ROLL', exact: true })).toBeVisible()
})
