import { api } from './client'
import { supabase } from '../lib/supabase'

/**
 * Reads back the games the API has been recording.
 *
 * Every completed game has been posted to `game_results` since that table shipped, and
 * nothing has ever read one — the leaderboard runs off two lifetime counters on each player
 * instead. Those counters cannot answer when a game happened, who was in it, or what the
 * score was, and if they drift there is nothing to rebuild them from.
 *
 * Shares the constraints of the write side: never throws, and a signed-out user simply has
 * no history, because the endpoint is per-account.
 */

export type GameResult = {
  id: string
  clientGameId: string
  gameType: string
  winnerId: string
  playerIds: string[]
  startedAt: string | null
  finishedAt: string
  roundCount: number | null
  finalScores: unknown
  createdAt: string
}

export type HistoryOutcome =
  | { status: 'ok'; games: GameResult[] }
  | { status: 'signed-out' }
  | { status: 'failed'; reason: string }

export type HistoryQuery = {
  limit?: number
  playerId?: string
  gameType?: string
}

export async function fetchGameHistory(q: HistoryQuery = {}): Promise<HistoryOutcome> {
  try {
    const { data: { session } } = await supabase.auth.getSession()
    const token = session?.access_token
    // History lives against the account, so there is nothing to show when signed out. This
    // is a state the UI explains, not an error.
    if (!token) return { status: 'signed-out' }

    const params = new URLSearchParams()
    if (q.limit != null) params.set('limit', String(q.limit))
    if (q.playerId) params.set('playerId', q.playerId)
    if (q.gameType) params.set('gameType', q.gameType)
    const qs = params.toString()

    const res = await api.get<GameResult[]>(`/games${qs ? `?${qs}` : ''}`, {
      headers: { Authorization: `Bearer ${token}` },
    })

    if (!res.success) return { status: 'failed', reason: res.error ?? 'unknown' }
    return { status: 'ok', games: res.data ?? [] }
  } catch (e) {
    // Offline, DNS, CORS — a history screen shows a message, it does not crash.
    return { status: 'failed', reason: e instanceof Error ? e.message : 'network' }
  }
}
