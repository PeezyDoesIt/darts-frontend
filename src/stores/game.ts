import { defineStore } from 'pinia'
import { ref } from 'vue'
import { v4 as uuid } from 'uuid'
import type { ActiveGame, GameType, Player, PlayerScore, CricketTarget } from '../types/index'
import { CRICKET_TARGETS } from '../types/index'

function initScore(gameType: GameType, players: Player[]): Record<string, PlayerScore> {
  const scores: Record<string, PlayerScore> = {}

  for (const p of players) {
    if (gameType === 'cricket' || gameType === 'cutThroat') {
      scores[p.id] = {
        kind: 'cricket',
        data: {
          marks: Object.fromEntries(CRICKET_TARGETS.map(t => [t, 0])) as Record<CricketTarget, number>,
          points: 0,
        },
      }
    } else if (['301', '501', '701', '1001'].includes(gameType)) {
      scores[p.id] = {
        kind: 'ohOne',
        data: { remaining: Number(gameType), history: [] },
      }
    } else {
      scores[p.id] = {
        kind: 'simple',
        data: { total: 0, history: [] },
      }
    }
  }

  return scores
}

const STORAGE_KEY = 'darts_active_game'

function loadGame(): ActiveGame | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const g = JSON.parse(raw) as ActiveGame
    // Backfill fields added after initial release
    if (g.throwTimerDuration === undefined) g.throwTimerDuration = 0
    return g
  } catch {
    return null
  }
}

function saveGame(g: ActiveGame | null) {
  try {
    if (g) localStorage.setItem(STORAGE_KEY, JSON.stringify(g))
    else localStorage.removeItem(STORAGE_KEY)
  } catch {
    // localStorage quota exceeded (e.g. large photo avatars) — game runs in memory only
  }
}

export const useGameStore = defineStore('game', () => {
  const game = ref<ActiveGame | null>(loadGame())
  const lastTurnWasZero = ref(false)
  const lastTurnWasTimeout = ref(false)
  const playerTimeoutCounts = ref<Record<string, number>>({})
  const _pendingTimeout = ref(false)

  function recordTimeout(playerId: string) {
    playerTimeoutCounts.value[playerId] = (playerTimeoutCounts.value[playerId] ?? 0) + 1
    _pendingTimeout.value = true
  }

  function startGame(gameType: GameType, timerDuration: number, throwTimerDuration: number, players: Player[]) {
    playerTimeoutCounts.value = {}
    lastTurnWasTimeout.value = false
    game.value = {
      id: uuid(),
      gameType,
      timerDuration,
      throwTimerDuration,
      players,
      currentPlayerIndex: 0,
      round: 1,
      scores: initScore(gameType, players),
      status: 'playing',
      winnerId: null,
      startedAt: new Date().toISOString(),
    }
    saveGame(game.value)
  }

  function submitScore(playerId: string, value: number | Record<CricketTarget, number>) {
    if (!game.value || game.value.status !== 'playing') return
    lastTurnWasZero.value = typeof value === 'number'
      ? value === 0
      : Object.values(value).every(v => v === 0)
    lastTurnWasTimeout.value = _pendingTimeout.value
    _pendingTimeout.value = false

    const score = game.value.scores[playerId]
    if (!score) return

    if (score.kind === 'ohOne' && typeof value === 'number') {
      const newRemaining = score.data.remaining - value
      if (newRemaining < 0) {
        // Bust — no change
      } else if (newRemaining === 0) {
        score.data.remaining = 0
        score.data.history.push(value)
        game.value.winnerId = playerId
        game.value.status = 'finished'
        return
      } else {
        score.data.remaining = newRemaining
        score.data.history.push(value)
      }
    } else if (score.kind === 'cricket' && typeof value === 'object') {
      const allScores = game.value.scores
      const isCutThroat = game.value.gameType === 'cutThroat'

      for (const [targetStr, hits] of Object.entries(value)) {
        const target = targetStr as CricketTarget
        if (hits === 0) continue

        const currentMarks = score.data.marks[target]
        const newMarks = Math.min(3, currentMarks + hits)
        const overflow = currentMarks + hits - 3

        score.data.marks[target] = newMarks

        // Award points for overflow marks if target is open for opponents
        if (overflow > 0) {
          const pointValue = target === 'bull' ? 25 : Number(target)
          const overflowPoints = overflow * pointValue

          if (isCutThroat) {
            // Points go to opponents who haven't closed
            for (const [pid, ps] of Object.entries(allScores)) {
              if (pid === playerId) continue
              if (ps.kind !== 'cricket') continue
              if (ps.data.marks[target] < 3) {
                ps.data.points += overflowPoints
              }
            }
          } else {
            // Points go to shooter if any opponent hasn't closed
            const anyOpen = Object.entries(allScores).some(
              ([pid, ps]) => pid !== playerId && ps.kind === 'cricket' && ps.data.marks[target] < 3
            )
            if (anyOpen) score.data.points += overflowPoints
          }
        }
      }

      // Check win: all targets closed and lowest points (standard) or all closed (cutthroat)
      const winner = checkCricketWin(game.value)
      if (winner) {
        game.value.winnerId = winner
        game.value.status = 'finished'
        saveGame(game.value)
        return
      }
    } else if (score.kind === 'simple' && typeof value === 'number') {
      score.data.total += value
      score.data.history.push(value)
    }

    advanceTurn()
  }

  function advanceTurn() {
    if (!game.value) return
    const { players, currentPlayerIndex } = game.value
    const nextIndex = (currentPlayerIndex + 1) % players.length
    if (nextIndex === 0) game.value.round++
    game.value.currentPlayerIndex = nextIndex
    game.value.status = 'between_turns'
    saveGame(game.value)
  }

  function startNextTurn() {
    if (!game.value) return
    game.value.status = 'playing'
    saveGame(game.value)
  }

  function addPlayerToGame(player: Player) {
    if (!game.value) return
    if (game.value.players.some(p => p.id === player.id)) return
    game.value.players.push(player)
    const gameType = game.value.gameType
    if (gameType === 'cricket' || gameType === 'cutThroat') {
      game.value.scores[player.id] = {
        kind: 'cricket',
        data: {
          marks: Object.fromEntries(CRICKET_TARGETS.map(t => [t, 0])) as Record<CricketTarget, number>,
          points: 0,
        },
      }
    } else if (['301', '501', '701', '1001'].includes(gameType)) {
      game.value.scores[player.id] = {
        kind: 'ohOne',
        data: { remaining: Number(gameType), history: [] },
      }
    } else {
      game.value.scores[player.id] = {
        kind: 'simple',
        data: { total: 0, history: [] },
      }
    }
    saveGame(game.value)
  }

  function removePlayerFromGame(playerId: string) {
    if (!game.value) return
    const players = game.value.players
    if (players.length <= 2) return // keep at least 2
    const idx = players.findIndex(p => p.id === playerId)
    if (idx === -1) return

    const wasCurrentPlayer = idx === game.value.currentPlayerIndex

    // Remove player and score
    game.value.players = players.filter(p => p.id !== playerId)
    delete game.value.scores[playerId]

    // Fix currentPlayerIndex
    if (idx < game.value.currentPlayerIndex) {
      game.value.currentPlayerIndex--
    } else if (wasCurrentPlayer) {
      // Wrap if removed player was at the end
      game.value.currentPlayerIndex = game.value.currentPlayerIndex % game.value.players.length
      // Treat this as advancing the turn
      game.value.status = 'between_turns'
    }

    saveGame(game.value)
  }

  function endGame() {
    game.value = null
    saveGame(null)
  }

  return { game, lastTurnWasZero, lastTurnWasTimeout, playerTimeoutCounts, recordTimeout, startGame, submitScore, startNextTurn, addPlayerToGame, removePlayerFromGame, endGame }
})

function checkCricketWin(game: ActiveGame): string | null {
  for (const [pid, ps] of Object.entries(game.scores)) {
    if (ps.kind !== 'cricket') continue
    const allClosed = CRICKET_TARGETS.every(t => ps.data.marks[t] >= 3)
    if (!allClosed) continue

    // Check all opponents also closed or this player has <= their points
    const won = Object.entries(game.scores).every(([opid, ops]) => {
      if (opid === pid) return true
      if (ops.kind !== 'cricket') return true
      const opAllClosed = CRICKET_TARGETS.every(t => ops.data.marks[t] >= 3)
      return opAllClosed || ps.data.points >= ops.data.points
    })

    if (won) return pid
  }
  return null
}
