import { describe, expect, it } from 'vitest'
import {
  BOARD, applyBagPenalty, applyHandToSide, cardId, cardLabel, deal, effectiveSuit, isTrump,
  legalPlays, makeDeck, minBidFor, nilAllowedFor, rulesFor, scoreSide, sideCount, sideOf,
  sortHand, strength, targetFor, trickWinner, wildLossTeam, winnerTeamFor, type Card,
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

  it('calls a taken trick a book, which is what the table calls it', () => {
    for (const v of ['classic', 'wild'] as const) {
      expect(rulesFor(v).join(' ')).toMatch(/books/i)
      expect(rulesFor(v).join(' ')).not.toMatch(/tricks/i)
    }
  })

  it('says a set costs nothing rather than points', () => {
    const rules = rulesFor('wild').join(' ')

    expect(rules).toMatch(/SET/)
    expect(rules).toMatch(/nothing is taken away/i)
  })

  it('states board only for partnerships, since solo has no board', () => {
    expect(rulesFor('classic', 'partners').join(' ')).toContain(`Board is ${BOARD}`)
    expect(rulesFor('classic', 'solo').join(' ')).not.toContain('Board is')
  })

  it('names the solo target, which is lower than the partnership one', () => {
    expect(rulesFor('classic', 'solo').join(' ')).toContain('First to 300')
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

/**
 * House scoring. A set is worth nothing at all rather than costing the bid, and the bag
 * penalty is the only thing anywhere in the game that can take points off a side.
 */
describe('scoring', () => {
  it('pays ten a book for a made bid, plus a bag for each extra', () => {
    expect(scoreSide(4, 4)).toEqual({ points: 40, bags: 0 })
    expect(scoreSide(4, 6)).toEqual({ points: 42, bags: 2 })
  })

  it('scores a set as nothing, without charging the bid back', () => {
    expect(scoreSide(5, 3)).toEqual({ points: 0, bags: 0 })
    expect(scoreSide(13, 0)).toEqual({ points: 0, bags: 0 })
  })

  it('gives a set no bags either — those only come from books over the bid', () => {
    expect(scoreSide(6, 2).bags).toBe(0)
  })

  it('pays 100 for a made nil and nothing for a broken one', () => {
    expect(scoreSide(0, 0, [{ nil: true, tricks: 0 }]).points).toBe(100)
    expect(scoreSide(0, 1, [{ nil: true, tricks: 1 }]).points).toBe(0)
  })

  it('scores a nil independently of the partner contract', () => {
    // partner bid 4 and made it; the nil succeeded alongside
    const r = scoreSide(4, 4, [{ nil: true, tricks: 0 }])

    expect(r.points).toBe(140)
  })

  it('still pays a made nil when the partner was set, since the two are scored apart', () => {
    // This is why the end-of-hand verdict cannot say "no points" on every set.
    const r = scoreSide(5, 3, [{ nil: true, tricks: 0 }])

    expect(r.points).toBe(100)
  })

  it('never returns a negative number from any combination', () => {
    const cases: [number, number, { nil: boolean; tricks: number }[]][] = [
      [5, 0, []],
      [0, 3, [{ nil: true, tricks: 3 }]],
      [7, 1, [{ nil: true, tricks: 2 }]],
      [13, 12, []],
    ]
    for (const [bid, books, nils] of cases) {
      expect(scoreSide(bid, books, nils).points).toBeGreaterThanOrEqual(0)
    }
  })

  it('costs 100 at ten bags and rolls the remainder over', () => {
    expect(applyBagPenalty(9)).toEqual({ score: 0, bags: 9 })
    expect(applyBagPenalty(10)).toEqual({ score: -100, bags: 0 })
    // landing on 12 keeps 2 against the next penalty rather than wiping them
    expect(applyBagPenalty(12)).toEqual({ score: -100, bags: 2 })
  })
})

/** Board: a side's contract is either 0 — both partners nil — or at least BOARD. */
describe('board', () => {
  it('lets the first partner to bid go as low as one', () => {
    expect(minBidFor(null)).toBe(1)
  })

  it('holds the second partner to whatever reaches board', () => {
    expect(minBidFor(1)).toBe(3)
    expect(minBidFor(3)).toBe(1)
    expect(minBidFor(4)).toBe(1)
    expect(minBidFor(9)).toBe(1)
  })

  it('makes a nil partner cover board alone', () => {
    expect(minBidFor(0)).toBe(BOARD)
  })

  it('does not apply to solo, where four sides share the same thirteen books', () => {
    expect(minBidFor(1, 'solo')).toBe(1)
    expect(minBidFor(0, 'solo')).toBe(1)
  })

  it('opens nil to the first bidder', () => {
    expect(nilAllowedFor(null)).toBe(true)
  })

  it('keeps double nil legal, because two nils are no contract rather than a short one', () => {
    expect(nilAllowedFor(0)).toBe(true)
  })

  it('closes nil when the partner bid short of board', () => {
    // Otherwise bid ORDER would decide legality: 1 then nil would stand at a contract of 1,
    // while nil then 1 is correctly refused.
    expect(nilAllowedFor(1)).toBe(false)
    expect(nilAllowedFor(3)).toBe(false)
  })

  it('reopens nil once the partner has made board alone', () => {
    expect(nilAllowedFor(BOARD)).toBe(true)
    expect(nilAllowedFor(7)).toBe(true)
  })

  it('never lets a legal pair of bids land a side under board', () => {
    // The first bidder is unconstrained: nil, or anything from 1 up.
    for (let first = 0; first <= 13; first++) {
      for (let second = 0; second <= 13; second++) {
        const secondLegal = second === 0 ? nilAllowedFor(first) : second >= minBidFor(first)
        if (!secondLegal) continue
        const contract = first + second
        // Either nobody took a contract, or the contract makes board.
        expect(contract === 0 || contract >= BOARD).toBe(true)
      }
    }
  })
})

describe('sides', () => {
  it('pairs opposite seats in a partnership game', () => {
    expect([0, 1, 2, 3].map(s => sideOf(s, 'partners'))).toEqual([0, 1, 0, 1])
    expect(sideCount('partners')).toBe(2)
  })

  it('gives every seat its own side in solo', () => {
    expect([0, 1, 2, 3].map(s => sideOf(s, 'solo'))).toEqual([0, 1, 2, 3])
    expect(sideCount('solo')).toBe(4)
  })

  it('sets a lower target for solo, since four sides split the same books', () => {
    expect(targetFor('partners')).toBe(500)
    expect(targetFor('solo')).toBe(300)
    expect(targetFor('solo')).toBeLessThan(targetFor('partners'))
  })
})

describe('sortHand', () => {
  it('lays the hand out in the default order: hearts, clubs, diamonds, spades', () => {
    const sorted = sortHand([
      pip('spades', 3), pip('diamonds', 7), pip('clubs', 9), pip('hearts', 5),
    ])

    expect(sorted.map(effectiveSuit)).toEqual(['hearts', 'clubs', 'diamonds', 'spades'])
  })

  it('runs low to high inside a suit by default', () => {
    const sorted = sortHand([pip('hearts', 9), pip('hearts', 3), pip('hearts', 14)])

    expect(sorted.map(cardLabel)).toEqual(['3', '9', 'A'])
  })

  it('gathers the jokers at the far right, past the spades', () => {
    const sorted = sortHand([pip('hearts', 5), pip('spades', 3), LITTLE, BIG, pip('clubs', 9)])

    expect(sorted.slice(-2).map(cardLabel)).toEqual(['L', 'H'])
  })

  it('follows the player\'s own suit order', () => {
    const sorted = sortHand(
      [pip('hearts', 5), pip('spades', 3), pip('clubs', 9), pip('diamonds', 7)],
      { suitOrder: ['spades', 'diamonds', 'clubs', 'hearts'], ascending: true, jokersLast: true },
    )

    expect(sorted.map(effectiveSuit)).toEqual(['spades', 'diamonds', 'clubs', 'hearts'])
  })

  it('can run high to low instead', () => {
    const sorted = sortHand(
      [pip('hearts', 3), pip('hearts', 14), pip('hearts', 9)],
      { suitOrder: ['hearts', 'clubs', 'diamonds', 'spades'], ascending: false, jokersLast: true },
    )

    expect(sorted.map(cardLabel)).toEqual(['A', '9', '3'])
  })

  it('leaves the jokers among the spades when asked to', () => {
    const sorted = sortHand(
      [BIG, pip('spades', 3), pip('hearts', 5)],
      { suitOrder: ['hearts', 'clubs', 'diamonds', 'spades'], ascending: true, jokersLast: false },
    )

    expect(sorted.map(cardLabel)).toEqual(['5', '3', 'H'])
  })

  it('falls back to the default order rather than dropping a suit from a short one', () => {
    // A stored preference from an older build could be missing a suit; losing cards off the
    // end of somebody's hand is the one outcome that must not happen.
    const hand = [pip('hearts', 5), pip('spades', 3), pip('clubs', 9), pip('diamonds', 7)]
    const sorted = sortHand(hand, {
      suitOrder: ['hearts', 'clubs'], ascending: true, jokersLast: true,
    })

    expect(sorted).toHaveLength(hand.length)
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

  it('reads four sides against the solo target', () => {
    expect(winnerTeamFor([120, 90, 305, 60], targetFor('solo'))).toBe(2)
    expect(winnerTeamFor([120, 90, 299, 60], targetFor('solo'))).toBeNull()
  })

  it('plays on when two solo sides tie at the top', () => {
    expect(winnerTeamFor([310, 90, 310, 60], targetFor('solo'))).toBeNull()
  })
})

/**
 * Wild Style loss conditions. Since a set costs no points, these ARE what a set costs —
 * they apply to partnership games only, because four solo sides get set often enough that a
 * first-hand set would end most games on the spot.
 */
describe('Wild Style loss conditions', () => {
  const none: [number, number] = [0, 0]
  const level: [number, number] = [100, 100]

  it('hands the game to the other side when a side is set on the first hand', () => {
    expect(wildLossTeam(1, [true, false], [1, 0], [1, 0], level)).toBe(0)
    expect(wildLossTeam(1, [false, true], [0, 1], [0, 1], level)).toBe(1)
  })

  it('lets a first-hand set pass on any later hand', () => {
    expect(wildLossTeam(2, [true, false], [1, 0], [1, 0], level)).toBeNull()
  })

  it('loses on two sets in a row', () => {
    expect(wildLossTeam(5, [true, false], [2, 0], [2, 0], level)).toBe(0)
    expect(wildLossTeam(5, [true, false], [1, 0], [1, 0], level)).toBeNull()
  })

  it('loses on three sets however they are spread', () => {
    // Streak of one, so it is the running total that ends it.
    expect(wildLossTeam(9, [true, false], [1, 0], [3, 0], level)).toBe(0)
    expect(wildLossTeam(9, [true, false], [1, 0], [2, 0], level)).toBeNull()
  })

  it('gives it to the higher score when both sides go out together', () => {
    // Both sides can miss their bid on the same hand.
    expect(wildLossTeam(1, [true, true], [1, 1], [1, 1], [80, 120])).toBe(0)
    expect(wildLossTeam(1, [true, true], [1, 1], [1, 1], [120, 80])).toBe(1)
  })

  it('keeps playing when both go out level, rather than ending it arbitrarily', () => {
    expect(wildLossTeam(1, [true, true], [1, 1], [1, 1], level)).toBeNull()
  })

  it('says nothing while neither side has been set', () => {
    expect(wildLossTeam(1, [false, false], none, none, level)).toBeNull()
  })

  it('reads more than two sides, and drops the lowest of those that went out', () => {
    // Sides 1 and 3 are out on their streaks; side 3 is the lower of the two.
    expect(wildLossTeam(4, [false, true, false, true], [0, 2, 0, 2], [0, 2, 0, 2], [10, 40, 90, 20]))
      .toBe(3)
  })
})

describe('Wild Style rules text', () => {
  it('states the ways a side can lose outright', () => {
    const rules = rulesFor('wild').join(' ')

    expect(rules).toMatch(/first hand/i)
    expect(rules).toMatch(/two hands running|three times/i)
  })

  it('no longer promises a floor, now that bags are allowed to take a side negative', () => {
    expect(rulesFor('wild').join(' ')).not.toMatch(/never drops below zero/i)
  })

  it('leaves classic without the outright-loss rules', () => {
    const rules = rulesFor('classic').join(' ')

    expect(rules).not.toMatch(/two hands running/i)
  })

  it('drops the loss rules in solo, where they would end games on hand one', () => {
    const rules = rulesFor('wild', 'solo').join(' ')

    expect(rules).not.toMatch(/first hand and the other side/i)
    expect(rules).not.toMatch(/two hands running/i)
  })
})

describe('applyHandToSide', () => {
  const start = { score: 0, bags: 0, setCount: 0, setStreak: 0 }

  it('adds nothing for a set, because a set is worth nothing', () => {
    // scoreSide already returns 0 for a missed contract, so there is nothing to floor.
    const next = applyHandToSide(start, { points: 0, bags: 0 }, true)

    expect(next.score).toBe(0)
  })

  it('leaves a winning hand alone', () => {
    const next = applyHandToSide(start, { points: 52, bags: 2 }, false)

    expect(next.score).toBe(52)
    expect(next.bags).toBe(2)
  })

  it('lets the bag penalty take a side below zero, which is the only route there', () => {
    // 9 bags plus 1 crosses 10: a 1-point hand against a 100-point penalty.
    const low = { score: 20, bags: 9, setCount: 0, setStreak: 0 }
    const next = applyHandToSide(low, { points: 11, bags: 1 }, false)

    expect(next.score).toBe(-69)
    expect(next.bags).toBe(0)
  })

  it('treats both variants the same, now that nothing is floored', () => {
    const wild = applyHandToSide(start, { points: 40, bags: 0 }, false, 'wild')
    const classic = applyHandToSide(start, { points: 40, bags: 0 }, false, 'classic')

    expect(wild).toEqual(classic)
  })

  it('counts a set and extends the streak', () => {
    const once = applyHandToSide(start, { points: 0, bags: 0 }, true)
    const twice = applyHandToSide(once, { points: 0, bags: 0 }, true)

    expect(twice.setCount).toBe(2)
    expect(twice.setStreak).toBe(2)
  })

  it('breaks the streak on a made bid but keeps the running total', () => {
    const set = applyHandToSide(start, { points: 0, bags: 0 }, true)
    const made = applyHandToSide(set, { points: 40, bags: 0 }, false)

    expect(made.setCount).toBe(1)
    expect(made.setStreak).toBe(0)
  })

  it('applies the bag penalty and carries the remainder', () => {
    // 9 bags plus 2 more crosses 10: +102 for the hand, -100 penalty, 1 bag carried over.
    const heavy = { score: 200, bags: 9, setCount: 0, setStreak: 0 }
    const next = applyHandToSide(heavy, { points: 102, bags: 2 }, false)

    expect(next.bags).toBe(1)
    expect(next.score).toBe(202)
  })
})
