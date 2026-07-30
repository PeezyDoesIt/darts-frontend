import { defineStore } from 'pinia'
import { ref, watch } from 'vue'
import { v4 as uuid } from 'uuid'
import type { ActiveGame, GameType, Player, PlayerScore, CricketTarget } from '../types/index'
import { CRICKET_TARGETS } from '../types/index'

const HORSE_MAX = 5

function initScore(gameType: GameType, players: Player[]): Record<string, PlayerScore> {
  const scores: Record<string, PlayerScore> = {}

  for (const p of players) {
    if (gameType === 'cricket' || gameType === 'cutThroat' || gameType === 'speedCricket') {
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
    } else if (gameType === 'horse') {
      scores[p.id] = { kind: 'horse', data: { letters: 0, history: [] } }
    } else if (gameType === 'suddenDeath') {
      scores[p.id] = { kind: 'suddenDeath', data: { total: 0, history: [] } }
    } else {
      scores[p.id] = { kind: 'simple', data: { total: 0, history: [] } }
    }
  }

  return scores
}

export const useGameStore = defineStore('game', () => {
  const SAVE_KEY = 'darts_active_game'
  function loadSavedGame(): ActiveGame | null {
    try {
      const raw = localStorage.getItem(SAVE_KEY)
      if (!raw) return null
      const parsed = JSON.parse(raw) as ActiveGame
      // Only restore in-progress games
      if (parsed.status !== 'playing' && parsed.status !== 'between_turns') return null
      return parsed
    } catch { return null }
  }
  const game = ref<ActiveGame | null>(loadSavedGame())
  watch(game, (val) => {
    if (val && (val.status === 'playing' || val.status === 'between_turns')) {
      localStorage.setItem(SAVE_KEY, JSON.stringify(val))
    } else {
      localStorage.removeItem(SAVE_KEY)
    }
  }, { deep: true })
  const lastTurnWasZero = ref(false)
  const lastTurnWasTimeout = ref(false)
  const lastTurnHadBull = ref(false)
  const playerTimeoutCounts = ref<Record<string, number>>({})
  const playerHurryUpCounts = ref<Record<string, number>>({})
  const _pendingTimeout = ref(false)
  function recordHurryUp(playerId: string) {
    playerHurryUpCounts.value[playerId] = (playerHurryUpCounts.value[playerId] ?? 0) + 1
  }

  function recordTimeout(playerId: string) {
    playerTimeoutCounts.value[playerId] = (playerTimeoutCounts.value[playerId] ?? 0) + 1
    _pendingTimeout.value = true
  }

  function startGame(gameType: GameType, timerDuration: number, throwTimerDuration: number, closedTargetDisplay: 'show' | 'hide', bustEliminates: boolean, cricketPlayToCompletion: boolean, cricketHatTrickBonus: boolean, cricketRoundLimit: number | null, gameTheme: string | null, gameThemeSize: 'cover' | 'contain' | null, gameThemePosition: 'top' | 'center' | 'bottom' | null, gameThemeFill: 'black' | 'blur' | null, players: Player[], skipWalkup: boolean = false, gameDuration: number | null = null) {
    playerTimeoutCounts.value = {}
    playerHurryUpCounts.value = {}
    lastTurnWasTimeout.value = false
    game.value = {
      id: uuid(),
      gameType,
      timerDuration,
      throwTimerDuration,
      closedTargetDisplay,
      bustEliminates,
      cricketPlayToCompletion,
      cricketHatTrickBonus,
      cricketRoundLimit,
      gameThemeSize,
      gameThemePosition,
      gameThemeFill,
      bonusTurnActive: false,
      skipWalkup,
      cricketFinishOrder: [],
      gameTheme,
      players,
      currentPlayerIndex: 0,
      round: 1,
      scores: initScore(gameType, players),
      status: 'playing',
      winnerId: null,
      startedAt: new Date().toISOString(),
      gameDuration,
      gameStartedAt: Date.now(),
    }
  }

  function submitScore(playerId: string, value: number | Record<CricketTarget, number>) {
    if (!game.value || game.value.status !== 'playing') return
    lastTurnWasZero.value = typeof value === 'number'
      ? value === 0
      : Object.values(value).every(v => v === 0)
    lastTurnWasTimeout.value = _pendingTimeout.value
    lastTurnHadBull.value = typeof value === 'object' && (value['bull'] ?? 0) > 0
    _pendingTimeout.value = false
    const score = game.value.scores[playerId]
    if (!score) return

    if (score.kind === 'ohOne' && typeof value === 'number') {
      const newRemaining = score.data.remaining - value
      if (newRemaining < 0) {
        if (game.value.bustEliminates) {
          eliminatePlayer(playerId)
          if (game.value.players.length === 1) {
            game.value.winnerId = game.value.players[0]!.id
            game.value.status = 'finished'
            return
          }
        } else {
          score.data.history.push(0)
        }
        advanceTurn()
        return
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
      const marksToClose = game.value.gameType === 'speedCricket' ? 1 : 3
      const totalHitsThisTurn = Object.values(value).reduce((a, b) => a + b, 0)

      for (const [targetStr, hits] of Object.entries(value)) {
        const target = targetStr as CricketTarget
        if (hits === 0) continue
        score.data.marks[target] = Math.min(marksToClose, score.data.marks[target] + hits)
      }

      if (game.value.cricketPlayToCompletion) {
        // Track finish order: player closes all targets → placed in order
        const allClosed = CRICKET_TARGETS.every(t => score.data.marks[t] >= marksToClose)
        if (allClosed && !game.value.cricketFinishOrder.includes(playerId)) {
          game.value.cricketFinishOrder.push(playerId)
          if (game.value.cricketFinishOrder.length === game.value.players.length) {
            game.value.winnerId = game.value.cricketFinishOrder[0]!
            game.value.status = 'finished'
            return
          }
        }
      } else {
        const winner = checkCricketWin(game.value)
        if (winner) {
          game.value.winnerId = winner
          game.value.status = 'finished'
          return
        }
      }
      // Hat trick bonus: 3+ marks in one turn → same player goes again
      if (game.value.cricketHatTrickBonus && totalHitsThisTurn >= 3) {
        game.value.bonusTurnActive = true
        game.value.status = 'between_turns'
        return
      }
    } else if (score.kind === 'simple' && typeof value === 'number') {
      score.data.total += value
      score.data.history.push(value)

    } else if (score.kind === 'horse' && typeof value === 'number') {
      score.data.history.push(value)
      const isLastPlayer = game.value.currentPlayerIndex === game.value.players.length - 1
      if (isLastPlayer) {
        // Target = first player's score this round
        const p0Score = game.value.scores[game.value.players[0]!.id]
        const target = p0Score?.kind === 'horse' ? (p0Score.data.history.at(-1) ?? 0) : 0
        const toEliminate: string[] = []
        for (let i = 1; i < game.value.players.length; i++) {
          const ps = game.value.scores[game.value.players[i]!.id]
          if (ps?.kind !== 'horse') continue
          if ((ps.data.history.at(-1) ?? 0) < target) {
            ps.data.letters++
            if (ps.data.letters >= HORSE_MAX) toEliminate.push(game.value.players[i]!.id)
          }
        }
        for (const pid of toEliminate) eliminatePlayer(pid)
        if (game.value.players.length === 1) {
          game.value.winnerId = game.value.players[0]!.id
          game.value.status = 'finished'
          return
        }
        // Manual end-of-round advance
        game.value.round++
        game.value.currentPlayerIndex = 0
        game.value.status = 'between_turns'
        return
      }

    } else if (score.kind === 'suddenDeath' && typeof value === 'number') {
      score.data.total += value
      score.data.history.push(value)
      const isLastPlayer = game.value.currentPlayerIndex === game.value.players.length - 1
      if (isLastPlayer) {
        const roundScores = game.value.players.map(p => ({
          id: p.id,
          score: (() => { const ps = game.value!.scores[p.id]; return ps?.kind === 'suddenDeath' ? (ps.data.history.at(-1) ?? 0) : 0 })()
        }))
        const minScore = Math.min(...roundScores.map(x => x.score))
        const toEliminate = roundScores.filter(x => x.score === minScore).map(x => x.id)
        if (toEliminate.length < game.value.players.length) {
          for (const pid of toEliminate) eliminatePlayer(pid)
        }
        if (game.value.players.length === 1) {
          game.value.winnerId = game.value.players[0]!.id
          game.value.status = 'finished'
          return
        }
        game.value.round++
        game.value.currentPlayerIndex = 0
        game.value.status = 'between_turns'
        return
      }
    } else if (score.kind === 'bobs27' && typeof value === 'number') {
      const target = game.value.round
      const doubleValue = target * 2
      const delta = value === 0 ? -doubleValue : value * doubleValue
      const newScore = score.data.score + delta
      score.data.history.push({ hits: value, delta })
      if (newScore <= 0) {
        score.data.busted = true
        score.data.score = 0
      } else {
        score.data.score = newScore
      }

      const isLastPlayer = game.value.currentPlayerIndex === game.value.players.length - 1
      const isLastRound = game.value.round === 20
      const allBusted = Object.values(game.value.scores).every(s => s.kind !== 'bobs27' || s.data.busted)

      if (allBusted || (isLastPlayer && isLastRound)) {
        let winnerId: string | null = null
        let bestScore = -Infinity
        for (const [pid, ps] of Object.entries(game.value.scores)) {
          if (ps.kind !== 'bobs27') continue
          if (ps.data.score > bestScore) { bestScore = ps.data.score; winnerId = pid }
        }
        game.value.winnerId = winnerId
        game.value.status = 'finished'
        return
      }
    }

    advanceTurn()
  }

  function eliminatePlayer(playerId: string) {
    if (!game.value) return
    const idx = game.value.players.findIndex(p => p.id === playerId)
    if (idx === -1) return
    game.value.players = game.value.players.filter(p => p.id !== playerId)
    delete game.value.scores[playerId]
    if (idx < game.value.currentPlayerIndex) game.value.currentPlayerIndex--
    else if (idx === game.value.currentPlayerIndex) {
      game.value.currentPlayerIndex = game.value.currentPlayerIndex % Math.max(1, game.value.players.length)
    }
  }

  function advanceTurn() {
    if (!game.value) return
    const { players, currentPlayerIndex } = game.value


    if (game.value.cricketPlayToCompletion && game.value.cricketFinishOrder.length > 0) {
      const finishSet = new Set(game.value.cricketFinishOrder)
      let nextIndex = (currentPlayerIndex + 1) % players.length
      let steps = 0
      while (finishSet.has(players[nextIndex]!.id) && steps < players.length) {
        nextIndex = (nextIndex + 1) % players.length
        steps++
      }
      if (nextIndex <= currentPlayerIndex) game.value.round++
      game.value.currentPlayerIndex = nextIndex
      game.value.status = 'between_turns'
      return
    }

    const nextIndex = (currentPlayerIndex + 1) % players.length
    const completingRound = nextIndex === 0
    if (completingRound) {
      const limit = game.value.cricketRoundLimit
      if (limit !== null && game.value.round >= limit) {
        // Round limit reached — most targets closed wins
        const marksToClose = game.value.gameType === 'speedCricket' ? 1 : 3
        let winnerId: string | null = null
        let best = -1
        for (const [pid, ps] of Object.entries(game.value.scores)) {
          if (ps.kind !== 'cricket') continue
          const closed = CRICKET_TARGETS.filter(t => ps.data.marks[t] >= marksToClose).length
          if (closed > best) { best = closed; winnerId = pid }
        }
        game.value.winnerId = winnerId
        game.value.status = 'finished'
        return
      }
      game.value.round++
    }
    game.value.currentPlayerIndex = nextIndex
    game.value.status = 'between_turns'
  }

  function startNextTurn() {
    if (!game.value) return
    game.value.bonusTurnActive = false
    game.value.status = 'playing'
  }

  function addPlayerToGame(player: Player) {
    if (!game.value) return
    if (game.value.players.some(p => p.id === player.id)) return
    game.value.players.push(player)
    const gameType = game.value.gameType
    if (gameType === 'cricket' || gameType === 'cutThroat' || gameType === 'speedCricket') {
      game.value.scores[player.id] = {
        kind: 'cricket',
        data: {
          marks: Object.fromEntries(CRICKET_TARGETS.map(t => [t, 0])) as Record<CricketTarget, number>,
          points: 0,
        },
      }
    } else if (['301', '501', '701', '1001'].includes(gameType)) {
      game.value.scores[player.id] = { kind: 'ohOne', data: { remaining: Number(gameType), history: [] } }
    } else if (gameType === 'horse') {
      game.value.scores[player.id] = { kind: 'horse', data: { letters: 0, history: [] } }
    } else if (gameType === 'suddenDeath') {
      game.value.scores[player.id] = { kind: 'suddenDeath', data: { total: 0, history: [] } }
    } else {
      game.value.scores[player.id] = { kind: 'simple', data: { total: 0, history: [] } }
    }
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

  }

  function setClosedTargetDisplay(val: 'show' | 'hide') {
    if (!game.value) return
    game.value.closedTargetDisplay = val
  }

  function setTimerDuration(val: number) {
    if (!game.value) return
    game.value.timerDuration = val
  }

  function setThrowTimerDuration(val: number) {
    if (!game.value) return
    game.value.throwTimerDuration = val
  }

  function setRoundLimit(val: number | null) {
    if (!game.value) return
    game.value.cricketRoundLimit = val
  }

  function setGameDuration(val: number | null) {
    if (!game.value) return
    game.value.gameDuration = val
    // Reset start time so the new duration counts from now
    if (val !== null) game.value.gameStartedAt = Date.now()
  }

  // End the game by time — pick the current leader as winner
  function forceEndByTime() {
    if (!game.value || game.value.status === 'finished') return
    const g = game.value
    let winnerId: string | null = null

    if (g.gameType === 'cricket' || g.gameType === 'cutThroat' || g.gameType === 'speedCricket') {
      const marksToClose = g.gameType === 'speedCricket' ? 1 : 3
      let bestClosed = -1, bestPoints = -1
      for (const p of g.players) {
        const s = g.scores[p.id]
        if (s?.kind !== 'cricket') continue
        const closed = CRICKET_TARGETS.filter(t => s.data.marks[t] >= marksToClose).length
        const pts = s.data.points
        if (closed > bestClosed || (closed === bestClosed && pts > bestPoints)) {
          bestClosed = closed; bestPoints = pts; winnerId = p.id
        }
      }
    } else if (['301','501','701','1001'].includes(g.gameType)) {
      let lowestRemaining = Infinity
      for (const p of g.players) {
        const s = g.scores[p.id]
        if (s?.kind !== 'ohOne') continue
        if (s.data.remaining < lowestRemaining) { lowestRemaining = s.data.remaining; winnerId = p.id }
      }
    } else {
      // For other game types, pick whoever has highest total score
      let bestScore = -Infinity
      for (const p of g.players) {
        const s = g.scores[p.id]
        const total = s?.kind === 'suddenDeath' ? s.data.total
                    : s?.kind === 'simple' ? s.data.total
                    : s?.kind === 'horse' ? (5 - s.data.letters) // fewer letters = better
                    : 0
        if (total > bestScore) { bestScore = total; winnerId = p.id }
      }
    }

    g.winnerId = winnerId
    g.status = 'finished'
  }

  function endGame() {
    game.value = null
    localStorage.removeItem(SAVE_KEY)
  }

  return { game, lastTurnWasZero, lastTurnWasTimeout, lastTurnHadBull, playerTimeoutCounts, playerHurryUpCounts, recordTimeout, recordHurryUp, startGame, submitScore, startNextTurn, addPlayerToGame, removePlayerFromGame, setClosedTargetDisplay, setTimerDuration, setThrowTimerDuration, setRoundLimit, setGameDuration, forceEndByTime, endGame }
})

function checkCricketWin(game: ActiveGame): string | null {
  const marksToClose = game.gameType === 'speedCricket' ? 1 : 3

  // First player to close all targets wins
  for (const [pid, ps] of Object.entries(game.scores)) {
    if (ps.kind !== 'cricket') continue
    if (CRICKET_TARGETS.every(t => ps.data.marks[t] >= marksToClose)) return pid
  }
  return null
}
