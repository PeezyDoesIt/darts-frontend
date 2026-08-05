import { beforeEach, describe, expect, it, vi } from 'vitest'

// Both dependencies are mocked at module scope: the point of these tests is the
// recording contract (never throw, skip when signed out, send the right key), not
// Supabase or fetch.
const getSession = vi.fn()
const post = vi.fn()

vi.mock('@/lib/supabase', () => ({ supabase: { auth: { getSession: () => getSession() } } }))
vi.mock('@/api/client', () => ({ api: { post: (...a: unknown[]) => post(...a) } }))

const { recordGameResult } = await import('@/api/gameResults')

const signedIn = () => getSession.mockResolvedValue({ data: { session: { access_token: 'tok-123' } } })
const signedOut = () => getSession.mockResolvedValue({ data: { session: null } })

const validGame = {
  clientGameId: 'game-1',
  gameType: 'cricket',
  winnerId: 'p1',
  playerIds: ['p1', 'p2'],
}

describe('recordGameResult', () => {
  beforeEach(() => {
    getSession.mockReset()
    post.mockReset()
    vi.spyOn(console, 'warn').mockImplementation(() => {})
  })

  it('posts the result when signed in', async () => {
    signedIn()
    post.mockResolvedValue({ success: true, data: {} })

    const r = await recordGameResult(validGame)

    expect(r).toEqual({ status: 'recorded' })
    expect(post).toHaveBeenCalledTimes(1)
    expect(post.mock.calls[0]![0]).toBe('/games')
  })

  it('sends the game id as the idempotency key, and the bearer token', async () => {
    signedIn()
    post.mockResolvedValue({ success: true, data: {} })

    await recordGameResult({ ...validGame, clientGameId: 'stable-id-42' })

    const [, body, opts] = post.mock.calls[0]!
    expect((body as { clientGameId: string }).clientGameId).toBe('stable-id-42')
    expect((opts as { headers: Record<string, string> }).headers.Authorization).toBe('Bearer tok-123')
  })

  it('skips silently when signed out — local counters still work without an account', async () => {
    signedOut()

    const r = await recordGameResult(validGame)

    expect(r).toEqual({ status: 'skipped', reason: 'signed-out' })
    expect(post).not.toHaveBeenCalled()
  })

  it('skips a game with no winner rather than storing a meaningless row', async () => {
    signedIn()

    const r = await recordGameResult({ ...validGame, winnerId: '' })

    expect(r).toEqual({ status: 'skipped', reason: 'no-winner' })
    expect(post).not.toHaveBeenCalled()
  })

  it('skips when nobody played', async () => {
    signedIn()

    const r = await recordGameResult({ ...validGame, playerIds: [] })

    expect(r.status).toBe('skipped')
    expect(post).not.toHaveBeenCalled()
  })

  // The three call sites all fire this from a win screen. If it can throw, it takes
  // the win screen down with it — which is strictly worse than losing a statistic.
  it('never throws when the network fails', async () => {
    signedIn()
    post.mockRejectedValue(new Error('Failed to fetch'))

    await expect(recordGameResult(validGame)).resolves.toEqual({
      status: 'failed',
      reason: 'Failed to fetch',
    })
  })

  it('never throws when the API returns an error payload', async () => {
    signedIn()
    post.mockResolvedValue({ success: false, error: 'Unauthorized' })

    await expect(recordGameResult(validGame)).resolves.toEqual({
      status: 'failed',
      reason: 'Unauthorized',
    })
  })

  it('never throws when the session lookup itself fails', async () => {
    getSession.mockRejectedValue(new Error('supabase down'))

    await expect(recordGameResult(validGame)).resolves.toEqual({
      status: 'failed',
      reason: 'supabase down',
    })
    expect(post).not.toHaveBeenCalled()
  })
})
