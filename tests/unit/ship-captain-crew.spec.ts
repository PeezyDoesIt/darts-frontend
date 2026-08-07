import { describe, expect, it } from 'vitest'
import { cargoScore, claimFromRoll, isComplete, needLabel } from '@/lib/shipCaptainCrew'

/**
 * The ordering rule is the whole game: a 5 is worthless until the 6 is held. These tests
 * exist because a greedy "claim anything you see" implementation passes casual play-testing
 * and only shows up as a wrong score once someone rolls the faces out of order.
 */
describe('claimFromRoll', () => {
  it('claims the ship first and nothing else without it', () => {
    const r = claimFromRoll([5, 4, 3, 2, 1], 0)

    expect(r.stage).toBe(0)
    expect(r.claimed).toEqual([])
    // the 5 and 4 are NOT consumed — they are worthless until the ship is aboard
    expect(r.remaining).toEqual([5, 4, 3, 2, 1])
  })

  it('claims ship, captain and crew from a single roll when all are present', () => {
    const r = claimFromRoll([6, 5, 4, 3, 2], 0)

    expect(r.stage).toBe(3)
    expect(r.claimed).toEqual([6, 5, 4])
    expect(r.remaining).toEqual([3, 2])
  })

  it('claims only as far as the order allows', () => {
    // has the ship and the crew but no captain — the crew cannot come aboard yet
    const r = claimFromRoll([6, 4, 4, 2, 1], 0)

    expect(r.stage).toBe(1)
    expect(r.claimed).toEqual([6])
    expect(r.remaining).toEqual([4, 4, 2, 1])
  })

  it('consumes one die per claim, leaving duplicates as cargo', () => {
    const r = claimFromRoll([6, 6, 5, 4, 3], 0)

    expect(r.stage).toBe(3)
    // the spare 6 survives as cargo — worth 6 points, not consumed by the claim
    expect(r.remaining).toEqual([6, 3])
  })

  it('resumes from a partial stage carried in from an earlier roll', () => {
    const r = claimFromRoll([5, 4, 2, 1, 1], 1)   // ship already held

    expect(r.stage).toBe(3)
    expect(r.claimed).toEqual([5, 4])
    expect(r.remaining).toEqual([2, 1, 1])
  })

  it('claims nothing more once the crew is aboard', () => {
    const r = claimFromRoll([6, 5, 4], 3)

    expect(r.stage).toBe(3)
    expect(r.claimed).toEqual([])
    expect(r.remaining).toEqual([6, 5, 4])
  })
})

describe('cargoScore', () => {
  it('is zero for an incomplete turn however good the dice look', () => {
    // two sixes showing, but no crew — this is the rule players argue about
    expect(cargoScore(2, [6, 6])).toBe(0)
    expect(cargoScore(0, [6, 6, 5, 5, 4])).toBe(0)
  })

  it('totals the remaining dice once complete', () => {
    expect(cargoScore(3, [6, 5])).toBe(11)
    expect(cargoScore(3, [1, 1])).toBe(2)
  })
})

describe('stage helpers', () => {
  it('reports completion only at three claims', () => {
    expect(isComplete(2)).toBe(false)
    expect(isComplete(3)).toBe(true)
  })

  it('labels what the player still needs, and nothing once on cargo', () => {
    expect(needLabel(0)).toBe('Ship (6)')
    expect(needLabel(1)).toBe('Captain (5)')
    expect(needLabel(2)).toBe('Crew (4)')
    expect(needLabel(3)).toBeNull()
  })
})
