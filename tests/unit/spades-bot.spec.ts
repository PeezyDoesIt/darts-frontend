import { describe, expect, it } from 'vitest'
import { chooseBid, chooseCard, estimateTricks, type PlayContext } from '@/lib/spadesBot'
import { cardId, effectiveSuit, legalPlays, type Card } from '@/lib/spades'

const pip = (suit: 'spades' | 'hearts' | 'diamonds' | 'clubs', rank: number): Card =>
  ({ kind: 'pip', suit, rank })
const BIG: Card = { kind: 'joker', joker: 'big' }
const LITTLE: Card = { kind: 'joker', joker: 'little' }

const ctx = (over: Partial<PlayContext> = {}): PlayContext => ({
  trick: [], seat: 0, partnerSeat: 2, spadesBroken: true, myBid: 3, partnerBid: 3, ...over,
})

/**
 * The bot only has to be sensible and instant, not optimal. These tests pin the decisions
 * a human would immediately call wrong — overtaking your own partner, trumping when you
 * could follow, or taking a trick while bidding nil.
 */
describe('chooseCard — legality', () => {
  it('never returns an illegal card when it must follow suit', () => {
    const hand = [pip('hearts', 4), pip('hearts', 9), BIG, pip('clubs', 3)]
    const c = chooseCard(hand, ctx({ trick: [{ seat: 3, card: pip('hearts', 7) }] }))

    expect(effectiveSuit(c)).toBe('hearts')
  })

  it('never leads a spade before they are broken when it has another option', () => {
    const hand = [BIG, pip('spades', 5), pip('clubs', 9)]
    const c = chooseCard(hand, ctx({ spadesBroken: false }))

    expect(cardId(c)).toBe('clubs-9')
  })

  it('leads a spade when the hand holds nothing else, unbroken or not', () => {
    const hand = [pip('spades', 5), LITTLE]
    const c = chooseCard(hand, ctx({ spadesBroken: false }))

    expect(effectiveSuit(c)).toBe('spades')
  })

  it('always returns a card that legalPlays agrees with', () => {
    const hand = [pip('hearts', 4), pip('spades', 9), pip('clubs', 3), BIG]
    for (const trick of [[], [{ seat: 3, card: pip('clubs', 8) }], [{ seat: 3, card: pip('diamonds', 8) }]]) {
      const c = chooseCard(hand, ctx({ trick }))
      const led = trick.length ? effectiveSuit(trick[0]!.card) : null
      const legal = legalPlays(hand, led, true).map(cardId)

      expect(legal).toContain(cardId(c))
    }
  })
})

describe('chooseCard — tactics', () => {
  it('ducks rather than overtaking a partner who is already winning', () => {
    const hand = [pip('hearts', 13), pip('hearts', 2)]
    // partner (seat 2) leads the ace — taking it off them would waste the king
    const c = chooseCard(hand, ctx({ trick: [{ seat: 2, card: pip('hearts', 14) }] }))

    expect(cardId(c)).toBe('hearts-2')
  })

  it('wins as cheaply as it can rather than smashing the trick', () => {
    const hand = [pip('hearts', 14), pip('hearts', 10), pip('hearts', 3)]
    const c = chooseCard(hand, ctx({ trick: [{ seat: 3, card: pip('hearts', 9) }] }))

    expect(cardId(c)).toBe('hearts-10')
  })

  it('ducks low when it cannot win the suit at all', () => {
    const hand = [pip('hearts', 8), pip('hearts', 3)]
    const c = chooseCard(hand, ctx({ trick: [{ seat: 3, card: pip('hearts', 12) }] }))

    expect(cardId(c)).toBe('hearts-3')
  })

  it('trumps with the cheapest winning spade when void', () => {
    const hand = [BIG, pip('spades', 4), pip('clubs', 2)]
    const c = chooseCard(hand, ctx({ trick: [{ seat: 3, card: pip('hearts', 14) }] }))

    // the 4 of spades already beats a non-trump ace; the big joker is worth keeping
    expect(cardId(c)).toBe('spades-4')
  })

  it('discards junk rather than trumping a partner who is winning', () => {
    const hand = [pip('spades', 9), pip('clubs', 2)]
    const c = chooseCard(hand, ctx({ trick: [{ seat: 2, card: pip('hearts', 14) }] }))

    expect(cardId(c)).toBe('clubs-2')
  })

  it('leads an unbeatable side ace when it has one', () => {
    const hand = [pip('clubs', 14), pip('hearts', 5), pip('spades', 3)]
    const c = chooseCard(hand, ctx())

    expect(cardId(c)).toBe('clubs-14')
  })
})

describe('chooseCard — nil', () => {
  it('stays under the trick when bidding nil', () => {
    const hand = [pip('hearts', 13), pip('hearts', 2)]
    const c = chooseCard(hand, ctx({ myBid: 0, trick: [{ seat: 3, card: pip('hearts', 9) }] }))

    // the king would win the trick and break the nil
    expect(cardId(c)).toBe('hearts-2')
  })

  it('plays the highest losing card, not blindly the lowest', () => {
    // shedding high cards while safe is what makes a nil survivable later
    const hand = [pip('hearts', 10), pip('hearts', 8), pip('hearts', 2)]
    const c = chooseCard(hand, ctx({ myBid: 0, trick: [{ seat: 3, card: pip('hearts', 12) }] }))

    expect(cardId(c)).toBe('hearts-10')
  })

  it('leads its lowest card when bidding nil', () => {
    const hand = [pip('clubs', 14), pip('hearts', 3), pip('diamonds', 9)]
    const c = chooseCard(hand, ctx({ myBid: 0 }))

    expect(cardId(c)).toBe('hearts-3')
  })

  it('takes the trick off a partner who bid nil rather than ducking', () => {
    const hand = [pip('hearts', 14), pip('hearts', 2)]
    const c = chooseCard(hand, ctx({
      partnerBid: 0, trick: [{ seat: 2, card: pip('hearts', 9) }],
    }))

    expect(cardId(c)).toBe('hearts-14')
  })
})

describe('chooseBid', () => {
  const bigHand = [BIG, LITTLE, pip('spades', 14), pip('spades', 13), pip('spades', 7),
    pip('hearts', 14), pip('clubs', 14), pip('diamonds', 14), pip('hearts', 3),
    pip('clubs', 4), pip('diamonds', 5), pip('hearts', 6), pip('clubs', 8)]

  const junkHand = [pip('hearts', 2), pip('hearts', 4), pip('hearts', 6), pip('clubs', 3),
    pip('clubs', 5), pip('clubs', 7), pip('diamonds', 2), pip('diamonds', 4),
    pip('diamonds', 6), pip('diamonds', 8), pip('spades', 2), pip('spades', 3), pip('hearts', 9)]

  it('bids big on a hand full of winners', () => {
    expect(chooseBid(bigHand)).toBeGreaterThanOrEqual(7)
  })

  it('bids nil on a hand with no trump strength and no aces', () => {
    expect(chooseBid(junkHand)).toBe(0)
  })

  it('never bids below 1 on a hand that is not nil-worthy', () => {
    const middling = [pip('spades', 14), pip('spades', 4), pip('hearts', 3), pip('clubs', 5)]

    expect(chooseBid(middling)).toBeGreaterThanOrEqual(1)
  })

  it('never bids more than the hand size', () => {
    expect(chooseBid(bigHand)).toBeLessThanOrEqual(13)
  })

  it('values trump length even without top spades', () => {
    const longTrump = [pip('spades', 9), pip('spades', 8), pip('spades', 7), pip('spades', 6),
      pip('spades', 5), pip('spades', 4), pip('hearts', 2)]
    const shortTrump = [pip('spades', 9), pip('hearts', 2), pip('hearts', 3), pip('clubs', 4)]

    expect(estimateTricks(longTrump)).toBeGreaterThan(estimateTricks(shortTrump))
  })
})
