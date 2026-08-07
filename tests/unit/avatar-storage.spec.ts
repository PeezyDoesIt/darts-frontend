import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { Player } from '@/types/index'

/**
 * Moving photos into Storage must never be able to lose one. Every failure path here —
 * signed out, upload rejected, signing rejected — has to leave the player holding exactly
 * what they had before, because the data URL in memory is the only copy.
 */
let session: { user: { id: string } } | null = null
const uploaded: { path: string }[] = []
const removed: string[] = []
let uploadError: unknown = null
let signResult: string | null = 'https://signed.example/avatar.jpg'

vi.mock('@/lib/supabase', () => ({
  supabase: {
    auth: { getSession: () => Promise.resolve({ data: { session } }) },
    from: () => ({
      select: () => ({ order: () => Promise.resolve({ data: [], error: null }) }),
      upsert: () => Promise.resolve({ error: null }),
      delete: () => ({ eq: () => Promise.resolve({ error: null }) }),
    }),
    storage: {
      from: () => ({
        upload: (path: string) => {
          if (uploadError) return Promise.resolve({ error: uploadError })
          uploaded.push({ path })
          return Promise.resolve({ error: null })
        },
        createSignedUrl: () => Promise.resolve(
          signResult ? { data: { signedUrl: signResult }, error: null }
                     : { data: null, error: new Error('nope') }
        ),
        createSignedUrls: (paths: string[]) => Promise.resolve({
          data: paths.map(p => ({ path: p, signedUrl: `https://signed.example/${p}` })), error: null,
        }),
        remove: (paths: string[]) => { removed.push(...paths); return Promise.resolve({ error: null }) },
      }),
    },
  },
}))

const { usePlayersStore } = await import('@/stores/players')
const { avatarPathFor, uploadAvatar, signAvatars } = await import('@/api/avatarStorage')

const PHOTO = 'data:image/jpeg;base64,' + btoa('pretend-jpeg-bytes')

const base = {
  name: 'Ann', color: '#fff', avatarUrl: PHOTO, playerBackground: null,
  playerBackgroundSize: null, playerBackgroundPosition: null, playerBackgroundFill: null,
  targetLabelColor: null, cricketTargetDisplay: null, diceTheme: null, pinned: false,
  updatedAt: null,
} as unknown as Omit<Player, 'id' | 'wins' | 'gamesPlayed' | 'createdAt'>

function newStore() {
  localStorage.clear()
  uploaded.length = 0
  removed.length = 0
  uploadError = null
  signResult = 'https://signed.example/avatar.jpg'
  setActivePinia(createPinia())
  return usePlayersStore()
}

const flush = () => new Promise(r => setTimeout(r, 0))

describe('avatarPathFor', () => {
  it('puts the owner in the first path segment, which is what the policies check', () => {
    expect(avatarPathFor('user-1', 'player-9')).toBe('user-1/player-9.jpg')
  })
})

describe('uploadAvatar', () => {
  beforeEach(() => { session = { user: { id: 'user-1' } }; vi.spyOn(console, 'warn').mockImplementation(() => {}) })

  it('refuses anything that is not a data URL', async () => {
    expect(await uploadAvatar('p1', '🎯')).toBeNull()
    expect(await uploadAvatar('p1', 'https://example.com/a.jpg')).toBeNull()
    expect(uploaded).toHaveLength(0)
  })

  it('does nothing at all when signed out', async () => {
    session = null

    expect(await uploadAvatar('p1', PHOTO)).toBeNull()
    expect(uploaded).toHaveLength(0)
  })

  it('uploads under the owner-scoped path', async () => {
    const result = await uploadAvatar('p1', PHOTO)

    expect(result?.path).toBe('user-1/p1.jpg')
    expect(uploaded.map(u => u.path)).toEqual(['user-1/p1.jpg'])
  })

  it('returns null rather than throwing when the upload is rejected', async () => {
    uploadError = new Error('denied')

    expect(await uploadAvatar('p1', PHOTO)).toBeNull()
  })
})

describe('the roster after offloading', () => {
  beforeEach(() => { session = { user: { id: 'user-1' } }; vi.spyOn(console, 'warn').mockImplementation(() => {}) })

  it('swaps the inline photo for a short signed URL', async () => {
    const store = newStore()
    const p = store.addPlayer(base)
    await flush(); await flush()

    const saved = store.players.find(x => x.id === p.id)!
    expect(saved.avatarPath).toBe(`user-1/${p.id}.jpg`)
    expect(saved.avatarUrl).toBe('https://signed.example/avatar.jpg')
    // the point of the exercise: the megabyte is no longer in localStorage
    expect(localStorage.getItem('darts_players')).not.toContain('data:image')
  })

  it('keeps the photo when the upload fails', async () => {
    const store = newStore()
    uploadError = new Error('offline')   // after newStore, which resets the failure flags
    const p = store.addPlayer(base)
    await flush(); await flush()

    const saved = store.players.find(x => x.id === p.id)!
    expect(saved.avatarUrl).toBe(PHOTO)
    expect(saved.avatarPath ?? null).toBeNull()
  })

  it('keeps the photo when signing fails after a successful upload', async () => {
    const store = newStore()
    // dropping the data URL here would leave the player with no image at all
    signResult = null
    const p = store.addPlayer(base)
    await flush(); await flush()

    const saved = store.players.find(x => x.id === p.id)!
    expect(saved.avatarUrl).toBe(PHOTO)
    expect(saved.avatarPath).toBe(`user-1/${p.id}.jpg`)
  })

  it('keeps the photo locally while signed out', async () => {
    session = null
    const store = newStore()
    const p = store.addPlayer(base)
    await flush(); await flush()

    expect(store.players.find(x => x.id === p.id)!.avatarUrl).toBe(PHOTO)
  })

  it('uploads photos taken while signed out once a session appears', async () => {
    session = null
    const store = newStore()
    const p = store.addPlayer(base)
    await flush(); await flush()
    expect(uploaded).toHaveLength(0)

    session = { user: { id: 'user-1' } }
    await store.offloadPendingPhotos()

    expect(uploaded.map(u => u.path)).toEqual([`user-1/${p.id}.jpg`])
  })

  it('removes the stored image when the player is deleted', async () => {
    const store = newStore()
    const p = store.addPlayer(base)
    await flush(); await flush()

    store.deletePlayer(p.id)
    await flush(); await flush()

    expect(removed).toContain(`user-1/${p.id}.jpg`)
  })
})

describe('signAvatars', () => {
  beforeEach(() => { session = { user: { id: 'user-1' } } })

  it('signs a whole table in one request', async () => {
    const out = await signAvatars(['user-1/a.jpg', 'user-1/b.jpg'])

    expect(Object.keys(out)).toHaveLength(2)
  })

  it('deduplicates and ignores empty paths', async () => {
    const out = await signAvatars(['user-1/a.jpg', 'user-1/a.jpg', ''])

    expect(Object.keys(out)).toEqual(['user-1/a.jpg'])
  })

  it('returns nothing for an empty list rather than calling out', async () => {
    expect(await signAvatars([])).toEqual({})
  })
})
