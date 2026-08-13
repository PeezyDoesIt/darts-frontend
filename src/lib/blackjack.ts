/**
 * Blackjack rules, kept pure so the whole game can be tested without a component.
 *
 * The card model is the one in spades.ts, because PlayingCard.vue already renders that
 * shape — a second Card type would mean a second renderer. Blackjack uses only the pip
 * cards; jokers exist in that model for Wild spades and are never dealt here.
 *
 * Rank is 2..14 with 14 = ace, so the face cards are 11, 12, 13 and all count ten.
 */

import { SUITS, type Card } from './spades'

export const BLACKJACK = 21
/** The dealer stands on all seventeens, soft ones included. */
export const DEALER_STANDS_ON = 17
export const DECK_SIZE = 52

export type Outcome = 'blackjack' | 'win' | 'push' | 'lose' | 'bust'

/** A pip card only — blackjack never deals the jokers that exist for Wild spades. */
export type PipCard = Extract<Card, { kind: 'pip' }>

/** Ace counts eleven here; handValue is what decides when it has to drop to one. */
export function cardValue(card: PipCard): number {
  if (card.rank === 14) return 11
  return card.rank >= 11 ? 10 : card.rank
}

/**
 * A hand's best total, and whether an ace is still counting as eleven.
 *
 * "Soft" matters to the player rather than the arithmetic: a soft seventeen cannot bust on
 * the next card, so it plays nothing like a hard one, and the UI says so.
 */
export function handValue(cards: readonly PipCard[]): { total: number; soft: boolean } {
  let total = 0
  let aces = 0
  for (const c of cards) {
    total += cardValue(c)
    if (c.rank === 14) aces++
  }
  // Every ace started as eleven. Demote them one at a time, and only as far as needed.
  while (total > BLACKJACK && aces > 0) {
    total -= 10
    aces--
  }
  return { total, soft: aces > 0 }
}

export function isBust(cards: readonly PipCard[]): boolean {
  return handValue(cards).total > BLACKJACK
}

/** Twenty-one on the first two cards. Three cards to twenty-one is not blackjack. */
export function isBlackjack(cards: readonly PipCard[]): boolean {
  return cards.length === 2 && handValue(cards).total === BLACKJACK
}

/**
 * The dealer has no choices — this is the whole of their strategy, which is why the house
 * edge comes from the player acting first rather than from anything the dealer does.
 */
export function dealerShouldHit(cards: readonly PipCard[]): boolean {
  return handValue(cards).total < DEALER_STANDS_ON
}

/**
 * Who won. Order matters: busting is checked before anything else, because a player who
 * busts loses even when the dealer goes on to bust as well. That is the house edge.
 */
export function settle(player: readonly PipCard[], dealer: readonly PipCard[]): Outcome {
  if (isBust(player)) return 'bust'

  const playerBJ = isBlackjack(player)
  const dealerBJ = isBlackjack(dealer)
  if (playerBJ && dealerBJ) return 'push'
  if (playerBJ) return 'blackjack'
  if (dealerBJ) return 'lose'

  if (isBust(dealer)) return 'win'

  const p = handValue(player).total
  const d = handValue(dealer).total
  if (p > d) return 'win'
  if (p < d) return 'lose'
  return 'push'
}

/** What a settled hand returns per unit staked, stake included. Blackjack pays three to two. */
export function payoutMultiplier(outcome: Outcome): number {
  switch (outcome) {
    case 'blackjack': return 2.5
    case 'win': return 2
    case 'push': return 1
    default: return 0
  }
}

/** An unshuffled single deck, aces high at 14 to match the shared card model. */
export function buildDeck(): PipCard[] {
  const deck: PipCard[] = []
  for (const suit of SUITS) {
    for (let rank = 2; rank <= 14; rank++) deck.push({ kind: 'pip', suit, rank })
  }
  return deck
}

/**
 * Fisher-Yates, with the source of randomness injectable so a test can deal a known shoe.
 * Returns a new array rather than shuffling in place — a half-shuffled shoe surviving a
 * thrown error is the kind of bug that only shows up as "the cards went weird once".
 */
export function shuffle<T>(cards: readonly T[], rng: () => number = Math.random): T[] {
  const out = [...cards]
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1))
    ;[out[i], out[j]] = [out[j]!, out[i]!]
  }
  return out
}

/** A shoe of `decks` decks, shuffled together. */
export function buildShoe(decks = 1, rng: () => number = Math.random): PipCard[] {
  const cards: PipCard[] = []
  for (let i = 0; i < decks; i++) cards.push(...buildDeck())
  return shuffle(cards, rng)
}
