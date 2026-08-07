/**
 * Killer.
 *
 * Each player owns a number. Hit your own number to become a Killer; once you are one,
 * hits on other players' numbers take their lives. Last player standing wins.
 *
 * This is pure so the turn resolution can be tested without a board: the rules that bite
 * are the ordering ones (you cannot take a life on the same turn you earn your badge with
 * a later dart) and the guard that a non-Killer's hits on other numbers do nothing at all.
 */

export const DEFAULT_LIVES = 3
export const MIN_NUMBER = 1
export const MAX_NUMBER = 20

export interface KillerSeat {
  playerId: string
  /** The number this player owns, 1-20 and unique across the table. */
  number: number
  lives: number
  isKiller: boolean
}

export interface KillerTurnResult {
  seats: KillerSeat[]
  /** True when this turn promoted the actor to Killer. */
  becameKiller: boolean
  /** Lives removed, by player. Never includes the actor. */
  livesTaken: { playerId: string; lives: number }[]
  /** Players reduced to zero lives by this turn. */
  eliminated: string[]
  /** Hits that did nothing, and why — drives the "you're not a killer yet" callout. */
  wasted: number
}

export function rulesFor(requireDouble: boolean): string[] {
  return [
    'Every player owns a number',
    requireDouble
      ? 'Hit the DOUBLE of your own number to become a Killer'
      : 'Hit your own number to become a Killer',
    requireDouble
      ? 'Then hit the DOUBLE of another number to take a life'
      : 'Then hit another number to take a life — each mark is one life',
    'Lose all your lives and you are out',
    'Last player standing wins',
  ]
}

/**
 * Assign a unique number to each player. Takes the RNG so a deal can be made deterministic
 * in tests; there are only 20 numbers, so more than 20 players is refused rather than
 * silently handing two people the same number.
 */
export function assignNumbers(playerIds: string[], rng: () => number = Math.random): Record<string, number> | null {
  if (playerIds.length === 0 || playerIds.length > MAX_NUMBER) return null
  const pool: number[] = []
  for (let n = MIN_NUMBER; n <= MAX_NUMBER; n++) pool.push(n)
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1))
    ;[pool[i], pool[j]] = [pool[j]!, pool[i]!]
  }
  const out: Record<string, number> = {}
  playerIds.forEach((id, i) => { out[id] = pool[i]! })
  return out
}

/**
 * Apply one turn's hits.
 *
 * `hits` is keyed by the number hit, valued by how many qualifying marks landed on it. The
 * caller decides what qualifies (any mark, or doubles only) — that house rule never reaches
 * this function, which keeps the promotion and life-taking logic identical under both.
 *
 * Promotion is resolved before any life-taking, so a turn that both earns the badge and
 * hits an opponent's number counts the opponent hits. That is the reading players expect:
 * three darts are one turn, not three ordered events.
 */
export function resolveKillerTurn(
  seats: KillerSeat[],
  actorId: string,
  hits: Record<string, number>,
): KillerTurnResult {
  const next = seats.map(s => ({ ...s }))
  const actor = next.find(s => s.playerId === actorId)
  const livesTaken: { playerId: string; lives: number }[] = []
  const eliminated: string[] = []
  let becameKiller = false
  let wasted = 0

  if (!actor || actor.lives <= 0) {
    return { seats: next, becameKiller, livesTaken, eliminated, wasted }
  }

  const entries = Object.entries(hits)
    .map(([n, c]) => [Number(n), c] as const)
    .filter(([n, c]) => Number.isInteger(n) && c > 0)

  // Own number first — promotion applies to the whole turn, not just later darts.
  for (const [num, count] of entries) {
    if (num !== actor.number) continue
    if (!actor.isKiller && count > 0) {
      actor.isKiller = true
      becameKiller = true
    }
  }

  for (const [num, count] of entries) {
    if (num === actor.number) continue
    const target = next.find(s => s.number === num)
    // A hit on a number nobody owns, or on someone already out, is simply wasted.
    if (!target || target.lives <= 0) { wasted += count; continue }
    if (!actor.isKiller) { wasted += count; continue }

    const removed = Math.min(count, target.lives)
    target.lives -= removed
    livesTaken.push({ playerId: target.playerId, lives: removed })
    if (target.lives === 0) eliminated.push(target.playerId)
  }

  return { seats: next, becameKiller, livesTaken, eliminated, wasted }
}

/** Players still alive. */
export function survivors(seats: KillerSeat[]): KillerSeat[] {
  return seats.filter(s => s.lives > 0)
}
