import { beforeEach, describe, expect, it, vi, afterEach } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { useThreeManStore } from '../../src/stores/threeMan'
import type { Player } from '../../src/types/index'

/**
 * Three Man's rules engine.
 *
 * Every other game here is covered by a smoke test that plays it. That does not work for this
 * one: the interesting rules — double threes passing the hat, a total of 3 counting as a three
 * — cannot be reached by playing, only waited for. A smoke test would roll a few times, see a
 * plausible screen and pass without ever touching them.
 *
 * So the dice are pinned instead. `roll(a, b)` stubs Math.random so the next throw is exactly
 * the pair named, which turns "wait for a 3-3" into a line of test.
 */

function player(id: string, name: string): Player {
  return {
    id, name, color: '#ff2d78', avatarUrl: null,
    playerBackground: null, playerBackgroundSize: null, playerBackgroundPosition: null,
    playerBackgroundZoom: null, playerBackgroundFill: null,
    throwBackground: null, walkupBackground: null,
    targetLabelColor: null, pipColor: null, pipStyle: null,
    cricketTargetDisplay: null, diceTheme: null,
    pinned: false, wins: 0, gamesPlayed: 0, createdAt: new Date().toISOString(),
  } as unknown as Player
}

const A = player('a', 'Ana')
const B = player('b', 'Ben')
const C = player('c', 'Cal')

/**
 * Pin the next roll. The store draws two values with `Math.ceil(Math.random() * 6)`, so a
 * value of (n - 0.5) / 6 lands on n without sitting on a boundary where a rounding change
 * would silently move the result.
 */
function pinDice(pairs: Array<[number, number]>) {
  const seq = pairs.flat().map(n => (n - 0.5) / 6)
  let i = 0
  vi.spyOn(Math, 'random').mockImplementation(() => seq[i++] ?? 0.5)
}

function freshStore() {
  setActivePinia(createPinia())
  const store = useThreeManStore()
  store.startGame([A, B, C])
  return store
}

function sipsOf(store: ReturnType<typeof freshStore>, id: string) {
  return store.game!.players.find(p => p.id === id)!.sips
}

beforeEach(() => { localStorage.clear() })
afterEach(() => { vi.restoreAllMocks() })

describe('finding the Three Man', () => {
  it('nobody holds it until a three is rolled', () => {
    const s = freshStore()
    expect(s.game!.threeManId).toBeNull()
    pinDice([[2, 5]])
    s.rollDice()
    expect(s.game!.threeManId).toBeNull()
  })

  it('the first three hands the job to whoever rolled it, and they take it', () => {
    const s = freshStore()
    pinDice([[3, 5]])
    s.rollDice()
    expect(s.game!.threeManId).toBe('a')
    expect(sipsOf(s, 'a')).toBe(1)
  })
})

describe('threes', () => {
  it('counts a total of three, not just a face', () => {
    // 1 + 2 is a three by the traditional rule and is easy to drop when implementing.
    const s = freshStore()
    pinDice([[1, 2]])
    s.rollDice()
    expect(s.game!.threeManId).toBe('a')
    expect(sipsOf(s, 'a')).toBe(1)
  })

  it('does not double-count: a single 3 face is worth one, not two', () => {
    const s = freshStore()
    pinDice([[3, 6]])
    s.rollDice()
    expect(sipsOf(s, 'a')).toBe(1)
  })

  it('sends threes to the Three Man, not the roller', () => {
    const s = freshStore()
    pinDice([[3, 5]])        // Ana takes the job
    s.rollDice()
    s.pass()
    pinDice([[3, 6]])        // Ben rolls a three
    s.rollDice()
    expect(sipsOf(s, 'a')).toBe(2)  // Ana pays for it
    expect(sipsOf(s, 'b')).toBe(0)
  })
})

describe('double threes', () => {
  it('passes the hat and charges the new holder, not the old one', () => {
    /*
     * The ordering that makes this roll worth rolling. Ana holds it; Ben rolls 3-3, becomes
     * the Three Man, and takes both — counting before the handover would bill Ana for the
     * roll that freed her.
     */
    const s = freshStore()
    pinDice([[3, 5]])
    s.rollDice()
    s.pass()
    expect(s.game!.threeManId).toBe('a')
    const anaBefore = sipsOf(s, 'a')

    pinDice([[3, 3]])
    s.rollDice()
    expect(s.game!.threeManId).toBe('b')
    expect(sipsOf(s, 'a')).toBe(anaBefore)
    expect(sipsOf(s, 'b')).toBe(2)
  })
})

describe('neighbours', () => {
  it('7 goes left and 11 the other way', () => {
    const s = freshStore()
    pinDice([[3, 5]])
    s.rollDice()          // Ana is Three Man, still Ana's turn
    s.pass()              // Ben rolls
    pinDice([[3, 4]])     // total 7 → left of Ben is Cal
    s.rollDice()
    expect(sipsOf(s, 'c')).toBe(1)
  })
})

describe('doubles', () => {
  it('are handed out one at a time and then the dice come back', () => {
    const s = freshStore()
    pinDice([[3, 5]])
    s.rollDice()
    s.pass()

    pinDice([[4, 4]])
    s.rollDice()
    expect(s.game!.phase).toBe('assigning')
    expect(s.game!.pendingAssignment).toBe(4)

    s.assignTo('c'); s.assignTo('c'); s.assignTo('a'); s.assignTo('a')
    expect(sipsOf(s, 'c')).toBe(2)
    expect(s.game!.phase).not.toBe('assigning')
    // doublesRollAgain is on by default, so the table is cleared for another throw.
    expect(s.game!.dice).toBeNull()
    expect(s.canRoll()).toBe(true)
  })

  it('cannot hand out more than were rolled', () => {
    const s = freshStore()
    pinDice([[3, 5]])
    s.rollDice()          // Ana takes the job, and a sip with it
    s.pass()

    /*
     * Measured as a delta, not an absolute.
     *
     * The first roll leaves Ana already holding one, so asserting a total here means the
     * number only reads correctly if you replay the setup in your head — and the first draft
     * of this test duly asserted the wrong one. The claim is "exactly two were handed out",
     * so that is what is compared, and it stays true if the setup above ever changes.
     */
    const before = sipsOf(s, 'a')
    pinDice([[2, 2]])
    s.rollDice()
    expect(s.game!.pendingAssignment).toBe(2)

    s.assignTo('a'); s.assignTo('a')
    expect(s.game!.pendingAssignment).toBe(0)
    // Two more presses after the pile is empty must do nothing at all.
    s.assignTo('a'); s.assignTo('a')
    expect(sipsOf(s, 'a') - before).toBe(2)
  })
})

describe('holding the dice', () => {
  it('a roller cannot throw twice without passing', () => {
    /*
     * The bug this file exists for. Guarding on phase alone left `rolled` open, so the same
     * player could throw repeatedly and re-apply outcomes without the turn ever moving.
     */
    const s = freshStore()
    pinDice([[3, 5]])
    s.rollDice()
    const after = sipsOf(s, 'a')
    expect(s.canRoll()).toBe(false)

    pinDice([[3, 6]])
    s.rollDice()
    expect(sipsOf(s, 'a')).toBe(after)
    expect(s.game!.currentPlayerIndex).toBe(0)
  })

  it('passing gives the next player a clean table', () => {
    const s = freshStore()
    pinDice([[3, 5]])
    s.rollDice()
    s.pass()
    expect(s.game!.currentPlayerIndex).toBe(1)
    expect(s.game!.dice).toBeNull()
    expect(s.game!.outcomes).toHaveLength(0)
    expect(s.canRoll()).toBe(true)
  })
})

describe('leaving', () => {
  it('the job does not leave with the player holding it', () => {
    const s = freshStore()
    pinDice([[3, 5]])
    s.rollDice()
    expect(s.game!.threeManId).toBe('a')
    s.leaveGame('a')
    expect(s.game!.threeManId).toBeNull()
    expect(s.game!.phase).toBe('seeking')
    expect(s.game!.players).toHaveLength(2)
  })

  it('refuses to empty the table', () => {
    const s = freshStore()
    s.leaveGame('a'); s.leaveGame('b')
    expect(s.game!.players).toHaveLength(1)
    s.leaveGame('c')
    expect(s.game!.players).toHaveLength(1)
  })
})

describe('sips are a label, not a rule', () => {
  it('points score identically to sips', () => {
    setActivePinia(createPinia())
    const s = useThreeManStore()
    s.startGame([A, B, C], { unit: 'points' })
    pinDice([[3, 5]])
    s.rollDice()
    expect(s.game!.unit).toBe('points')
    expect(sipsOf(s, 'a')).toBe(1)
  })
})
