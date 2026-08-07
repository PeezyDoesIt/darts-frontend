/**
 * Spades, using the house deck: a standard pack with the two of hearts and the two of
 * diamonds REMOVED and two jokers added. That is 50 + 2 = 52, which is what makes four
 * hands of thirteen come out even — the removals are not decoration, they are what the
 * joker slots cost.
 *
 * Both jokers play as spades. The big joker is the colored one and is marked H (high); the
 * little joker is the black-and-white one and is marked L (low). Order of the trump suit,
 * high to low:
 *
 *   Big Joker (H) > Little Joker (L) > A > K > Q > J > 10 > ... > 2
 */

export type Suit = 'spades' | 'hearts' | 'diamonds' | 'clubs'
export type JokerKind = 'big' | 'little'

export type Card =
  | { kind: 'pip'; suit: Suit; rank: number }      // rank 2..14, 14 = ace
  | { kind: 'joker'; joker: JokerKind }

export const SUITS: Suit[] = ['spades', 'hearts', 'diamonds', 'clubs']
export const SUIT_SYMBOL: Record<Suit, string> = {
  spades: '♠', hearts: '♥', diamonds: '♦', clubs: '♣',
}

export const HAND_SIZE = 13
export const PLAYER_COUNT = 4
export const WINNING_SCORE = 500
export const BAG_PENALTY_AT = 10
export const BAG_PENALTY = 100

/** Cards deliberately absent from the house deck, so four hands of 13 come out even. */
export const REMOVED_CARDS: { suit: Suit; rank: number }[] = [
  { suit: 'hearts', rank: 2 },
  { suit: 'diamonds', rank: 2 },
]

export const RULES: string[] = [
  'House deck: the 2 of hearts and 2 of diamonds are removed, two jokers added',
  'Big Joker (H, colored) is the highest card; Little Joker (L, black and white) is next',
  'Both jokers count as spades',
  'Bid the number of tricks you expect to take, then play them out',
  'Make your bid for 10 points a trick; miss it and you lose 10 a trick',
  'Extra tricks are bags — worth 1 each, but 10 bags costs you 100',
  'Nil is worth 100 if you take no tricks at all, and -100 if you take one',
  'First side to 500 wins',
]

export function rankLabel(rank: number): string {
  if (rank === 14) return 'A'
  if (rank === 13) return 'K'
  if (rank === 12) return 'Q'
  if (rank === 11) return 'J'
  return String(rank)
}

/** Short face label. Jokers read as H and L so the two are never confused in play. */
export function cardLabel(c: Card): string {
  return c.kind === 'joker' ? (c.joker === 'big' ? 'H' : 'L') : rankLabel(c.rank)
}

export function cardId(c: Card): string {
  return c.kind === 'joker' ? `joker-${c.joker}` : `${c.suit}-${c.rank}`
}

/** Jokers play as spades, which is what makes them legal only when spades are legal. */
export function effectiveSuit(c: Card): Suit {
  return c.kind === 'joker' ? 'spades' : c.suit
}

export function isTrump(c: Card): boolean {
  return effectiveSuit(c) === 'spades'
}

/**
 * Comparable strength within a single suit. Jokers sit above the ace of spades, which is
 * the only place the house rules diverge from a normal pack.
 */
export function strength(c: Card): number {
  if (c.kind === 'joker') return c.joker === 'big' ? 100 : 99
  return c.rank
}

/** The 52-card house deck. */
export function makeDeck(): Card[] {
  const deck: Card[] = []
  for (const suit of SUITS) {
    for (let rank = 2; rank <= 14; rank++) {
      if (REMOVED_CARDS.some(r => r.suit === suit && r.rank === rank)) continue
      deck.push({ kind: 'pip', suit, rank })
    }
  }
  deck.push({ kind: 'joker', joker: 'big' })
  deck.push({ kind: 'joker', joker: 'little' })
  return deck
}

/** Fisher-Yates. Takes the RNG so tests can make a deal deterministic. */
export function shuffle<T>(items: T[], rng: () => number = Math.random): T[] {
  const a = [...items]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1))
    ;[a[i], a[j]] = [a[j]!, a[i]!]
  }
  return a
}

/** Deal 13 each to four hands, sorted for display. */
export function deal(rng: () => number = Math.random): Card[][] {
  const deck = shuffle(makeDeck(), rng)
  const hands: Card[][] = [[], [], [], []]
  for (let i = 0; i < deck.length; i++) hands[i % PLAYER_COUNT]!.push(deck[i]!)
  return hands.map(sortHand)
}

const SUIT_DISPLAY_ORDER: Suit[] = ['spades', 'hearts', 'clubs', 'diamonds']

/** Group by suit with trump first, strongest first inside each suit. */
export function sortHand(hand: Card[]): Card[] {
  return [...hand].sort((a, b) => {
    const sa = SUIT_DISPLAY_ORDER.indexOf(effectiveSuit(a))
    const sb = SUIT_DISPLAY_ORDER.indexOf(effectiveSuit(b))
    if (sa !== sb) return sa - sb
    return strength(b) - strength(a)
  })
}

/**
 * Which cards may legally be played. Following the led suit is mandatory when able; a void
 * frees the hand entirely. Leading spades is barred until spades are broken, unless the
 * hand holds nothing else — without that escape a player holding only spades could not move.
 */
export function legalPlays(hand: Card[], led: Suit | null, spadesBroken: boolean): Card[] {
  if (led !== null) {
    const following = hand.filter(c => effectiveSuit(c) === led)
    return following.length > 0 ? following : hand
  }
  if (spadesBroken) return hand
  const nonTrump = hand.filter(c => !isTrump(c))
  return nonTrump.length > 0 ? nonTrump : hand
}

/**
 * Index of the winning card in a completed trick. Any trump beats any non-trump; otherwise
 * only cards following the led suit can win.
 */
export function trickWinner(trick: Card[], led: Suit): number {
  let bestIdx = -1
  let bestKey = -1
  trick.forEach((c, i) => {
    const trumped = isTrump(c) && led !== 'spades'
    const follows = effectiveSuit(c) === led
    if (!trumped && !follows) return
    // trumps occupy a band above every following card, so one comparison covers both cases
    const key = (trumped ? 1000 : 0) + strength(c)
    if (key > bestKey) { bestKey = key; bestIdx = i }
  })
  return bestIdx
}

export interface SideResult {
  /** Points gained or lost this hand, excluding the bag penalty. */
  points: number
  /** Bags accrued this hand. */
  bags: number
}

/**
 * Score one side's hand. `bid` is the combined partnership bid; `nilBids` are the individual
 * nil declarations, scored separately from the contract because a nil neither helps nor
 * hurts the partner's bid.
 */
export function scoreSide(
  bid: number,
  tricks: number,
  nilBids: { nil: boolean; tricks: number }[] = [],
): SideResult {
  let points = 0
  for (const n of nilBids) {
    if (n.nil) points += n.tricks === 0 ? 100 : -100
  }
  if (bid === 0) return { points, bags: 0 }

  if (tricks >= bid) {
    const bags = tricks - bid
    return { points: points + bid * 10 + bags, bags }
  }
  return { points: points - bid * 10, bags: 0 }
}

/**
 * Apply the sandbagging penalty. Bags roll over rather than reset to zero, so a side that
 * lands on 12 keeps 2 against the next penalty.
 */
export function applyBagPenalty(totalBags: number): { score: number; bags: number } {
  const penalties = Math.floor(totalBags / BAG_PENALTY_AT)
  // Subtract from zero rather than negating: `-0 * 100` is -0, which renders as "-0".
  return { score: 0 - penalties * BAG_PENALTY, bags: totalBags % BAG_PENALTY_AT }
}
