/**
 * Ship, Captain, Crew.
 *
 * The whole game turns on one rule that is easy to get wrong: the 6, 5 and 4 must be
 * claimed IN ORDER. A roll of 6,5,4 claims all three at once; a roll of 5,4,4 claims
 * nothing at all if you do not yet have your ship. Encoding that as a pure reducer keeps
 * it out of the component, where the ordering bug would be invisible until someone lost a
 * round to it.
 */

/** Faces that must be claimed, in the order they must be claimed. */
export const CLAIM_ORDER = [6, 5, 4] as const

export const SCC_ROLLS_PER_TURN = 3
export const SCC_DICE = 5

export const RULES: string[] = [
  'Five dice, three rolls per turn',
  'Claim a 6 (ship), then a 5 (captain), then a 4 (crew) — strictly in that order',
  'A single roll can claim more than one, if they come in order',
  'Your last two dice are cargo — their total is your score',
  'Re-roll the cargo to chase a higher total, but you keep whatever the third roll gives',
  'No ship, captain and crew by the third roll scores nothing',
  'Highest cargo wins the round',
]

export interface ClaimResult {
  /** How many of ship/captain/crew are now held — 0 to 3. */
  stage: number
  /** Dice not consumed by claiming, i.e. the cargo candidates. */
  remaining: number[]
  /** Faces claimed by this roll, in claim order — drives the UI callout. */
  claimed: number[]
}

/**
 * Apply one roll against the current stage, consuming whatever can legally be claimed.
 *
 * `stage` is how many of 6/5/4 are already held. Claiming is greedy and in-order: it takes
 * the next required face if present, then re-checks, so 6,5,4 in one roll advances all the
 * way to 3. Each claimed die is consumed once — a roll of 6,6,5 claims one 6 and one 5,
 * leaving the spare 6 as cargo.
 */
export function claimFromRoll(dice: number[], stage: number): ClaimResult {
  const remaining = [...dice]
  const claimed: number[] = []
  let s = Math.max(0, Math.min(stage, CLAIM_ORDER.length))

  while (s < CLAIM_ORDER.length) {
    const need = CLAIM_ORDER[s]!
    const idx = remaining.indexOf(need)
    if (idx === -1) break
    remaining.splice(idx, 1)
    claimed.push(need)
    s++
  }

  return { stage: s, remaining, claimed }
}

/** A turn scores only once ship, captain and crew are all held. */
export function isComplete(stage: number): boolean {
  return stage >= CLAIM_ORDER.length
}

/**
 * Cargo is the total of the two dice left once the crew is aboard. Scoring an incomplete
 * turn is always zero, however good the loose dice look — that is the point of the game.
 */
export function cargoScore(stage: number, remaining: number[]): number {
  if (!isComplete(stage)) return 0
  return remaining.reduce((a, b) => a + b, 0)
}

/** Label for the next thing the player needs, or null when they are on cargo. */
export function needLabel(stage: number): string | null {
  const names = ['Ship (6)', 'Captain (5)', 'Crew (4)']
  return stage < CLAIM_ORDER.length ? names[stage]! : null
}
