import type { Page } from '@playwright/test'

/**
 * A roster is a precondition for every game — each setup screen refuses to start without
 * one — so tests seed it directly rather than clicking through player creation. The shape
 * mirrors `Player` in src/types; the store reads this key on load.
 */
export const ROSTER = ['Peezy', 'Sam', 'Jo', 'Rex'] as const

const COLORS = ['#ff4d6d', '#5fd0ff', '#7ee68a', '#ffd166']

/**
 * `keepGames` leaves saved games alone.
 *
 * The clear below runs on every navigation, not just the first, so a test that starts a game
 * and then reopens the home page has that game wiped out from under it — and any assertion
 * about resuming passes for the wrong reason. Tests that care about a game surviving a
 * reload have to opt out.
 */
export async function seedRoster(page: Page, opts: { keepGames?: boolean } = {}) {
  const players = ROSTER.map((name, i) => ({
    id: `smoke-${i + 1}`,
    name,
    avatarUrl: null,
    avatarPath: null,
    color: COLORS[i],
    playerBackground: null,
    playerBackgroundSize: null,
    playerBackgroundPosition: null,
    playerBackgroundFill: null,
    targetLabelColor: null,
    cricketTargetDisplay: null,
    diceTheme: null,
    pinned: false,
    wins: 0,
    gamesPlayed: 0,
    createdAt: '2024-01-01T00:00:00.000Z',
    updatedAt: null,
  }))

  // addInitScript runs before any app code on every navigation, so the store never sees an
  // empty roster — seeding after load would race the store's own read.
  await page.addInitScript(({ seed, keepGames }) => {
    localStorage.setItem('darts_players', JSON.stringify(seed))
    if (keepGames) return
    // Any leftover game would put the home screen in a state the test did not ask for.
    for (const key of [
      'darts_active_game', 'lrc_active_game', 'yahtzee_active_game', 'spades_active_game',
      'farkle_active_game', 'scc_active_game', 'pig_active_game', 'blackjack_active_game',
    ]) localStorage.removeItem(key)
  }, { seed: players, keepGames: opts.keepGames ?? false })
}

/**
 * Every setup screen uses the same PlayerPicker. Selecting a player removes them from the
 * grid and moves them into the caller's order list, so each pick resolves fresh.
 */
export async function pickBubble(page: Page, name: string) {
  await page.locator(`.player-bubble:has(.bubble-name:text-is("${name}"))`).click()
}

/** Where each game's player picker lives, for tests that assert all of them behave alike. */
export const SETUP_ROUTES = [
  { game: 'darts', path: '/new-game?step=2' },
  { game: 'yahtzee', path: '/yahtzee/setup' },
  { game: 'left right center', path: '/lrc/setup' },
  { game: 'farkle', path: '/dice/farkle/setup' },
  { game: 'ship captain crew', path: '/dice/scc/setup' },
  { game: 'pig', path: '/dice/pig/setup' },
  { game: 'spades', path: '/spades/setup' },
  { game: 'blackjack', path: '/blackjack/setup' },
] as const
