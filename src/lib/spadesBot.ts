/**
 * Heuristic Spades opponent.
 *
 * Deliberately not a search — a shared-screen bar game needs a partner who plays sensibly
 * and instantly, not one that plays perfectly after two seconds of thinking. Everything
 * here is O(hand size).
 *
 * Kept pure so the two decisions that actually matter — what to bid, and which card to
 * play — can be tested against fixed hands rather than caught by noticing a bot did
 * something stupid mid-game.
 */
import {
  HAND_SIZE, cardId, effectiveSuit, isTrump, legalPlays, strength, bookWinner,
  type Card, type Suit,
} from './spades'

export interface PlayContext {
  /** Cards already played to the current book, in play order with their seats. */
  book: { seat: number; card: Card }[]
  seat: number
  partnerSeat: number
  spadesBroken: boolean
  /** This seat's bid; 0 means nil. Null while still bidding. */
  myBid: number | null
  /** The partner's bid, so a nil partner can be covered. */
  partnerBid: number | null
}

const SIDE_SUITS: Suit[] = ['hearts', 'diamonds', 'clubs']

function bySuit(hand: Card[], suit: Suit): Card[] {
  return hand.filter(c => effectiveSuit(c) === suit).sort((a, b) => strength(b) - strength(a))
}

/**
 * Expected book count for a hand.
 *
 * Trump is counted by position rather than by rank: with two jokers above the ace, the
 * top five spades are near-certain winners, and everything below that is worth counting
 * only as length. Side suits are discounted because they can be trumped.
 */
export function estimateBooks(hand: Card[]): number {
  let books = 0

  const spades = bySuit(hand, 'spades')
  // The five cards that beat everything: both jokers, A, K, Q of spades.
  const topSpades = spades.filter(c => strength(c) >= 12).length
  books += topSpades
  // Length beyond four is worth roughly half a book each — those spades win by trumping
  // once the side suits run dry.
  if (spades.length > 4) books += (spades.length - 4) * 0.5

  for (const suit of SIDE_SUITS) {
    const cards = bySuit(hand, suit)
    if (cards.length === 0) {
      // A void is only worth anything if there is trump left to exploit it with.
      if (spades.length >= 2) books += 0.5
      continue
    }
    const top = strength(cards[0]!)
    if (top === 14) books += 0.9                                   // ace
    else if (top === 13) books += cards.length >= 2 ? 0.6 : 0.25   // king, guarded or bare
    else if (top === 12 && cards.length >= 3) books += 0.25        // queen with cover
    if (cards.length === 1 && spades.length >= 3) books += 0.25    // singleton, can trump next round
  }

  return books
}

/**
 * What the bot bids. Nil is offered only on a hand with no trump strength at all, since a
 * broken nil costs more than a missed low bid.
 */
export function chooseBid(hand: Card[]): number {
  const spades = bySuit(hand, 'spades')
  const estimate = estimateBooks(hand)

  const noHighSpades = spades.every(c => strength(c) < 12)
  const shortTrump = spades.length <= 2
  const noAces = hand.every(c => c.kind === 'joker' ? false : c.rank < 14)
  if (noHighSpades && shortTrump && noAces && estimate < 1.5) return 0

  // Round down rather than to nearest: overbidding costs 10 a book, while an extra book
  // only costs a bag.
  return Math.max(1, Math.min(HAND_SIZE, Math.floor(estimate)))
}

const lowest = (cards: Card[]) => [...cards].sort((a, b) => strength(a) - strength(b))[0]!
const highest = (cards: Card[]) => [...cards].sort((a, b) => strength(b) - strength(a))[0]!

/** Who is currently winning the book, or null on an empty book. */
function currentWinnerSeat(book: { seat: number; card: Card }[]): number | null {
  if (book.length === 0) return null
  const led = effectiveSuit(book[0]!.card)
  const idx = bookWinner(book.map(t => t.card), led)
  return book[idx]?.seat ?? null
}

/**
 * Pick a card to play. Always returns a legal card — the legality filter runs first, so a
 * bug in the heuristics can produce a poor choice but never an illegal one.
 */
export function chooseCard(hand: Card[], ctx: PlayContext): Card {
  const led = ctx.book.length > 0 ? effectiveSuit(ctx.book[0]!.card) : null
  const legal = legalPlays(hand, led, ctx.spadesBroken)
  if (legal.length === 1) return legal[0]!

  const goingNil = ctx.myBid === 0
  const coveringNil = ctx.partnerBid === 0
  const winner = currentWinnerSeat(ctx.book)
  const partnerWinning = winner === ctx.partnerSeat && !coveringNil

  // ── Leading ────────────────────────────────────────────────────────────────
  if (led === null) {
    const sideCards = legal.filter(c => !isTrump(c))
    if (goingNil) {
      // Lead the lowest thing available and hope to be under everyone.
      return lowest(sideCards.length > 0 ? sideCards : legal)
    }
    if (coveringNil) {
      // Lead high to sweep books off the partner before they are forced to take one.
      return highest(sideCards.length > 0 ? sideCards : legal)
    }
    // An unbeatable side ace is the cheapest book available.
    const ace = sideCards.find(c => c.kind === 'pip' && c.rank === 14)
    if (ace) return ace
    // Otherwise lead low from a side suit and keep the trump for later.
    if (sideCards.length > 0) return lowest(sideCards)
    return highest(legal)
  }

  // ── Following ──────────────────────────────────────────────────────────────
  const following = legal.filter(c => effectiveSuit(c) === led)

  if (goingNil) {
    // Stay under the book. Play the highest card that still loses; if everything wins,
    // shed the smallest card and take the hit.
    const pool = following.length > 0 ? following : legal.filter(c => !isTrump(c))
    const candidates = (pool.length > 0 ? pool : legal).filter(c => {
      const probe = [...ctx.book, { seat: ctx.seat, card: c }]
      return currentWinnerSeat(probe) !== ctx.seat
    })
    return candidates.length > 0 ? highest(candidates) : lowest(pool.length > 0 ? pool : legal)
  }

  if (partnerWinning) {
    // Do not overtake a partner who already has it — throw the cheapest legal card.
    const shed = following.length > 0 ? following : legal.filter(c => !isTrump(c))
    return lowest(shed.length > 0 ? shed : legal)
  }

  if (following.length > 0) {
    // Win as cheaply as possible, otherwise duck.
    const winners = following.filter(c => {
      const probe = [...ctx.book, { seat: ctx.seat, card: c }]
      return currentWinnerSeat(probe) === ctx.seat
    })
    return winners.length > 0 ? lowest(winners) : lowest(following)
  }

  // Void in the led suit: trump cheaply if that takes it, else discard the junk.
  const trumps = legal.filter(isTrump)
  const winningTrumps = trumps.filter(c => {
    const probe = [...ctx.book, { seat: ctx.seat, card: c }]
    return currentWinnerSeat(probe) === ctx.seat
  })
  if (winningTrumps.length > 0) return lowest(winningTrumps)

  const discards = legal.filter(c => !isTrump(c))
  return lowest(discards.length > 0 ? discards : legal)
}

/** Stable label so two bots at one table are never both "Computer". */
/** The names a computer seat carries until someone renames it. */
export const DEFAULT_BOT_NAMES = ['Ada', 'Bishop', 'Cleo', 'Dex'] as const

/** Long enough to be a name, short enough to sit in a seat tile without truncating. */
export const MAX_BOT_NAME = 14

export function botName(seat: number): string {
  return DEFAULT_BOT_NAMES[seat] ?? `Bot ${seat + 1}`
}

/**
 * A name a seat can actually wear. Blank falls back to the default rather than leaving a
 * nameless seat, since the board addresses these by name — "Ada is thinking…" with nothing
 * in it reads as a bug.
 */
export function normaliseBotName(raw: string, seat: number): string {
  const trimmed = raw.replace(/\s+/g, ' ').trim()
  if (!trimmed) return botName(seat)
  return trimmed.slice(0, MAX_BOT_NAME)
}

export { cardId }
