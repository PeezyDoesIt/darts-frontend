import { describe, expect, it } from 'vitest'
import { chooseCategory, chooseKeeps } from '@/lib/yahtzeeBot'
import { emptyScorecard, type YahtzeeCategory, type YahtzeeScorecard } from '@/stores/yahtzee'

/** A scorecard with the named categories already used up. */
const withTaken = (...taken: YahtzeeCategory[]): YahtzeeScorecard => {
  const sc = emptyScorecard()
  for (const c of taken) sc[c] = 0
  return sc
}

/** Which faces the bot decides to hold, sorted, for readable assertions. */
const kept = (dice: number[], sc: YahtzeeScorecard, rollsLeft: number) => {
  const keeps = chooseKeeps(dice, sc, rollsLeft)
  return dice.filter((_, i) => keeps[i]).sort((a, b) => a - b)
}

describe('chooseKeeps', () => {
  const fresh = emptyScorecard()

  it('keeps a yahtzee rather than breaking it up', () => {
    expect(chooseKeeps([4, 4, 4, 4, 4], fresh, 2)).toEqual([true, true, true, true, true])
  })

  it('keeps a yahtzee even when the yahtzee box is gone, for the bonus', () => {
    const sc = withTaken('yahtzee')

    expect(chooseKeeps([4, 4, 4, 4, 4], sc, 2)).toEqual([true, true, true, true, true])
  })

  it('keeps a made large straight instead of chasing a set', () => {
    expect(chooseKeeps([1, 2, 3, 4, 5], fresh, 1)).toEqual([true, true, true, true, true])
  })

  it('holds four to a straight, which is a one-card draw', () => {
    expect(kept([2, 3, 4, 5, 5], fresh, 1)).toEqual([2, 3, 4, 5])
  })

  it('holds only one of a duplicated face when drawing to a straight', () => {
    // A second 5 does nothing for a run, so it goes back.
    const keeps = chooseKeeps([2, 3, 4, 5, 5], fresh, 1)

    expect(keeps.filter(Boolean)).toHaveLength(4)
  })

  it('stops chasing a straight once both straight boxes are gone', () => {
    const sc = withTaken('smallStraight', 'largeStraight')

    // Falls back to the pair rather than a draw it can no longer use.
    expect(kept([2, 3, 4, 5, 5], sc, 1)).toEqual([5, 5])
  })

  it('does not chase a straight on the last roll, when there is no draw left', () => {
    expect(kept([2, 3, 4, 5, 5], fresh, 0)).toEqual([5, 5])
  })

  it('keeps a made full house', () => {
    expect(chooseKeeps([3, 3, 3, 6, 6], fresh, 1)).toEqual([true, true, true, true, true])
  })

  it('breaks a full house up when that box is gone, keeping the triple', () => {
    const sc = withTaken('fullHouse')

    expect(kept([3, 3, 3, 6, 6], sc, 1)).toEqual([3, 3, 3])
  })

  it('chases the biggest set it holds', () => {
    expect(kept([5, 5, 5, 2, 3], fresh, 2)).toEqual([5, 5, 5])
  })

  it('prefers the higher face when two sets are the same size', () => {
    // Same number of dice is worth more on sixes than on twos.
    expect(kept([2, 2, 6, 6, 3], fresh, 2)).toEqual([6, 6])
  })

  it('holds a lone high die, which is worth something on its own', () => {
    expect(kept([6, 1, 2, 3, 5], withTaken('smallStraight', 'largeStraight'), 2)).toEqual([6])
  })
})

describe('chooseCategory', () => {
  it('takes the highest scoring box on the board', () => {
    // 30 in sixes beats 12 in chance-style alternatives.
    expect(chooseCategory([6, 6, 6, 6, 6], withTaken('yahtzee'))).toBe('sixes')
  })

  it('takes yahtzee when it is there', () => {
    expect(chooseCategory([4, 4, 4, 4, 4], emptyScorecard())).toBe('yahtzee')
  })

  it('takes a large straight rather than scattering it into chance', () => {
    expect(chooseCategory([1, 2, 3, 4, 5], emptyScorecard())).toBe('largeStraight')
  })

  it('never picks a box that is already used', () => {
    const sc = withTaken('largeStraight')
    const picked = chooseCategory([1, 2, 3, 4, 5], sc)

    expect(picked).not.toBe('largeStraight')
    expect(sc[picked]).toBeNull()
  })

  it('leans on an upper box that keeps the 63 bonus alive', () => {
    // Three fives is 15 on the card against 18 in chance, but it is par for the bonus, so
    // the bonus it protects is worth more than the three points given up.
    expect(chooseCategory([5, 5, 5, 1, 2], withTaken('threeOfAKind'))).toBe('fives')
  })

  it('still takes a bigger box over the bonus nudge when there is one', () => {
    // 5-5-5-1-1 is a full house: 25 beats fives' 15, bonus lean and all.
    expect(chooseCategory([5, 5, 5, 1, 1], withTaken('threeOfAKind'))).toBe('fullHouse')
  })

  it('sacrifices the cheapest box when nothing scores', () => {
    // No pair, no run: ones is the least damaging zero available.
    const sc = emptyScorecard()
    sc.chance = 20

    expect(chooseCategory([2, 3, 4, 6, 6], withTaken('chance', 'twos', 'threes', 'fours', 'sixes', 'fullHouse', 'threeOfAKind', 'fourOfAKind', 'smallStraight', 'largeStraight', 'fives')))
      .toBe('aces')
  })

  it('protects chance to the last, since it always scores something', () => {
    const openOnly = (...open: YahtzeeCategory[]) => {
      const sc = emptyScorecard()
      for (const c of ['aces', 'twos', 'threes', 'fours', 'fives', 'sixes', 'threeOfAKind',
        'fourOfAKind', 'fullHouse', 'smallStraight', 'largeStraight', 'yahtzee', 'chance'] as YahtzeeCategory[]) {
        if (!open.includes(c)) sc[c] = 0
      }
      return sc
    }

    // Both open, nothing scores in yahtzee — burn that rather than chance.
    expect(chooseCategory([1, 2, 4, 5, 6], openOnly('yahtzee', 'chance'))).toBe('chance')
  })

  it('always returns something, even with one box left', () => {
    const sc = withTaken('aces', 'twos', 'threes', 'fours', 'fives', 'sixes', 'threeOfAKind',
      'fourOfAKind', 'fullHouse', 'smallStraight', 'largeStraight', 'yahtzee')

    expect(chooseCategory([1, 1, 2, 3, 4], sc)).toBe('chance')
  })
})
