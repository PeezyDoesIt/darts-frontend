import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it, vi } from 'vitest'

/**
 * Regression tests for deleted players coming back.
 *
 * The bug: `deletePlayer` removes the player locally and then tries the cloud delete, which
 * opens with `if (!session) return` — so a delete made while signed out, offline, or before
 * a session had restored on a cold load never reached Postgres. Nothing recorded that it had
 * been asked for, so `syncFromCloud`'s last pass, which treats a cloud row with no local
 * match as "added on another device", merged the player straight back in. Every sign-in
 * resurrected everyone ever deleted offline.
 *
 * It was not only a nuisance: each resurrected player arrived carrying its inline photo, and
 * enough of them pushed the roster past the localStorage quota, which is what put the
 * "Photos dropped" warning on the home screen.
 *
 * These tests drive the real store against a fake client that can hold cloud rows, so the
 * assertion is about behaviour — does the player come back — rather than about which
 * functions were called.
 */
const sent: { op: string; id?: string }[] = []
const getSession = vi.fn()
/** Rows the fake cloud is holding. */
let cloudRows: Record<string, unknown>[] = []
/** Set to make the fake reject deletes, standing in for offline or a permissions error. */
let deleteFails = false

function row(id: string, name: string) {
  return {
    id, name, color: '#ff2d78', avatar_url: null, avatar_path: null,
    wins: 0, games_played: 0, pinned: false,
    created_at: '2026-01-01T00:00:00.000Z', updated_at: '2026-01-01T00:00:00.000Z',
  }
}

vi.mock('@/lib/supabase', () => ({
  supabase: {
    auth: { getSession: () => getSession() },
    from: () => ({
      upsert: () => Promise.resolve({ error: null }),
      delete: () => {
        let target: string | undefined
        const builder = {
          eq(_col: string, value: string) { target = value; return builder },
          then(onFulfilled: (v: { error: unknown }) => unknown) {
            sent.push({ op: 'delete', id: target })
            if (!deleteFails) cloudRows = cloudRows.filter(r => r.id !== target)
            return Promise.resolve({ error: deleteFails ? { message: 'offline' } : null })
              .then(onFulfilled)
          },
        }
        return builder
      },
      select: () => ({ order: () => Promise.resolve({ data: cloudRows, error: null }) }),
    }),
  },
}))

vi.mock('@/api/avatarStorage', () => ({
  deleteAvatar: vi.fn(async () => {}),
  signAvatars: vi.fn(async () => ({})),
  uploadAvatar: vi.fn(async () => null),
  isDataUrl: (v: unknown) => typeof v === 'string' && v.startsWith('data:'),
  isRemoteUrl: (v: unknown) => typeof v === 'string' && v.startsWith('http'),
}))

const { usePlayersStore } = await import('@/stores/players')

const signedIn = () =>
  getSession.mockResolvedValue({ data: { session: { user: { id: 'u-1' } } } })
const signedOut = () => getSession.mockResolvedValue({ data: { session: null } })
const flush = () => new Promise(r => setTimeout(r, 20))

function storeHolding(...ids: { id: string; name: string }[]) {
  localStorage.setItem('darts_players', JSON.stringify(ids.map(p => ({
    ...p, color: '#fff', avatarUrl: null, wins: 0, gamesPlayed: 0, pinned: false,
    createdAt: '2026-01-01T00:00:00.000Z', updatedAt: '2026-01-01T00:00:00.000Z',
  }))))
  setActivePinia(createPinia())
  return usePlayersStore()
}

describe('players store — a deleted player stays deleted', () => {
  beforeEach(() => {
    localStorage.clear()
    sent.length = 0
    cloudRows = []
    deleteFails = false
    getSession.mockReset()
    vi.spyOn(console, 'warn').mockImplementation(() => {})
  })

  it('does not resurrect a player deleted while signed out', async () => {
    cloudRows = [row('p-1', 'Ghost')]
    signedOut()
    const store = storeHolding({ id: 'p-1', name: 'Ghost' })

    store.deletePlayer('p-1')
    await flush()
    expect(sent).toEqual([])            // nothing could be sent — that is the situation

    // Sign in later. This is the moment the player used to walk back in.
    signedIn()
    await store.syncFromCloud()

    expect(store.players.map(p => p.id)).toEqual([])
    expect(sent).toEqual([{ op: 'delete', id: 'p-1' }])
  })

  it('clears the record once the server confirms, so the list cannot grow forever', async () => {
    cloudRows = [row('p-1', 'Ghost')]
    signedOut()
    const store = storeHolding({ id: 'p-1', name: 'Ghost' })
    store.deletePlayer('p-1')
    await flush()
    expect(localStorage.getItem('darts_players_deleted_v1')).toContain('p-1')

    signedIn()
    await store.syncFromCloud()

    expect(localStorage.getItem('darts_players_deleted_v1')).not.toContain('p-1')
  })

  it('keeps trying while the delete keeps failing', async () => {
    cloudRows = [row('p-1', 'Ghost')]
    signedOut()
    const store = storeHolding({ id: 'p-1', name: 'Ghost' })
    store.deletePlayer('p-1')
    await flush()

    signedIn()
    deleteFails = true
    await store.syncFromCloud()
    // Still gone from the roster, and the intent is still on file for the next attempt.
    expect(store.players).toHaveLength(0)
    expect(localStorage.getItem('darts_players_deleted_v1')).toContain('p-1')

    deleteFails = false
    await store.syncFromCloud()
    expect(localStorage.getItem('darts_players_deleted_v1')).not.toContain('p-1')
    expect(store.players).toHaveLength(0)
  })

  it('still accepts a player genuinely added on another device', async () => {
    // The guard has to suppress deleted rows WITHOUT suppressing the case it looks like.
    cloudRows = [row('p-new', 'Sam')]
    signedIn()
    const store = storeHolding()

    await store.syncFromCloud()

    expect(store.players.map(p => p.name)).toEqual(['Sam'])
    expect(sent.filter(s => s.op === 'delete')).toEqual([])
  })
})
