import { api } from './client'
import { supabase } from '../lib/supabase'

/**
 * Records a completed game with the darts-api.
 *
 * Three call sites use this (darts WinPage, Yahtzee, LRC) and they all share the same
 * constraints, so the rules live here rather than being reimplemented three times:
 *
 * - **Never throws, never blocks.** Showing the winner is the user's actual goal; a
 *   failed stats write must not break that screen. Failures are logged and swallowed.
 * - **Requires a session.** The endpoint is authenticated, so a signed-out user simply
 *   has nothing to send. Local win counters still update either way.
 * - **Idempotent by `clientGameId`.** The server keys on (user, clientGameId), so
 *   re-mounting a win screen re-sends the same id and gets the original row back.
 *   This is the guard against the defect that inflated every player's win count on
 *   each refresh of the Yahtzee win screen.
 */
export type RecordGameInput = {
  clientGameId: string
  gameType: string
  winnerId: string
  playerIds: string[]
  startedAt?: string | null
  finishedAt?: string | null
  roundCount?: number | null
  finalScores?: unknown
}

export type RecordOutcome =
  | { status: 'recorded' }
  | { status: 'skipped'; reason: 'signed-out' | 'no-winner' }
  | { status: 'failed'; reason: string }

export async function recordGameResult(input: RecordGameInput): Promise<RecordOutcome> {
  // A game with no winner (abandoned, quit early) is not a result worth storing.
  if (!input.winnerId || input.playerIds.length === 0) {
    return { status: 'skipped', reason: 'no-winner' }
  }

  try {
    const { data: { session } } = await supabase.auth.getSession()
    const token = session?.access_token
    if (!token) return { status: 'skipped', reason: 'signed-out' }

    const res = await api.post<unknown>('/games', input, {
      headers: { Authorization: `Bearer ${token}` },
    })

    if (!res.success) {
      console.warn('[gameResults] not recorded:', res.error)
      return { status: 'failed', reason: res.error ?? 'unknown' }
    }
    return { status: 'recorded' }
  } catch (e) {
    // Offline, DNS failure, CORS — none of it should reach the user on a win screen.
    console.warn('[gameResults] not recorded:', e)
    return { status: 'failed', reason: e instanceof Error ? e.message : 'network' }
  }
}
