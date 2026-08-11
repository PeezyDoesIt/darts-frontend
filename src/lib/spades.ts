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
 *
 * House scoring: a missed bid is a SET, which is worth nothing — it never takes points
 * away. The sandbag penalty is the only thing in the game that lowers a score, and it is
 * the only route to a negative total.
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

/**
 * The lowest contract a partnership may hold. Bidding it is "bidding board", and it is why
 * the second partner to bid sometimes has no low options left: if the first bid 1, the
 * second is held to 3 so the side reaches 4 between them.
 *
 * Partnerships only. Four solo sides share the same thirteen books, so an average hand is
 * barely over three — a floor of 4 each would force the whole table to overbid every hand.
 */
export const BOARD = 4

/**
 * The smallest number this seat may bid.
 *
 * Nil is handled separately by `nilAllowedFor`, because it is a declaration worth its own
 * 100 rather than part of the contract.
 */
export function minBidFor(partnerBid: number | null, mode: SpadesMode = 'partners'): number {
  if (mode !== 'partners') return 1
  // Bidding first, so the partner can still make up whatever is missing.
  if (partnerBid === null) return 1
  // A nil partner puts nothing toward the contract, leaving this seat to make board alone.
  return Math.max(1, BOARD - (partnerBid === 0 ? 0 : partnerBid))
}

/**
 * Whether this seat may declare nil.
 *
 * The invariant board protects is that a side's contract is either 0 — both partners nil,
 * so there is no contract to be short of — or at least BOARD. Nil adds nothing, so it is
 * only available to the second bidder when the partner's own bid already makes board, or
 * when the partner is nil too. Without this, bid order would decide legality: 1 then nil
 * would stand at a contract of 1, while nil then 1 is correctly refused.
 */
export function nilAllowedFor(partnerBid: number | null, mode: SpadesMode = 'partners'): boolean {
  if (mode !== 'partners') return true
  if (partnerBid === null) return true
  return partnerBid === 0 || partnerBid >= BOARD
}

/**
 * Wild Style house rules. Being set no longer costs points anywhere — see `scoreSide` — so
 * in Wild Style these loss conditions ARE the penalty for missing a contract, which is why
 * they are stated up front in the rules list rather than discovered.
 *
 * They apply to partnership games only. Four solo sides get set far too often for a
 * first-hand set to decide anything: most hands would end the game on the spot.
 */
/** A side set on the opening hand hands the game to the other side. */
export const WILD_FIRST_HAND_SET_LOSES = true
/** Being set on two hands in a row loses, however the score stands. */
export const WILD_MAX_CONSECUTIVE_SETS = 2
/** Being set three times in a game loses, consecutive or not. */
export const WILD_MAX_SETS = 3

/** One side's running state between hands. */
export interface SideStanding {
  score: number
  bags: number
  setCount: number
  setStreak: number
}

/**
 * Fold one hand's result into a side's standing: points, bags and the sandbagging penalty,
 * plus the set bookkeeping the Wild Style loss rules read.
 *
 * Kept here rather than inline in the store so the set counters can be tested without
 * playing thirteen books through a browser to reach them.
 */
export function applyHandToSide(
  prev: SideStanding,
  result: SideResult,
  wasSet: boolean,
  /**
   * Accepted for call-site compatibility and no longer read. It used to decide whether to
   * clamp the total at zero; nothing clamps now, because a set costs no points at all and
   * the bag penalty is deliberately allowed to take a side below zero.
   */
  _variant?: SpadesVariant,
): SideStanding {
  const bagsBefore = prev.bags + result.bags
  const penalty = applyBagPenalty(bagsBefore)

  return {
    score: prev.score + result.points + penalty.score,
    bags: penalty.bags,
    setCount: prev.setCount + (wasSet ? 1 : 0),
    setStreak: wasSet ? prev.setStreak + 1 : 0,
  }
}

/**
 * Which side, if any, has lost outright under the Wild Style rules.
 *
 * Returns the LOSING side — in a partnership game the winner is its opposite — or null
 * while the game continues. Several sides can trigger on the same hand, since several can
 * miss their bid at once; the lowest score loses, and a tie at the bottom leaves the game
 * running rather than ending it arbitrarily.
 */
export function wildLossTeam(
  handNumber: number,
  wasSet: readonly boolean[],
  setStreak: readonly number[],
  setCount: readonly number[],
  scores: readonly number[],
): number | null {
  const lost = scores.map((_, i) => i).filter(t =>
    (WILD_FIRST_HAND_SET_LOSES && handNumber === 1 && !!wasSet[t]) ||
    (setStreak[t] ?? 0) >= WILD_MAX_CONSECUTIVE_SETS ||
    (setCount[t] ?? 0) >= WILD_MAX_SETS
  )

  if (lost.length === 0) return null
  if (lost.length === 1) return lost[0]!
  const low = Math.min(...lost.map(t => scores[t] ?? 0))
  const bottom = lost.filter(t => (scores[t] ?? 0) === low)
  return bottom.length === 1 ? bottom[0]! : null
}

/**
 * Who is playing with whom.
 *
 * 'partners' is ordinary Spades: seats 0 and 2 against 1 and 3, two bids adding up to one
 * contract. 'solo' is every player for themselves — four sides, each bidding and scoring
 * alone, which is the shape a bar table usually wants when nobody feels like pairing off.
 */
export type SpadesMode = 'partners' | 'solo'

export const MODE_LABELS: Record<SpadesMode, string> = {
  partners: 'Partners',
  solo: 'Every player for themselves',
}

export const MODE_BLURBS: Record<SpadesMode, string> = {
  partners: 'Seats 1 and 3 play against seats 2 and 4. Your bid and your partner\'s add up to one contract, and you win or get set together.',
  solo: 'Four sides, no partners. You bid alone, you score alone, and nobody is covering your nil.',
}

/** How many scoring sides the table has. */
export const sideCount = (mode: SpadesMode): number =>
  mode === 'partners' ? 2 : PLAYER_COUNT

/** Which scoring side a seat belongs to. In solo every seat is its own side. */
export const sideOf = (seat: number, mode: SpadesMode): number =>
  mode === 'partners' ? seat % 2 : seat

/**
 * Target score. Solo plays to a lower number on purpose: the same 500 split four ways
 * instead of two is roughly twice the hands, which is a long night for a game that is
 * meant to fit between rounds of darts.
 */
export const targetFor = (mode: SpadesMode): number =>
  mode === 'partners' ? WINNING_SCORE : 300

/**
 * Which deck is in play.
 *
 * 'classic' is an ordinary 52-card pack, no jokers, highest trump is the ace of spades.
 * 'wild' is the house deck: the two red twos come out and two jokers go in, which is what
 * keeps the count at 52 so four hands of thirteen still come out even.
 */
export type SpadesVariant = 'classic' | 'wild'

export const VARIANT_LABELS: Record<SpadesVariant, string> = {
  classic: 'Classic',
  wild: 'Wild Style',
}

export const VARIANT_BLURBS: Record<SpadesVariant, string> = {
  classic: 'Standard 52-card deck. No jokers — the ace of spades is the highest card.',
  wild: 'The 2 of hearts and 2 of diamonds come out, both jokers go in. The jokers are the two highest cards and count as spades.',
}

/** Cards absent from the wild deck, so four hands of 13 come out even once jokers are in. */
export const REMOVED_CARDS: { suit: Suit; rank: number }[] = [
  { suit: 'hearts', rank: 2 },
  { suit: 'diamonds', rank: 2 },
]

/**
 * A taken trick is a BOOK at this table, which is what the rules text says throughout.
 * The code still calls them tricks internally — renaming the stored fields would strand
 * every saved game — so this is the one place the two words are deliberately different.
 */
function commonRules(mode: SpadesMode): string[] {
  return [
    'Bid the number of books you expect to take, then play them out',
    'Make the bid for 10 points a book, plus 1 point for every book over',
    'Miss it and you are SET: no points for the hand, but nothing is taken away',
    'Nil is 100 points for taking no books at all, and nothing if you take one',
    'Books over your bid are bags — every 10 bags costs 100, the only thing that lowers a score',
    mode === 'partners'
      ? `First side to ${targetFor(mode)} wins`
      : `First to ${targetFor(mode)} wins`,
  ]
}

export function rulesFor(variant: SpadesVariant, mode: SpadesMode = 'partners'): string[] {
  const deckRules = variant === 'wild'
    ? [
        'Wild Style deck: the 2 of hearts and 2 of diamonds are removed, two jokers added',
        'Big Joker (H, colored) is the highest card; Little Joker (L, black and white) is next',
        'Both jokers count as spades',
        'The first hand bids itself — every seat is bid from its own cards',
      ]
    : [
        'Classic deck: an ordinary 52-card pack, no jokers',
        'The ace of spades is the highest card',
      ]
  const modeRules = mode === 'partners'
    ? [
        'Partners sit opposite; your two bids add up to one contract and you score together',
        `Board is ${BOARD}: a side's two bids have to reach ${BOARD} between them`,
        'Nil is open to the first bidder, and after that only if your partner already made board',
      ]
    : ['No partners — you bid alone and score alone']
  // Being set costs no points, so in Wild Style these are what a set actually costs. Stated
  // up front: a side can lose on hand one, and that cannot be a surprise.
  const wildLossRules = variant === 'wild' && mode === 'partners'
    ? [
        'Get set on the first hand and the other side takes the game',
        'Get set two hands running, or three times in all, and you lose',
      ]
    : []
  return [...deckRules, ...modeRules, ...commonRules(mode), ...wildLossRules]
}

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

/** 52 cards either way — that equality is what keeps the deal even across both variants. */
export function makeDeck(variant: SpadesVariant = 'wild'): Card[] {
  const deck: Card[] = []
  const wild = variant === 'wild'
  for (const suit of SUITS) {
    for (let rank = 2; rank <= 14; rank++) {
      // The red twos are only removed to make room for the jokers, so classic keeps them.
      if (wild && REMOVED_CARDS.some(r => r.suit === suit && r.rank === rank)) continue
      deck.push({ kind: 'pip', suit, rank })
    }
  }
  if (wild) {
    deck.push({ kind: 'joker', joker: 'big' })
    deck.push({ kind: 'joker', joker: 'little' })
  }
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
export function deal(variant: SpadesVariant = 'wild', rng: () => number = Math.random): Card[][] {
  const deck = shuffle(makeDeck(variant), rng)
  const hands: Card[][] = [[], [], [], []]
  for (let i = 0; i < deck.length; i++) hands[i % PLAYER_COUNT]!.push(deck[i]!)
  return hands.map((h) => sortHand(h))
}

/**
 * How a player wants their hand laid out. Purely presentational — it has no bearing on
 * what is legal to play, so two people at one table can hold the same hand differently.
 */
export interface HandSortPrefs {
  /** Suits, left to right. */
  suitOrder: Suit[]
  /** Low card first within a suit. */
  ascending: boolean
  /** Gather the jokers at the right edge instead of leaving them among the spades. */
  jokersLast: boolean
}

export const DEFAULT_HAND_SORT: HandSortPrefs = {
  suitOrder: ['hearts', 'clubs', 'diamonds', 'spades'],
  ascending: true,
  jokersLast: true,
}

/** Group by suit in the player's own order, ordered by rank inside each suit. */
export function sortHand(hand: Card[], prefs: HandSortPrefs = DEFAULT_HAND_SORT): Card[] {
  // A partial or corrupt stored order would silently drop suits off the end of the hand.
  const order = prefs.suitOrder?.length === SUITS.length ? prefs.suitOrder : DEFAULT_HAND_SORT.suitOrder
  const group = (c: Card) => {
    // Jokers play as spades, but they are their own block when asked for.
    if (prefs.jokersLast && c.kind === 'joker') return order.length
    return order.indexOf(effectiveSuit(c))
  }
  const dir = prefs.ascending ? 1 : -1
  return [...hand].sort((a, b) => {
    const ga = group(a), gb = group(b)
    if (ga !== gb) return ga - gb
    return (strength(a) - strength(b)) * dir
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
  /** Points gained this hand, excluding the bag penalty. Never negative. */
  points: number
  /** Bags accrued this hand. */
  bags: number
}

/**
 * Score one side's hand. `bid` is the combined contract; `nilBids` are the individual nil
 * declarations, scored separately because a nil neither helps nor hurts the contract.
 *
 * House rules, and the reason nothing here can return a negative number:
 *   - made the bid  → 10 a book, plus 1 for each bag
 *   - missed it     → SET, worth nothing at all
 *   - nil made      → +100
 *   - nil broken    → nothing
 *
 * The sandbag penalty is applied separately by `applyBagPenalty`, and is the only thing in
 * the game that can take points off a total.
 */
export function scoreSide(
  bid: number,
  tricks: number,
  nilBids: { nil: boolean; tricks: number }[] = [],
): SideResult {
  let points = 0
  // A nil is scored on its own, so a partner's blown contract cannot cancel a made nil.
  for (const n of nilBids) {
    if (n.nil && n.tricks === 0) points += 100
  }
  if (bid === 0) return { points, bags: 0 }

  if (tricks >= bid) {
    const bags = tricks - bid
    return { points: points + bid * 10 + bags, bags }
  }
  // Set. The hand simply scores nothing — no bid is ever charged back.
  return { points, bags: 0 }
}

/**
 * Apply the sandbagging penalty. Bags roll over rather than reset to zero, so a side that
 * lands on 12 keeps 2 against the next penalty. This is the one place a score can fall,
 * and the one route to a negative total.
 */
export function applyBagPenalty(totalBags: number): { score: number; bags: number } {
  const penalties = Math.floor(totalBags / BAG_PENALTY_AT)
  // Subtract from zero rather than negating: `-0 * 100` is -0, which renders as "-0".
  return { score: 0 - penalties * BAG_PENALTY, bags: totalBags % BAG_PENALTY_AT }
}

/**
 * Which side has won, or null if the game continues. Works for two sides or four.
 *
 * Reaching the target is not enough on its own — a side has to be clear of everyone else.
 * Several crossing in the same hand is normal (bags and nils move every total), and a tie
 * at the top plays on rather than declaring an arbitrary winner.
 */
export function winnerTeamFor(
  scores: number[],
  target: number = WINNING_SCORE,
): number | null {
  let best = -Infinity
  let bestIdx = -1
  let tiedAtTop = false
  scores.forEach((s, i) => {
    if (s > best) { best = s; bestIdx = i; tiedAtTop = false }
    else if (s === best) tiedAtTop = true
  })
  if (best < target) return null
  if (tiedAtTop) return null
  return bestIdx
}
