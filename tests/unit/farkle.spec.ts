import { describe, expect, it } from 'vitest'
import { bestScore, hasAnyScore, scoreSelection } from '@/lib/farkle'

/**
 * Farkle scoring is the only part of the game a player can argue with, so every rule in
 * RULES has a test here. The null contract matters as much as the numbers: null is what
 * stops a player setting aside a dead die alongside a scoring one.
 */
describe('scoreSelection', () => {
  it('scores loose 1s and 5s', () => {
    expect(scoreSelection([1])).toBe(100)
    expect(scoreSelection([5])).toBe(50)
    expect(scoreSelection([1, 5])).toBe(150)
    expect(scoreSelection([1, 1, 5, 5])).toBe(300)
  })

  it('rejects a selection containing a die that cannot score', () => {
    expect(scoreSelection([2])).toBeNull()
    expect(scoreSelection([1, 2])).toBeNull()   // the 2 is dead weight
    expect(scoreSelection([3, 4])).toBeNull()
  })

  it('scores three of a kind as face x 100, with 1s special', () => {
    expect(scoreSelection([2, 2, 2])).toBe(200)
    expect(scoreSelection([6, 6, 6])).toBe(600)
    expect(scoreSelection([1, 1, 1])).toBe(1000)
  })

  it('doubles the triple for each extra die', () => {
    expect(scoreSelection([2, 2, 2, 2])).toBe(400)
    expect(scoreSelection([2, 2, 2, 2, 2])).toBe(800)
    expect(scoreSelection([2, 2, 2, 2, 2, 2])).toBe(1600)
  })

  it('doubles rather than splitting a group into a triple plus loose 1s and 5s', () => {
    // the split is always worth less, so the group value is the only sensible reading
    expect(scoreSelection([1, 1, 1, 1])).toBe(2000)   // not 1000 + 100
    expect(scoreSelection([5, 5, 5, 5])).toBe(1000)   // not 500 + 50
    expect(scoreSelection([1, 1, 1, 1, 1])).toBe(4000) // not 1000 + 200
  })

  it('scores a straight, three pairs and two triplets', () => {
    expect(scoreSelection([1, 2, 3, 4, 5, 6])).toBe(1500)
    expect(scoreSelection([2, 2, 3, 3, 4, 4])).toBe(1500)
    expect(scoreSelection([2, 2, 2, 3, 3, 3])).toBe(2500)
  })

  it('takes the whole-hand combination when it beats per-face scoring', () => {
    // two triplets scores 2500 as a combo, only 200 + 300 = 500 face by face
    expect(scoreSelection([2, 2, 2, 3, 3, 3])).toBeGreaterThan(500)
    // three pairs of 1s and 5s would score 300 face by face — the combo is worth more
    expect(scoreSelection([1, 1, 5, 5, 2, 2])).toBe(1500)
  })

  it('only allows whole-hand combinations at six dice', () => {
    // a partial straight is not a straight
    expect(scoreSelection([2, 3, 4, 6])).toBeNull()
    expect(scoreSelection([2, 2, 3, 3])).toBeNull()
  })

  it('rejects empty, oversized and invalid input', () => {
    expect(scoreSelection([])).toBeNull()
    expect(scoreSelection([1, 1, 1, 1, 1, 1, 1])).toBeNull()
    expect(scoreSelection([0])).toBeNull()
    expect(scoreSelection([7])).toBeNull()
  })
})

describe('hasAnyScore', () => {
  it('is true when a 1 or 5 is present', () => {
    expect(hasAnyScore([1, 2, 3])).toBe(true)
    expect(hasAnyScore([2, 3, 5])).toBe(true)
  })

  it('is true for a triple with no 1s or 5s', () => {
    expect(hasAnyScore([3, 3, 3, 2, 4, 6])).toBe(true)
  })

  it('is true for a straight and for three pairs', () => {
    expect(hasAnyScore([1, 2, 3, 4, 5, 6])).toBe(true)
    expect(hasAnyScore([2, 2, 3, 3, 4, 4])).toBe(true)
  })

  it('is false for a genuine farkle', () => {
    expect(hasAnyScore([2, 3, 4, 6])).toBe(false)
    expect(hasAnyScore([2, 2, 3, 4])).toBe(false)
    expect(hasAnyScore([2, 2, 3, 3, 4, 6])).toBe(false)
  })

  it('agrees with scoreSelection — anything scoring has a best score above zero', () => {
    // the two are computed independently, so this pins them together
    const rolls = [[1,2,3,4,5,6], [2,3,4,6], [3,3,3,2,4,6], [2,2,3,3,4,4], [2,2,3,4]]
    for (const roll of rolls) {
      expect(bestScore(roll) > 0).toBe(hasAnyScore(roll))
    }
  })
})

describe('bestScore', () => {
  it('finds the best subset rather than requiring all dice to score', () => {
    // the 2s are dead, but the three 1s are worth 1000
    expect(bestScore([1, 1, 1, 2, 2, 4])).toBe(1000)
  })

  it('is zero for a farkle', () => {
    expect(bestScore([2, 3, 4, 6])).toBe(0)
  })
})
