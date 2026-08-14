import { describe, expect, it } from 'vitest'
import { CRICKET_GAME_TYPES, isCricketGame } from '../../src/types/index'

/**
 * Which games count as cricket.
 *
 * This was written out by hand at every decision that needed it — roughly twenty of them
 * across five files — and it drifted. The walk-up screen's copy omitted Speed Cricket, so
 * that game got the 01 games' layout and put the player's avatar in the opposite corner from
 * Cricket's. Both shipped. The list lives in one place now, and this pins its membership.
 */

describe('isCricketGame', () => {
  it('accepts every member of the family', () => {
    expect(isCricketGame('cricket')).toBe(true)
    expect(isCricketGame('speedCricket')).toBe(true)
  })

  it('rejects the 01 games', () => {
    for (const t of ['301', '501', '701', '1001'] as const) {
      expect(isCricketGame(t), t).toBe(false)
    }
  })

  it('rejects the other darts games', () => {
    for (const t of ['aroundTheClock', 'killer', 'halveit', 'baseball', 'horse', 'suddenDeath'] as const) {
      expect(isCricketGame(t), t).toBe(false)
    }
  })

  it('rejects the non-darts games', () => {
    for (const t of ['farkle', 'shipCaptainCrew', 'pig', 'spades', 'blackjack'] as const) {
      expect(isCricketGame(t), t).toBe(false)
    }
  })

  it('tolerates no game at all', () => {
    // Callers reach for this off an optional active game, so null and undefined are ordinary
    // inputs rather than mistakes.
    expect(isCricketGame(null)).toBe(false)
    expect(isCricketGame(undefined)).toBe(false)
  })

  it('agrees with the exported list', () => {
    for (const t of CRICKET_GAME_TYPES) expect(isCricketGame(t), t).toBe(true)
    // Two, not three: Cut Throat was removed. It had a label and a place in this family but
    // no rules anywhere — its whole point is that hits score against your opponents, and
    // this cricket never scores points at all.
    expect(CRICKET_GAME_TYPES).toHaveLength(2)
  })
})
