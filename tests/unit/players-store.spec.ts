import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it } from 'vitest'
import { usePlayersStore } from '@/stores/players'
import type { Player } from '@/types/index'

const STORAGE_KEY = 'darts_players'
const MIGRATION_KEY = 'darts_seed_baseline_removed_v1'

/** A record shaped like the old fabricated seed, with arbitrary counters. */
function legacySeed(wins: number, gamesPlayed: number): Player {
  return {
    id: 'brannon-default',
    name: 'Peezy',
    color: '#e00000',
    avatarUrl: '🎯',
    playerBackground: null,
    playerBackgroundSize: null,
    playerBackgroundPosition: null,
    playerBackgroundFill: null,
    targetLabelColor: null,
    cricketTargetDisplay: 'hide',
    diceTheme: null,
    pinned: true,
    wins,
    gamesPlayed,
    createdAt: '2024-01-01T00:00:00.000Z',
  } as Player
}

/** Construct a fresh store — loadFromStorage() runs on construction. */
function freshStore() {
  setActivePinia(createPinia())
  return usePlayersStore()
}

describe('players store — fabricated seed removal', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('starts with no players on a fresh install', () => {
    const store = freshStore()
    expect(store.players).toEqual([])
  })

  it('does not invent a 100% win rate', () => {
    const store = freshStore()
    expect(store.players.some(p => p.wins === 100 && p.gamesPlayed === 100)).toBe(false)
  })
})

describe('players store — legacy baseline migration', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('subtracts the fabricated baseline while preserving real games', () => {
    // 100 fabricated + 7 real wins, 100 fabricated + 12 real games
    localStorage.setItem(STORAGE_KEY, JSON.stringify([legacySeed(107, 112)]))

    const store = freshStore()

    expect(store.players[0].wins).toBe(7)
    expect(store.players[0].gamesPlayed).toBe(12)
  })

  it('clamps at zero for an untouched seed', () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify([legacySeed(100, 100)]))

    const store = freshStore()

    expect(store.players[0].wins).toBe(0)
    expect(store.players[0].gamesPlayed).toBe(0)
  })

  it('runs exactly once, so counters do not compound across reloads', () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify([legacySeed(107, 112)]))

    freshStore()
    const second = freshStore()
    const third = freshStore()

    expect(second.players[0].wins).toBe(7)
    expect(third.players[0].wins).toBe(7)
    expect(third.players[0].gamesPlayed).toBe(12)
  })

  it('records that the migration ran', () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify([legacySeed(107, 112)]))

    freshStore()

    expect(localStorage.getItem(MIGRATION_KEY)).toBeTruthy()
  })

  it('leaves players other than the seed untouched', () => {
    const normal = { ...legacySeed(9, 20), id: 'someone-else', name: 'Bee' }
    localStorage.setItem(STORAGE_KEY, JSON.stringify([normal]))

    const store = freshStore()

    expect(store.players[0].wins).toBe(9)
    expect(store.players[0].gamesPlayed).toBe(20)
  })

  it('does not migrate again once the flag is present', () => {
    localStorage.setItem(MIGRATION_KEY, new Date(0).toISOString())
    localStorage.setItem(STORAGE_KEY, JSON.stringify([legacySeed(107, 112)]))

    const store = freshStore()

    // already migrated previously — these counters are real, not inflated
    expect(store.players[0].wins).toBe(107)
    expect(store.players[0].gamesPlayed).toBe(112)
  })
})
