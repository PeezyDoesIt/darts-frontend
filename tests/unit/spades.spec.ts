import { describe, expect, it } from 'vitest'
import {
  applyBagPenalty, cardId, cardLabel, deal, effectiveSuit, isTrump, legalPlays, makeDeck,
  rulesFor, scoreSide, sortHand, strength, trickWinner, winnerTeamFor, type Card,
} from '@/lib/spades'

const pip = (suit: 'spades' | 'hearts' | 'diamonds' | 'clubs', rank: number): Card =>
  ({ kind: 'pip', suit, rank })
const BIG: Card = { kind: 'joker', joker: 'big' }
const LITTLE: Card = { kind: 'joker', joker: 'little' }

/** Deterministic RNG so a deal can be asserted on. */
function seeded(seed: number) {
  let s = seed
  return () => { s = (s * 1103515245 + 12345) % 2147483648; return s / 2147483648 }
}

describe('the Wild Style deck', () => {
  const deck = makeDeck('wild')

  it('is 52 cards — 50 pips plus two jokers', () => {
    expect(deck).toHaveLength(52)
    expect(deck.filter(c => c.kind === 'joker')).toHaveLength(2)
    expect(deck.filter(c => c.kind === 'pip')).toHaveLength(50)
  })

  it('has no two of hearts and no two of diamonds', () => {
    expect(deck.some(c => cardId(c) === 'hearts-2')).toBe(false)
    expect(deck.some(c => cardId(c) === 'diamonds-2')).toBe(false)
  })

  it('keeps the two of spades and the two of clubs', () => {
    // only the red twos come out — pulling all four would break the 13-card deal
    expect(deck.some(c => cardId(c) === 'spades-2')).toBe(true)
    expect(deck.some(c => cardId(c) === 'clubs-2')).toBe(true)
  })

  it('has exactly one of every card', () => {
    expect(new Set(deck.map(cardId)).size).toBe(52)
  })

  it('deals four even hands of thirteen using every card', () => {
    const hands = deal('wild', seeded(7))

    expect(hands).toHaveLength(4)
    for (const h of hands) expect(h).toHaveLength(13)
    expect(new Set(hands.flat().map(cardId)).size).toBe(52)
  })
})

describe('the Classic deck', () => {
  const deck = makeDeck('classic')

  it('is an ordinary 52-card pack with no jokers', () => {
    expect(deck).toHaveLength(52)
    expect(deck.filter(c => c.kind === 'joker')).toHaveLength(0)
  })

  it('keeps both red twos, which only come out to make room for jokers', () => {
    expect(deck.some(c => cardId(c) === 'hearts-2')).toBe(true)
    expect(deck.some(c => cardId(c) === 'diamonds-2')).toBe(true)
  })

  it('has thirteen of every suit', () => {
    for (const suit of ['spades', 'hearts', 'diamonds', 'clubs'] as const) {
      expect(deck.filter(c => c.kind === 'pip' && c.suit === suit)).toHaveLength(13)
    }
  })

  it('deals four even hands of thirteen', () => {
    const hands = deal('classic', seeded(3))

    for (const h of hands) expect(h).toHaveLength(13)
    expect(new Set(hands.flat().map(cardId)).size).toBe(52)
  })

  it('makes the ace of spades the highest card in the deck', () => {
    const best = deck.reduce((a, b) => (isTrump(b) && strength(b) > strength(a) ? b : a), deck[0]!)

    expect(cardId(best)).toBe('spades-14')
  })

  it('is the same size as Wild Style — which is why both deal evenly', () => {
    expect(makeDeck('classic')).toHaveLength(makeDeck('wild').length)
  })
})

describe('rulesFor', () => {
  it('describes the joker deck only for Wild Style', () => {
    expect(rulesFor('wild').join(' ')).toContain('jokers')
    expect(rulesFor('classic').join(' ')).toContain('no jokers')
    expect(rulesFor('classic').join(' ')).toContain('ace of spades is the highest')
  })

  it('carries the shared scoring rules in both', () => {
    for (const v of ['classic', 'wild'] as const) {
      expect(rulesFor(v).join(' ')).toContain('First side to 500')
      expect(rulesFor(v).join(' ')).toContain('bags')
    }
  })
})

describe('the jokers', () => {
  it('labels the big joker H and the little joker L', () => {
    expect(cardLabel(BIG)).toBe('H')
    expect(cardLabel(LITTLE)).toBe('L')
  })

  it('counts both jokers as spades', () => {
    expect(effectiveSuit(BIG)).toBe('spades')
    expect(effectiveSuit(LITTLE)).toBe('spades')
  })

  it('ranks big above little above the ace of spades', () => {
    expect(strength(BIG)).toBeGreaterThan(strength(LITTLE))
    expect(strength(LITTLE)).toBeGreaterThan(strength(pip('spades', 14)))
  })

  it('beats the ace of spades in an actual trick', () => {
    expect(trickWinner([pip('spades', 14), LITTLE, pip('spades', 13), pip('hearts', 14)], 'spades')).toBe(1)
    expect(trickWinner([LITTLE, BIG], 'spades')).toBe(1)
  })

  it('lets a joker trump a side suit', () => {
    expect(trickWinner([pip('hearts', 14), pip('hearts', 3), BIG, pip('hearts', 13)], 'hearts')).toBe(2)
  })

  it('cannot be played on a side suit while the hand can still follow', () => {
    const hand = [BIG, LITTLE, pip('hearts', 5)]

    expect(legalPlays(hand, 'hearts', true).map(cardId)).toEqual(['hearts-5'])
  })
})

describe('trickWinner', () => {
  it('gives the trick to the highest card of the led suit', () => {
    expect(trickWinner([pip('clubs', 9), pip('clubs', 14), pip('clubs', 3)], 'clubs')).toBe(1)
  })

  it('ignores high cards in suits nobody led', () => {
    // the ace of diamonds is worthless here — it neither follows nor trumps
    expect(trickWinner([pip('clubs', 4), pip('diamonds', 14), pip('clubs', 5)], 'clubs')).toBe(2)
  })

  it('lets any trump beat any non-trump', () => {
    expect(trickWinner([pip('hearts', 14), pip('spades', 2)], 'hearts')).toBe(1)
  })

  it('takes the highest trump when several are played', () => {
    expect(trickWinner([pip('hearts', 14), pip('spades', 2), pip('spades', 11)], 'hearts')).toBe(2)
  })
})

describe('legalPlays', () => {
  const hand = [pip('spades', 5), pip('hearts', 9), pip('hearts', 2), pip('clubs', 7)]

  it('forces following suit when able', () => {
    expect(legalPlays(hand, 'hearts', false).map(cardId)).toEqual(['hearts-9', 'hearts-2'])
  })

  it('frees the hand when void in the led suit', () => {
    expect(legalPlays(hand, 'diamonds', false)).toHaveLength(4)
  })

  it('bars leading spades until they are broken', () => {
    expect(legalPlays(hand, null, false).some(c => effectiveSuit(c) === 'spades')).toBe(false)
    expect(legalPlays(hand, null, true)).toHaveLength(4)
  })

  it('allows leading spades when the hand holds nothing else', () => {
    // without this escape a player holding only trump could not legally move
    const trumpOnly = [pip('spades', 5), BIG]

    expect(legalPlays(trumpOnly, null, false)).toHaveLength(2)
  })
})

describe('scoring', () => {
  it('pays ten a trick for a made bid, plus a bag for each extra', () => {
    expect(scoreSide(4, 4)).toEqual({ points: 40, bags: 0 })
    expect(scoreSide(4, 6)).toEqual({ points: 42, bags: 2 })
  })

  it('takes ten a trick for a missed bid, with no bags', () => {
    expect(scoreSide(5, 3)).toEqual({ points: -50, bags: 0 })
  })

  it('pays 100 for a made nil and takes 100 for a broken one', () => {
    expect(scoreSide(0, 0, [{ nil: true, tricks: 0 }]).points).toBe(100)
    expect(scoreSide(0, 1, [{ nil: true, tricks: 1 }]).points).toBe(-100)
  })

  it('scores a nil independently of the partner contract', () => {
    // partner bid 4 and made it; the nil succeeded alongside
    const r = scoreSide(4, 4, [{ nil: true, tricks: 0 }])

    expect(r.points).toBe(140)
  })

  it('costs 100 at ten bags and rolls the remainder over', () => {
    expect(applyBagPenalty(9)).toEqual({ score: 0, bags: 9 })
    expect(applyBagPenalty(10)).toEqual({ score: -100, bags: 0 })
    // landing on 12 keeps 2 against the next penalty rather than wiping them
    expect(applyBagPenalty(12)).toEqual({ score: -100, bags: 2 })
  })
})

describe('sortHand', () => {
  it('puts trump first, strongest first, with the jokers at the very top', () => {
    const sorted = sortHand([pip('hearts', 5), pip('spades', 3), LITTLE, BIG, pip('clubs', 9)])

    expect(sorted.slice(0, 3).map(cardLabel)).toEqual(['H', 'L', '3'])
  })
})

describe('winning the game', () => {
  it('keeps playing while both sides are under 500', () => {
    expect(winnerTeamFor([499, 210])).toBeNull()
    expect(winnerTeamFor([0, 0])).toBeNull()
  })

  it('is won at exactly 500, not 501', () => {
    expect(winnerTeamFor([500, 210])).toBe(0)
  })

  it('gives it to whichever side crossed, either seat pairing', () => {
    expect(winnerTeamFor([512, 340])).toBe(0)
    expect(winnerTeamFor([340, 512])).toBe(1)
  })

  it('gives it to the higher side when both cross in the same hand', () => {
    // Nils and bag penalties move both totals, so both crossing at once is ordinary.
    expect(winnerTeamFor([505, 530])).toBe(1)
  })

  it('plays another hand when both cross level, rather than picking a winner', () => {
    expect(winnerTeamFor([510, 510])).toBeNull()
  })

  it('does not hand it to a side sitting on a negative score', () => {
    expect(winnerTeamFor([-40, 220])).toBeNull()
  })
})
