/**
 * A computer Yahtzee player.
 *
 * Deliberately heuristic rather than optimal. Playing Yahtzee properly means an expectimax
 * over every keep-subset against every category, which is a large piece of work and a
 * genuinely hard opponent; this instead plays the way a reasonable person does — chase the
 * biggest set you have, take a straight when one is close, and score the best thing on the
 * board. It occasionally leaves value behind, which is the point: it is a table opponent,
 * not a solver.
 *
 * Every decision is deterministic given the dice and the scorecard. The randomness in a bot
 * turn belongs to the dice, so a decision that looks wrong can be reproduced and argued with.
 */
import {
  YAHTZEE_CATEGORIES, calcScore,
  type YahtzeeCategory, type YahtzeeScorecard,
} from '../stores/yahtzee'

/** Faces present, counted. Index 0 is unused so the face is its own index. */
function counts(dice: number[]): number[] {
  const out = [0, 0, 0, 0, 0, 0, 0]
  for (const d of dice) if (d >= 1 && d <= 6) out[d]!++
  return out
}

const isOpen = (sc: YahtzeeScorecard, c: YahtzeeCategory) => sc[c] === null

/** The longest run of consecutive faces present, and where it starts. */
function longestRun(dice: number[]): { length: number; from: number } {
  const seen = counts(dice)
  let best = { length: 0, from: 0 }
  let run = 0
  for (let face = 1; face <= 6; face++) {
    run = seen[face]! > 0 ? run + 1 : 0
    if (run > best.length) best = { length: run, from: face - run + 1 }
  }
  return best
}

/**
 * Which dice to keep before rerolling.
 *
 * Order matters: a made hand is kept before a draw is chased, and a straight draw is only
 * worth keeping while a straight category is still open.
 */
export function chooseKeeps(
  dice: number[],
  scorecard: YahtzeeScorecard,
  rollsLeft: number,
): boolean[] {
  const keepNone = dice.map(() => false)
  if (dice.length === 0) return keepNone

  const seen = counts(dice)
  const straightOpen = isOpen(scorecard, 'smallStraight') || isOpen(scorecard, 'largeStraight')

  // A yahtzee is kept whatever else is on the board — it is worth 50 now, or a bonus later.
  const five = seen.findIndex(n => n === 5)
  if (five > 0) return dice.map(() => true)

  const run = longestRun(dice)

  // A made large straight is finished; keeping anything else throws it away.
  if (run.length >= 5 && isOpen(scorecard, 'largeStraight')) return dice.map(() => true)

  // Four to a straight is a one-card draw, which beats holding a pair.
  if (run.length === 4 && straightOpen && rollsLeft > 0) {
    const wanted = new Set<number>()
    for (let f = run.from; f < run.from + 4; f++) wanted.add(f)
    // Only the first copy of each face — a duplicate does not help a straight.
    const used = new Set<number>()
    return dice.map(d => {
      if (!wanted.has(d) || used.has(d)) return false
      used.add(d)
      return true
    })
  }

  const full = seen.some(n => n === 3) && seen.some(n => n === 2)
  if (full && isOpen(scorecard, 'fullHouse')) return dice.map(() => true)

  // Otherwise chase the biggest set. Ties go to the higher face, because the same number of
  // dice is worth more there in both the upper section and the total-based categories.
  let bestFace = 0
  for (let face = 1; face <= 6; face++) {
    const n = seen[face]!
    if (n === 0) continue
    const bn = seen[bestFace] ?? 0
    if (n > bn || (n === bn && face > bestFace)) bestFace = face
  }
  if (bestFace === 0) return keepNone

  return dice.map(d => d === bestFace)
}

/**
 * Sacrifice order, used only when nothing on the board scores.
 *
 * Low upper boxes go first because they cost the least, and the big combination boxes go
 * before the ones that reliably score something: chance takes any five dice, so burning it
 * for nothing is the worst trade available.
 */
const SACRIFICE_ORDER: YahtzeeCategory[] = [
  'aces', 'twos', 'yahtzee', 'largeStraight', 'fourOfAKind', 'fullHouse',
  'smallStraight', 'threes', 'threeOfAKind', 'fours', 'fives', 'sixes', 'chance',
]

/** Three of a face is par for the upper bonus — 63 is exactly three of each. */
function upperPar(category: YahtzeeCategory, score: number): boolean {
  // The upper section starts at 'aces', not 'ones'.
  const face = ['aces', 'twos', 'threes', 'fours', 'fives', 'sixes'].indexOf(category) + 1
  return face > 0 && score >= face * 3
}

/**
 * Which category to take.
 *
 * Highest score wins, with a nudge toward upper boxes that keep the 63 bonus reachable —
 * taking three fives is worth more than the fifteen points on the card if it protects 35.
 */
export function chooseCategory(dice: number[], scorecard: YahtzeeScorecard): YahtzeeCategory {
  const open = YAHTZEE_CATEGORIES.filter(c => isOpen(scorecard, c))
  if (open.length === 0) return 'chance'  // caller should not ask, but never return nothing

  let best: YahtzeeCategory | null = null
  let bestValue = -1

  for (const category of open) {
    const score = calcScore(category, dice)
    if (score === 0) continue

    const value = score + (upperPar(category, score) ? 8 : 0)
    if (value > bestValue) { bestValue = value; best = category }
  }
  if (best) return best

  // Nothing scores — give up the cheapest box still open.
  return SACRIFICE_ORDER.find(c => open.includes(c)) ?? open[0]!
}
