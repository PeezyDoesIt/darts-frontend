/**
 * Which saved games are still in progress, for the home screen to offer back.
 *
 * Every game persists itself to its own localStorage key, but only darts was ever offered a
 * way back in. Darts and Left Right Center were rescued by a router redirect that sent the
 * home page straight into the game; the other five were reachable only by typing the URL.
 * Removing that redirect — so the app always opens on the main menu — means the home screen
 * has to account for all seven, or an unfinished game becomes unreachable.
 *
 * Takes a reader rather than touching localStorage directly, so the whole thing is testable
 * without a browser.
 */

export interface ResumableGame {
  /** The storage key, handy as a list key and for clearing. */
  key: string
  title: string
  /** Enough to recognise which game this is — players, and where it got to. */
  detail: string
  route: string
}

type Source = {
  key: string
  title: string
  route: string
  live: (g: Record<string, unknown>) => boolean
  detail: (g: Record<string, unknown>) => string
}

const players = (g: Record<string, unknown>): number =>
  Array.isArray(g.players) ? g.players.length : 0

const who = (g: Record<string, unknown>): string => {
  const n = players(g)
  return `${n} player${n === 1 ? '' : 's'}`
}

/** Dice games and Spades all mark a finished game the same way. */
const notOver = (g: Record<string, unknown>) =>
  typeof g.phase === 'string' && g.phase !== 'game_over'

const SOURCES: Source[] = [
  {
    key: 'darts_active_game',
    title: 'Darts',
    route: '/game',
    // 'finished' is deliberately not resumable: the win screen still owes it a result, and
    // the router sends it there instead.
    live: g => g.status === 'playing' || g.status === 'between_turns',
    detail: g => `${who(g)} · round ${g.round ?? 1}`,
  },
  {
    key: 'yahtzee_active_game',
    title: 'Yahtzee',
    route: '/yahtzee',
    live: g => g.status === 'playing',
    detail: g => who(g),
  },
  {
    key: 'lrc_active_game',
    title: 'Left Right Center',
    route: '/lrc',
    live: notOver,
    detail: g => `${who(g)} · round ${g.round ?? 1}`,
  },
  {
    key: 'spades_active_game',
    title: 'Spades',
    route: '/spades',
    live: notOver,
    detail: g => `hand ${g.handNumber ?? 1}`,
  },
  {
    key: 'farkle_active_game',
    title: 'Farkle',
    route: '/dice/farkle',
    live: notOver,
    detail: g => `${who(g)} · to ${g.target ?? ''}`.replace(/ · to $/, ''),
  },
  {
    key: 'scc_active_game',
    title: 'Ship Captain Crew',
    route: '/dice/scc',
    live: notOver,
    detail: g => `${who(g)} · round ${g.round ?? 1}`,
  },
  {
    key: 'pig_active_game',
    title: 'Pig',
    route: '/dice/pig',
    live: notOver,
    detail: g => `${who(g)} · to ${g.target ?? ''}`.replace(/ · to $/, ''),
  },
]

export function resumableGames(read: (key: string) => string | null): ResumableGame[] {
  const out: ResumableGame[] = []

  for (const source of SOURCES) {
    // No initialiser: every path through the try/catch below assigns before anything reads
    // it, so `= null` here was only ever overwritten.
    let game: Record<string, unknown> | null
    try {
      const raw = read(source.key)
      // A half-written or hand-edited save must not take the home screen down with it.
      game = raw ? JSON.parse(raw) : null
    } catch {
      game = null
    }
    if (!game || typeof game !== 'object') continue
    if (!source.live(game)) continue

    out.push({
      key: source.key,
      title: source.title,
      detail: source.detail(game),
      route: source.route,
    })
  }

  return out
}
