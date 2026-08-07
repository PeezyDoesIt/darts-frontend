/**
 * Farkle scoring.
 *
 * Kept as pure functions with no store or component dependency, because the scoring is the
 * only genuinely subtle part of the game and it needs to be testable in isolation. The UI
 * asks two questions and nothing else: "is this selection legal, and what is it worth"
 * (scoreSelection) and "does this roll have anything at all in it" (hasAnyScore).
 *
 * House rules encoded here — stated in RULES so the in-app text can never drift from the
 * implementation:
 *   single 1 = 100, single 5 = 50
 *   three of a kind = face x 100, except three 1s = 1000
 *   each die beyond the third DOUBLES the triple (four 2s = 400, five 2s = 800)
 *   straight 1-6 = 1500, three pairs = 1500, two triplets = 2500
 */

export const FARKLE_TARGET = 10000

export const RULES: string[] = [
  'Single 1 = 100 · Single 5 = 50',
  'Three of a kind = face x 100 (three 1s = 1000)',
  'Each extra die doubles the triple (four 2s = 400)',
  'Straight 1-6 = 1500 · Three pairs = 1500',
  'Two triplets = 2500',
  'Set aside at least one scoring die, then roll again or bank',
  'Score all six dice and you get all six back, keeping your total',
  'Roll nothing scoring and you FARKLE — the turn total is lost',
]

/** Score for `count` dice all showing `face`, when count >= 3. */
function nOfAKind(face: number, count: number): number {
  const triple = face === 1 ? 1000 : face * 100
  // Doubling rather than a flat four/five/six-of-a-kind table, so the value is always
  // derivable from the triple and the rule fits in one line of the rules sheet.
  return triple * Math.pow(2, count - 3)
}

/** Loose dice of a single face only score when they are 1s or 5s. */
function looseScore(face: number, count: number): number | null {
  if (count === 0) return 0
  if (face === 1) return count * 100
  if (face === 5) return count * 50
  return null
}

function countsOf(dice: number[]): number[] | null {
  const counts = [0, 0, 0, 0, 0, 0, 0]
  for (const d of dice) {
    if (!Number.isInteger(d) || d < 1 || d > 6) return null
    counts[d]!++
  }
  return counts
}

/**
 * Value of a selection where every die must contribute. Returns null when the selection is
 * illegal — that is, it contains at least one die that cannot be part of any combination.
 * The UI relies on null to refuse the "set aside" action, which is what stops a player from
 * banking dead dice alongside a scoring one.
 */
export function scoreSelection(dice: number[]): number | null {
  if (dice.length === 0 || dice.length > 6) return null
  const counts = countsOf(dice)
  if (!counts) return null

  const faces = counts.slice(1)
  const candidates: number[] = []

  // Whole-hand combinations. Only meaningful across all six dice, and each consumes
  // every die by definition.
  if (dice.length === 6) {
    if (faces.every(c => c === 1)) candidates.push(1500)                       // straight
    if (faces.filter(c => c === 2).length === 3) candidates.push(1500)         // three pairs
    if (faces.filter(c => c === 3).length === 2) candidates.push(2500)         // two triplets
  }

  // Per-face accumulation. Invalid the moment one face has dice that cannot score.
  let perFace = 0
  let perFaceValid = true
  for (let face = 1; face <= 6; face++) {
    const c = counts[face]!
    if (c === 0) continue
    if (c >= 3) {
      // Doubling always beats splitting the group into a triple plus loose 1s/5s — four 1s
      // is 2000 doubled against 1000 + 100 split, and the gap only widens with count — so
      // there is no choice to make here.
      perFace += nOfAKind(face, c)
    } else {
      const loose = looseScore(face, c)
      if (loose === null) { perFaceValid = false; break }
      perFace += loose
    }
  }
  if (perFaceValid) candidates.push(perFace)

  if (candidates.length === 0) return null
  return Math.max(...candidates)
}

/**
 * Whether a roll contains anything scoring at all. A false here is a Farkle, which is the
 * only way to lose a turn total, so it is deliberately computed independently of
 * scoreSelection rather than derived from it.
 */
export function hasAnyScore(dice: number[]): boolean {
  const counts = countsOf(dice)
  if (!counts) return false
  if (counts[1]! > 0 || counts[5]! > 0) return true
  if (counts.slice(1).some(c => c >= 3)) return true
  if (dice.length === 6) {
    const faces = counts.slice(1)
    if (faces.every(c => c === 1)) return true
    if (faces.filter(c => c === 2).length === 3) return true
  }
  return false
}

/** Highest value obtainable from a roll, used to show the player what they are leaving behind. */
export function bestScore(dice: number[]): number {
  let best = 0
  const n = dice.length
  for (let mask = 1; mask < (1 << n); mask++) {
    const pick: number[] = []
    for (let i = 0; i < n; i++) if (mask & (1 << i)) pick.push(dice[i]!)
    const s = scoreSelection(pick)
    if (s !== null && s > best) best = s
  }
  return best
}
