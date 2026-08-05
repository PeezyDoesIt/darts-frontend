import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it, vi } from 'vitest'

/**
 * Regression tests for the cloud-sync write path.
 *
 * The bug these exist for: Supabase's query builder is lazy — the HTTP request is only
 * issued when the builder is awaited or `.then()`-ed. The store used to call
 * `supabase.from('players').upsert(...)` and discard the result, so no request was ever
 * sent. Every player edit, win and deletion was silently a no-op against the cloud.
 *
 * The fakes below reproduce that laziness faithfully: `upsert`/`delete` return a thenable
 * that only records a "request" when awaited. A test that passes against these fakes would
 * also pass against the real client.
 */
const sent: { op: string; table: string }[] = []
const getSession = vi.fn()

function lazyBuilder(op: string, table: string) {
  const builder = {
    // only counts as sent when someone awaits it — exactly like PostgrestBuilder
    then(onFulfilled: (v: { error: null }) => unknown) {
      sent.push({ op, table })
      return Promise.resolve({ error: null }).then(onFulfilled)
    },
    eq() { return builder },
  }
  return builder
}

vi.mock('@/lib/supabase', () => ({
  supabase: {
    auth: { getSession: () => getSession() },
    from: (table: string) => ({
      upsert: () => lazyBuilder('upsert', table),
      delete: () => lazyBuilder('delete', table),
      select: () => ({ order: () => Promise.resolve({ data: [], error: null }) }),
    }),
  },
}))

const { usePlayersStore } = await import('@/stores/players')

const signedIn = () =>
  getSession.mockResolvedValue({ data: { session: { user: { id: 'u-1' } } } })
const signedOut = () => getSession.mockResolvedValue({ data: { session: null } })

const flush = () => new Promise(r => setTimeout(r, 20))

function freshStore() {
  setActivePinia(createPinia())
  return usePlayersStore()
}

const newPlayer = { name: 'Al', color: '#ff2d78', avatarUrl: null, playerBackground: null,
  playerBackgroundSize: null, playerBackgroundPosition: null, playerBackgroundFill: null,
  targetLabelColor: null, cricketTargetDisplay: null, diceTheme: null, pinned: false } as never

describe('players store — cloud writes are actually issued', () => {
  beforeEach(() => {
    localStorage.clear()
    sent.length = 0
    getSession.mockReset()
    vi.spyOn(console, 'warn').mockImplementation(() => {})
  })

  it('addPlayer sends an upsert when signed in', async () => {
    signedIn()
    const store = freshStore()

    store.addPlayer(newPlayer)
    await flush()

    expect(sent).toEqual([{ op: 'upsert', table: 'players' }])
  })

  it('updatePlayer sends an upsert when signed in', async () => {
    signedIn()
    const store = freshStore()
    const p = store.addPlayer(newPlayer)
    await flush()
    sent.length = 0

    store.updatePlayer(p.id, { name: 'Alan' })
    await flush()

    expect(sent).toEqual([{ op: 'upsert', table: 'players' }])
  })

  it('recordWin reaches the cloud — the counters the leaderboard depends on', async () => {
    signedIn()
    const store = freshStore()
    const p = store.addPlayer(newPlayer)
    await flush()
    sent.length = 0

    store.recordWin(p.id)
    await flush()

    expect(sent).toEqual([{ op: 'upsert', table: 'players' }])
    expect(store.players[0]!.wins).toBe(1)
  })

  it('deletePlayer sends a delete when signed in', async () => {
    signedIn()
    const store = freshStore()
    const p = store.addPlayer(newPlayer)
    await flush()
    sent.length = 0

    store.deletePlayer(p.id)
    await flush()

    expect(sent).toEqual([{ op: 'delete', table: 'players' }])
  })

  it('sends nothing when signed out, and still updates locally', async () => {
    signedOut()
    const store = freshStore()

    const p = store.addPlayer(newPlayer)
    store.recordWin(p.id)
    await flush()

    expect(sent).toEqual([])
    expect(store.players[0]!.wins).toBe(1)
  })

  it('a failing write never throws into the caller', async () => {
    getSession.mockRejectedValue(new Error('auth exploded'))
    const store = freshStore()

    expect(() => store.addPlayer(newPlayer)).not.toThrow()
    await flush()

    expect(store.players).toHaveLength(1)
  })
})
