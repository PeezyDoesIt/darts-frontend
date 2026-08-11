/**
 * Shaping recorded games for the history screen.
 *
 * Pure so the grouping and the day labels can be tested against fixed dates — "Tonight" and
 * "Yesterday" depend on when you ask, which is exactly the kind of thing that works in
 * development and reads wrong at midnight or in another timezone.
 */

export interface HistoryGame {
  id: string
  gameType: string
  winnerId: string
  playerIds: string[]
  finishedAt: string
  roundCount: number | null
}

export interface HistoryDay {
  /** 'Tonight', 'Yesterday', or a date. */
  label: string
  /** Sort key, so days stay in order regardless of label. */
  key: string
  games: HistoryGame[]
}

/** Local calendar day, not UTC — a 9pm game must not be filed under tomorrow. */
function dayKey(d: Date): string {
  const m = `${d.getMonth() + 1}`.padStart(2, '0')
  const day = `${d.getDate()}`.padStart(2, '0')
  return `${d.getFullYear()}-${m}-${day}`
}

export function dayLabel(finishedAt: Date, now: Date): string {
  const diff = Number(new Date(dayKey(now))) - Number(new Date(dayKey(finishedAt)))
  const days = Math.round(diff / 86_400_000)

  if (days <= 0) return 'Tonight'
  if (days === 1) return 'Yesterday'
  if (days < 7) return finishedAt.toLocaleDateString(undefined, { weekday: 'long' })
  return finishedAt.toLocaleDateString(undefined, { day: 'numeric', month: 'short' })
}

/**
 * Groups games under the day they finished, newest day first, preserving the order games
 * arrive in within each day. The API already sorts newest-first, so this keeps that.
 */
export function groupByDay(games: HistoryGame[], now: Date): HistoryDay[] {
  const days = new Map<string, HistoryDay>()

  for (const game of games) {
    const finished = new Date(game.finishedAt)
    if (Number.isNaN(Number(finished))) continue  // a bad timestamp drops the game, not the screen

    const key = dayKey(finished)
    let day = days.get(key)
    if (!day) {
      day = { key, label: dayLabel(finished, now), games: [] }
      days.set(key, day)
    }
    day.games.push(game)
  }

  return [...days.values()].sort((a, b) => (a.key < b.key ? 1 : -1))
}

/** How the players in a game read on one line, with the winner first. */
export function playerLine(
  game: HistoryGame,
  nameOf: (id: string) => string | null,
): string {
  const winner = nameOf(game.winnerId)
  const others = game.playerIds
    .filter(id => id !== game.winnerId)
    .map(nameOf)
    .filter((n): n is string => !!n)

  if (!winner) return others.join(', ')
  if (others.length === 0) return winner
  return `${winner} beat ${others.join(', ')}`
}
