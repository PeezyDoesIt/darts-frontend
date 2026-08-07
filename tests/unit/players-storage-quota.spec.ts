import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it, vi } from 'vitest'

/**
 * persist() used to call setItem unguarded, so once enough inline photos accumulated the
 * QuotaExceededError propagated out of addPlayer/updatePlayer. The lost data was therefore
 * not a photo but the whole roster — every change since the last successful write vanished
 * on reload.
 *
 * These tests hold the recovery: never throw, keep the roster, drop only the images.
 */
vi.mock('@/lib/supabase', () => ({
  supabase: {
    auth: { getSession: () => Promise.resolve({ data: { session: null } }) },
    from: () => ({
      select: () => ({ order: () => Promise.resolve({ data: [], error: null }) }),
      upsert: () => Promise.resolve({ error: null }),
      delete: () => ({ eq: () => Promise.resolve({ error: null }) }),
    }),
  },
}))

const { usePlayersStore } = await import('@/stores/players')

const BIG_PHOTO = 'data:image/jpeg;base64,' + 'A'.repeat(2048)

function quotaError() {
  const e = new Error('quota') as Error & { name: string }
  e.name = 'QuotaExceededError'
  return e
}

function newStore() {
  localStorage.clear()
  setActivePinia(createPinia())
  return usePlayersStore()
}

describe('persist under storage pressure', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
    vi.spyOn(console, 'warn').mockImplementation(() => {})
  })

  it('does not throw when storage is full', () => {
    const store = newStore()
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw quotaError() })

    // the whole bug: this used to blow up the caller
    expect(() => store.addPlayer({
      name: 'Ann', color: '#fff', avatarUrl: BIG_PHOTO, playerBackground: null,
      playerBackgroundSize: null, playerBackgroundPosition: null, playerBackgroundFill: null,
      targetLabelColor: null, cricketTargetDisplay: null, diceTheme: null, pinned: false,
      updatedAt: null,
    } as never)).not.toThrow()
  })

  it('keeps the player in memory even when the write fails', () => {
    const store = newStore()
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw quotaError() })

    store.addPlayer({
      name: 'Ann', color: '#fff', avatarUrl: BIG_PHOTO, playerBackground: null,
      playerBackgroundSize: null, playerBackgroundPosition: null, playerBackgroundFill: null,
      targetLabelColor: null, cricketTargetDisplay: null, diceTheme: null, pinned: false,
      updatedAt: null,
    } as never)

    expect(store.players.map(p => p.name)).toContain('Ann')
  })

  it('retries without the photos and keeps the roster', () => {
    const store = newStore()
    const writes: string[] = []
    let first = true
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation((_k, v) => {
      // fail only the full-size write, so the fallback is what lands
      if (first) { first = false; throw quotaError() }
      writes.push(String(v))
    })

    store.addPlayer({
      name: 'Ann', color: '#fff', avatarUrl: BIG_PHOTO, playerBackground: null,
      playerBackgroundSize: null, playerBackgroundPosition: null, playerBackgroundFill: null,
      targetLabelColor: null, cricketTargetDisplay: null, diceTheme: null, pinned: false,
      updatedAt: null,
    } as never)

    const saved = writes.map(w => { try { return JSON.parse(w) } catch { return null } })
      .find(v => Array.isArray(v) && v.some(p => p?.name === 'Ann'))

    expect(saved).toBeTruthy()
    // the name survives, the multi-megabyte image does not
    expect(saved.find((p: { name: string }) => p.name === 'Ann').avatarUrl).toBeNull()
  })

  it('flags the degradation so the UI can say the photo was dropped', () => {
    const store = newStore()
    let first = true
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      if (first) { first = false; throw quotaError() }
    })

    expect(store.storageDegraded).toBe(false)
    store.addPlayer({
      name: 'Ann', color: '#fff', avatarUrl: BIG_PHOTO, playerBackground: null,
      playerBackgroundSize: null, playerBackgroundPosition: null, playerBackgroundFill: null,
      targetLabelColor: null, cricketTargetDisplay: null, diceTheme: null, pinned: false,
      updatedAt: null,
    } as never)

    expect(store.storageDegraded).toBe(true)
  })

  it('survives both writes failing', () => {
    const store = newStore()
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw quotaError() })

    expect(() => store.addPlayer({
      name: 'Ann', color: '#fff', avatarUrl: BIG_PHOTO, playerBackground: null,
      playerBackgroundSize: null, playerBackgroundPosition: null, playerBackgroundFill: null,
      targetLabelColor: null, cricketTargetDisplay: null, diceTheme: null, pinned: false,
      updatedAt: null,
    } as never)).not.toThrow()
    expect(store.storageDegraded).toBe(true)
  })

  it('clears the flag once a normal save succeeds again', () => {
    const store = newStore()
    let failing = true
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      if (failing) throw quotaError()
    })

    const player = {
      name: 'Ann', color: '#fff', avatarUrl: BIG_PHOTO, playerBackground: null,
      playerBackgroundSize: null, playerBackgroundPosition: null, playerBackgroundFill: null,
      targetLabelColor: null, cricketTargetDisplay: null, diceTheme: null, pinned: false,
      updatedAt: null,
    } as never
    store.addPlayer(player)
    expect(store.storageDegraded).toBe(true)

    failing = false
    store.addPlayer(player)

    expect(store.storageDegraded).toBe(false)
  })
})
