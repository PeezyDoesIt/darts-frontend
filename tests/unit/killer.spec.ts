import { describe, expect, it } from 'vitest'
import { assignNumbers, resolveKillerTurn, survivors, type KillerSeat } from '@/lib/killer'

/**
 * Killer shipped as a picker tile with no logic at all — it dealt a generic running total
 * and could never end. These tests pin the real rules, above all the one that makes the
 * game a game: a player who is not yet a Killer cannot take anyone's lives.
 */
const seat = (id: string, number: number, lives = 3, isKiller = false): KillerSeat =>
  ({ playerId: id, number, lives, isKiller })

const TABLE = () => [seat('a', 20), seat('b', 5), seat('c', 12)]

describe('resolveKillerTurn', () => {
  it('promotes the actor when they hit their own number', () => {
    const r = resolveKillerTurn(TABLE(), 'a', { 20: 1 })

    expect(r.becameKiller).toBe(true)
    expect(r.seats.find(s => s.playerId === 'a')!.isKiller).toBe(true)
  })

  it('does nothing when a non-Killer hits someone else', () => {
    // the whole point of the game — you must earn your badge first
    const r = resolveKillerTurn(TABLE(), 'a', { 5: 3 })

    expect(r.livesTaken).toEqual([])
    expect(r.seats.find(s => s.playerId === 'b')!.lives).toBe(3)
    expect(r.wasted).toBe(3)
  })

  it('takes one life per mark once the actor is a Killer', () => {
    const table = [seat('a', 20, 3, true), seat('b', 5), seat('c', 12)]
    const r = resolveKillerTurn(table, 'a', { 5: 2 })

    expect(r.seats.find(s => s.playerId === 'b')!.lives).toBe(1)
    expect(r.livesTaken).toEqual([{ playerId: 'b', lives: 2 }])
  })

  it('counts opponent hits on the same turn the badge is earned', () => {
    // three darts are one turn, not three ordered events — this is the reading players expect
    const r = resolveKillerTurn(TABLE(), 'a', { 20: 1, 5: 1 })

    expect(r.becameKiller).toBe(true)
    expect(r.seats.find(s => s.playerId === 'b')!.lives).toBe(2)
  })

  it('eliminates a player reduced to zero and never past it', () => {
    const table = [seat('a', 20, 3, true), seat('b', 5, 2), seat('c', 12)]
    const r = resolveKillerTurn(table, 'a', { 5: 5 })

    expect(r.seats.find(s => s.playerId === 'b')!.lives).toBe(0)
    expect(r.eliminated).toEqual(['b'])
    // only the 2 lives that existed are taken, not all 5 marks
    expect(r.livesTaken).toEqual([{ playerId: 'b', lives: 2 }])
  })

  it('wastes hits on an already-eliminated player', () => {
    const table = [seat('a', 20, 3, true), seat('b', 5, 0), seat('c', 12)]
    const r = resolveKillerTurn(table, 'a', { 5: 2 })

    expect(r.livesTaken).toEqual([])
    expect(r.wasted).toBe(2)
    expect(r.eliminated).toEqual([])
  })

  it('wastes hits on a number nobody owns', () => {
    const table = [seat('a', 20, 3, true), seat('b', 5), seat('c', 12)]
    const r = resolveKillerTurn(table, 'a', { 17: 3 })

    expect(r.livesTaken).toEqual([])
    expect(r.wasted).toBe(3)
  })

  it('never lets the actor damage themselves', () => {
    const table = [seat('a', 20, 3, true), seat('b', 5), seat('c', 12)]
    const r = resolveKillerTurn(table, 'a', { 20: 3 })

    expect(r.seats.find(s => s.playerId === 'a')!.lives).toBe(3)
    expect(r.livesTaken).toEqual([])
  })

  it('takes lives from several players in one turn', () => {
    const table = [seat('a', 20, 3, true), seat('b', 5), seat('c', 12)]
    const r = resolveKillerTurn(table, 'a', { 5: 1, 12: 2 })

    expect(r.seats.find(s => s.playerId === 'b')!.lives).toBe(2)
    expect(r.seats.find(s => s.playerId === 'c')!.lives).toBe(1)
  })

  it('ignores a turn from a player who is already out', () => {
    const table = [seat('a', 20, 0, true), seat('b', 5), seat('c', 12)]
    const r = resolveKillerTurn(table, 'a', { 5: 2 })

    expect(r.seats.find(s => s.playerId === 'b')!.lives).toBe(3)
  })

  it('leaves the table untouched for an empty turn', () => {
    const r = resolveKillerTurn(TABLE(), 'a', {})

    expect(r.becameKiller).toBe(false)
    expect(r.seats).toEqual(TABLE())
  })

  it('does not mutate the seats it was given', () => {
    const table = [seat('a', 20, 3, true), seat('b', 5)]
    resolveKillerTurn(table, 'a', { 5: 2 })

    expect(table.find(s => s.playerId === 'b')!.lives).toBe(3)
  })
})

describe('assignNumbers', () => {
  const rng = (() => { let s = 42; return () => { s = (s * 1103515245 + 12345) % 2147483648; return s / 2147483648 } })()

  it('gives every player a distinct number in range', () => {
    const got = assignNumbers(['a', 'b', 'c', 'd'], rng)!
    const nums = Object.values(got)

    expect(nums).toHaveLength(4)
    expect(new Set(nums).size).toBe(4)
    for (const n of nums) expect(n).toBeGreaterThanOrEqual(1)
    for (const n of nums) expect(n).toBeLessThanOrEqual(20)
  })

  it('refuses more players than there are numbers', () => {
    // silently duplicating a number would make two players share a life pool
    const ids = Array.from({ length: 21 }, (_, i) => `p${i}`)

    expect(assignNumbers(ids, rng)).toBeNull()
    expect(assignNumbers([], rng)).toBeNull()
  })
})

describe('survivors', () => {
  it('counts only players with lives left', () => {
    expect(survivors([seat('a', 20, 0), seat('b', 5, 1)]).map(s => s.playerId)).toEqual(['b'])
  })
})
