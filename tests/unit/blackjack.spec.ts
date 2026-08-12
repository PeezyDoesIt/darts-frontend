import { describe, expect, it } from 'vitest'
import {
  BLACKJACK, buildDeck, buildShoe, cardValue, dealerShouldHit, handValue,
  isBlackjack, isBust, payoutMultiplier, settle, shuffle, type PipCard,
} from '../../src/lib/blackjack'

/** Terse hand builder: c(14) is an ace, c(13) a king. Suit is irrelevant to every rule here. */
const c = (rank: number, suit: PipCard['suit'] = 'spades'): PipCard => ({ kind: 'pip', suit, rank })
const hand = (...ranks: number[]) => ranks.map(r => c(r))

describe('cardValue', () => {
  it('counts pips at face value', () => {
    expect(cardValue(c(2))).toBe(2)
    expect(cardValue(c(10))).toBe(10)
  })

  it('counts every court card as ten', () => {
    expect(cardValue(c(11))).toBe(10)
    expect(cardValue(c(12))).toBe(10)
    expect(cardValue(c(13))).toBe(10)
  })

  it('counts an ace as eleven, leaving handValue to demote it', () => {
    expect(cardValue(c(14))).toBe(11)
  })
})

describe('handValue', () => {
  it('adds a hard hand', () => {
    expect(handValue(hand(10, 7))).toEqual({ total: 17, soft: false })
  })

  it('keeps an ace at eleven when it fits', () => {
    expect(handValue(hand(14, 6))).toEqual({ total: 17, soft: true })
  })

  it('demotes the ace rather than busting', () => {
    // A + 6 + 10 is seventeen, not twenty-seven.
    expect(handValue(hand(14, 6, 10))).toEqual({ total: 17, soft: false })
  })

  it('demotes only as many aces as it has to', () => {
    // Two aces: one stays at eleven, the other drops to one.
    expect(handValue(hand(14, 14))).toEqual({ total: 12, soft: true })
  })

  it('demotes every ace when even one at eleven would bust', () => {
    expect(handValue(hand(14, 14, 10))).toEqual({ total: 12, soft: false })
  })

  it('handles four aces', () => {
    expect(handValue(hand(14, 14, 14, 14))).toEqual({ total: 14, soft: true })
  })

  it('is zero for an empty hand', () => {
    expect(handValue([])).toEqual({ total: 0, soft: false })
  })
})

describe('isBlackjack', () => {
  it('is an ace and a ten on the first two cards', () => {
    expect(isBlackjack(hand(14, 13))).toBe(true)
    expect(isBlackjack(hand(14, 10))).toBe(true)
  })

  it('is not twenty-one reached with three cards', () => {
    // The distinction pays three to two, so it is worth asserting rather than assuming.
    expect(handValue(hand(7, 7, 7)).total).toBe(BLACKJACK)
    expect(isBlackjack(hand(7, 7, 7))).toBe(false)
  })

  it('is not a two-card twenty', () => {
    expect(isBlackjack(hand(13, 10))).toBe(false)
  })
})

describe('isBust', () => {
  it('is over twenty-one', () => {
    expect(isBust(hand(13, 12, 10))).toBe(true)
  })

  it('is not exactly twenty-one', () => {
    expect(isBust(hand(14, 13))).toBe(false)
  })

  it('is not a soft hand that would only bust counting the ace high', () => {
    expect(isBust(hand(14, 6, 10))).toBe(false)
  })
})

describe('dealerShouldHit', () => {
  it('hits below seventeen', () => {
    expect(dealerShouldHit(hand(10, 6))).toBe(true)
  })

  it('stands on seventeen', () => {
    expect(dealerShouldHit(hand(10, 7))).toBe(false)
  })

  it('stands on a soft seventeen', () => {
    // The house rule here is stand-on-all-seventeens, so A+6 stands.
    expect(dealerShouldHit(hand(14, 6))).toBe(false)
  })

  it('hits a soft sixteen', () => {
    expect(dealerShouldHit(hand(14, 5))).toBe(true)
  })
})

describe('settle', () => {
  it('gives a busted player the loss even when the dealer busts too', () => {
    // This ordering is the house edge. Getting it wrong quietly hands the edge to the player.
    expect(settle(hand(13, 12, 10), hand(13, 12, 10))).toBe('bust')
  })

  it('pays blackjack', () => {
    expect(settle(hand(14, 13), hand(10, 9))).toBe('blackjack')
  })

  it('pushes blackjack against blackjack', () => {
    expect(settle(hand(14, 13), hand(14, 10))).toBe('push')
  })

  it('loses to a dealer blackjack', () => {
    expect(settle(hand(13, 10), hand(14, 13))).toBe('lose')
  })

  it('beats three-card twenty-one with a two-card blackjack', () => {
    expect(settle(hand(14, 13), hand(7, 7, 7))).toBe('blackjack')
  })

  it('wins when the dealer busts', () => {
    expect(settle(hand(10, 8), hand(13, 12, 10))).toBe('win')
  })

  it('compares totals otherwise', () => {
    expect(settle(hand(10, 9), hand(10, 8))).toBe('win')
    expect(settle(hand(10, 7), hand(10, 8))).toBe('lose')
    expect(settle(hand(10, 8), hand(10, 8))).toBe('push')
  })

  it('pushes on equal totals reached differently', () => {
    expect(settle(hand(14, 9), hand(13, 10))).toBe('push')
  })
})

describe('payoutMultiplier', () => {
  it('pays blackjack three to two, stake included', () => {
    expect(payoutMultiplier('blackjack')).toBe(2.5)
  })

  it('pays an ordinary win even money', () => {
    expect(payoutMultiplier('win')).toBe(2)
  })

  it('returns the stake on a push', () => {
    expect(payoutMultiplier('push')).toBe(1)
  })

  it('returns nothing on a loss or a bust', () => {
    expect(payoutMultiplier('lose')).toBe(0)
    expect(payoutMultiplier('bust')).toBe(0)
  })
})

describe('buildDeck', () => {
  it('is fifty-two cards', () => {
    expect(buildDeck()).toHaveLength(52)
  })

  it('deals no jokers', () => {
    // The shared card model has them for Wild spades; blackjack must never see one.
    expect(buildDeck().every(card => card.kind === 'pip')).toBe(true)
  })

  it('has four of every rank and thirteen of every suit', () => {
    const deck = buildDeck()
    for (let rank = 2; rank <= 14; rank++) {
      expect(deck.filter(x => x.rank === rank)).toHaveLength(4)
    }
    for (const suit of ['spades', 'hearts', 'diamonds', 'clubs'] as const) {
      expect(deck.filter(x => x.suit === suit)).toHaveLength(13)
    }
  })

  it('holds sixteen ten-valued cards', () => {
    expect(buildDeck().filter(x => cardValue(x) === 10)).toHaveLength(16)
  })
})

describe('shuffle', () => {
  it('does not mutate the input', () => {
    const deck = buildDeck()
    const before = deck.map(x => `${x.suit}${x.rank}`).join()
    shuffle(deck, () => 0.5)
    expect(deck.map(x => `${x.suit}${x.rank}`).join()).toBe(before)
  })

  it('keeps every card', () => {
    const deck = buildDeck()
    const out = shuffle(deck, () => 0.42)
    expect(out).toHaveLength(deck.length)
    expect(new Set(out.map(x => `${x.suit}${x.rank}`)).size).toBe(52)
  })

  it('is deterministic for a given source of randomness', () => {
    const seeded = () => { let n = 1; return () => ((n = (n * 1103515245 + 12345) % 2147483648) / 2147483648) }
    const a = shuffle(buildDeck(), seeded())
    const b = shuffle(buildDeck(), seeded())
    expect(a.map(x => `${x.suit}${x.rank}`)).toEqual(b.map(x => `${x.suit}${x.rank}`))
  })
})

describe('buildShoe', () => {
  it('is one deck by default', () => {
    expect(buildShoe(1, () => 0.5)).toHaveLength(52)
  })

  it('multiplies decks', () => {
    const shoe = buildShoe(6, () => 0.5)
    expect(shoe).toHaveLength(312)
    expect(shoe.filter(x => x.rank === 14)).toHaveLength(24)
  })
})
