import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { Player } from '@/types/index'

/**
 * syncFromCloud used to set `players = [...cloudPlayers, ...localOnly]`, so for any player
 * present on both sides the cloud copy won unconditionally. Play a night on the tablet
 * while signed in on a phone and whichever device wrote last silently erased the other's
 * games. These tests pin the recency merge that replaced it.
 */
let cloudRows: Record<string, unknown>[] = []
const pushed: string[] = []
const getSession = vi.fn()

vi.mock('@/lib/supabase', () => ({
  supabase: {
    auth: { getSession: () => getSession() },
    from: () => ({
      select: () => ({ order: () => Promise.resolve({ data: cloudRows, error: null }) }),
      upsert: (row: Record<string, unknown>) => {
        pushed.push(row.id as string)
        return Promise.resolve({ error: null })
      },
      delete: () => ({ eq: () => Promise.resolve({ error: null }) }),
    }),
  },
}))

const { usePlayersStore } = await import('@/stores/players')

const iso = (min: number) => new Date(Date.UTC(2026, 0, 1, 0, min)).toISOString()

function localPlayer(over: Partial<Player> = {}): Player {
  return {
    id: 'p1', name: 'Local Name', color: '#fff', avatarUrl: null, playerBackground: null,
    playerBackgroundSize: null, playerBackgroundPosition: null, playerBackgroundFill: null,
    targetLabelColor: null, cricketTargetDisplay: null, diceTheme: null, pinned: false,
    wins: 5, gamesPlayed: 10, createdAt: iso(0), updatedAt: iso(10), ...over,
  }
}
function cloudRow(over: Record<string, unknown> = {}) {
  return {
    id: 'p1', user_id: 'u1', name: 'Cloud Name', color: '#000', avatar_url: null,
    player_background: null, player_background_size: null, player_background_position: null,
    player_background_fill: null, target_label_color: null, cricket_target_display: null,
    dice_theme: null, pinned: false, wins: 2, games_played: 4,
    created_at: iso(0), updated_at: iso(5), ...over,
  }
}

async function sync(local: Player[], cloud: Record<string, unknown>[]) {
  localStorage.clear()
  localStorage.setItem('darts_players', JSON.stringify(local))
  cloudRows = cloud
  pushed.length = 0
  setActivePinia(createPinia())
  const store = usePlayersStore()
  await store.syncFromCloud()
  return store
}

describe('syncFromCloud — recency merge', () => {
  beforeEach(() => {
    getSession.mockResolvedValue({ data: { session: { user: { id: 'u1' } } } })
    vi.spyOn(console, 'warn').mockImplementation(() => {})
  })

  it('keeps the local record when it is newer, and pushes it up', async () => {
    // local edited at :10, cloud last written at :05 — this is the case that used to
    // silently lose a night of games
    const store = await sync([localPlayer({ updatedAt: iso(10), wins: 5 })], [cloudRow({ updated_at: iso(5), wins: 2 })])

    expect(store.players[0]!.wins).toBe(5)
    expect(store.players[0]!.name).toBe('Local Name')
    expect(pushed).toContain('p1')
  })

  it('takes the cloud record when it is newer', async () => {
    const store = await sync([localPlayer({ updatedAt: iso(1), wins: 5 })], [cloudRow({ updated_at: iso(9), wins: 2 })])

    expect(store.players[0]!.wins).toBe(2)
    expect(store.players[0]!.name).toBe('Cloud Name')
    expect(pushed).not.toContain('p1')
  })

  it('prefers cloud on an exact tie, since it is the shared copy', async () => {
    const store = await sync([localPlayer({ updatedAt: iso(7) })], [cloudRow({ updated_at: iso(7) })])

    expect(store.players[0]!.name).toBe('Cloud Name')
  })

  it('treats an unstamped local record as older than a stamped cloud one', async () => {
    // legacy rows written before updatedAt existed must not beat real history
    const store = await sync([localPlayer({ updatedAt: null, wins: 5 })], [cloudRow({ updated_at: iso(1), wins: 2 })])

    expect(store.players[0]!.wins).toBe(2)
  })

  it('keeps players that exist only locally, and pushes them', async () => {
    const store = await sync([localPlayer({ id: 'only-local' })], [])

    expect(store.players.map(p => p.id)).toEqual(['only-local'])
    expect(pushed).toContain('only-local')
  })

  it('keeps players that exist only in the cloud — added on another device', async () => {
    const store = await sync([], [cloudRow({ id: 'only-cloud' })])

    expect(store.players.map(p => p.id)).toEqual(['only-cloud'])
  })

  it('merges both sides rather than replacing one with the other', async () => {
    const store = await sync(
      [localPlayer({ id: 'mine', createdAt: iso(2) })],
      [cloudRow({ id: 'theirs', created_at: iso(1) })]
    )

    // ordered by createdAt, and neither side dropped
    expect(store.players.map(p => p.id)).toEqual(['theirs', 'mine'])
  })
})
