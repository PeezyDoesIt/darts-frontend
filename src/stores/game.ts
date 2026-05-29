import { defineStore } from 'pinia'
import { ref } from 'vue'
import { v4 as uuid } from 'uuid'
import type { ActiveGame, GameType, Player, PlayerScore, CricketTarget } from '../types/index'
import { CRICKET_TARGETS } from '../types/index'

const HORSE_MAX = 5

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

const STORAGE_KEY = 'darts_active_game'

function loadGame(): ActiveGame | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const g = JSON.parse(raw) as ActiveGame
    // Backfill fields added after initial release
    if (g.throwTimerDuration === undefined) g.throwTimerDuration = 0
    if ((g as any).hideClosedTargets !== undefined && (g as any).closedTargetDisplay === undefined)
      g.closedTargetDisplay = (g as any).hideClosedTargets ? 'hide' : 'show'
    if (g.closedTargetDisplay === undefined) g.closedTargetDisplay = 'show'
    if (g.bustEliminates === undefined) g.bustEliminates = false
    if (g.cricketPlayToCompletion === undefined) g.cricketPlayToCompletion = false
    if (g.cricketFinishOrder === undefined) g.cricketFinishOrder = []
    if (g.gameTheme === undefined) g.gameTheme = null
    if (g.players) g.players = g.players.map((p: any) => ({ cricketTargetDisplay: null, ...p }))
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

  function startGame(gameType: GameType, timerDuration: number, throwTimerDuration: number, closedTargetDisplay: 'show' | 'hide' | 'fade' | 'strike', bustEliminates: boolean, cricketPlayToCompletion: boolean, gameTheme: string | null, players: Player[]) {
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
      cricketFinishOrder: [],
      gameTheme,
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
            saveGame(game.value)
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
      const allScores = game.value.scores
      const isCutThroat = game.value.gameType === 'cutThroat'

      for (const [targetStr, hits] of Object.entries(value)) {
        const target = targetStr as CricketTarget
        if (hits === 0) continue

        const currentMarks = score.data.marks[target]
        const newMarks = Math.min(3, currentMarks + hits)
        const overflow = currentMarks + hits - 3

        score.data.marks[target] = newMarks

        // Award points for overflow marks — skipped in play-to-completion mode
        if (overflow > 0 && !game.value.cricketPlayToCompletion) {
          const pointValue = target === 'bull' ? 25 : Number(target)
          const overflowPoints = overflow * pointValue

          if (isCutThroat) {
            for (const [pid, ps] of Object.entries(allScores)) {
              if (pid === playerId) continue
              if (ps.kind !== 'cricket') continue
              if (ps.data.marks[target] < 3) ps.data.points += overflowPoints
            }
          } else {
            const anyOpen = Object.entries(allScores).some(
              ([pid, ps]) => pid !== playerId && ps.kind === 'cricket' && ps.data.marks[target] < 3
            )
            if (anyOpen) score.data.points += overflowPoints
          }
        }
      }

      if (game.value.cricketPlayToCompletion) {
        // Track finish order: player closes all targets → placed in order
        const allClosed = CRICKET_TARGETS.every(t => score.data.marks[t] >= 3)
        if (allClosed && !game.value.cricketFinishOrder.includes(playerId)) {
          game.value.cricketFinishOrder.push(playerId)
          if (game.value.cricketFinishOrder.length === game.value.players.length) {
            game.value.winnerId = game.value.cricketFinishOrder[0]!
            game.value.status = 'finished'
            saveGame(game.value)
            return
          }
        }
      } else {
        const winner = checkCricketWin(game.value)
        if (winner) {
          game.value.winnerId = winner
          game.value.status = 'finished'
          saveGame(game.value)
          return
        }
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
          saveGame(game.value)
          return
        }
        // Manual end-of-round advance
        game.value.round++
        game.value.currentPlayerIndex = 0
        game.value.status = 'between_turns'
        saveGame(game.value)
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
          saveGame(game.value)
          return
        }
        game.value.round++
        game.value.currentPlayerIndex = 0
        game.value.status = 'between_turns'
        saveGame(game.value)
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
        saveGame(game.value)
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
      saveGame(game.value)
      return
    }

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
      game.value.scores[player.id] = { kind: 'ohOne', data: { remaining: Number(gameType), history: [] } }
    } else if (gameType === 'horse') {
      game.value.scores[player.id] = { kind: 'horse', data: { letters: 0, history: [] } }
    } else if (gameType === 'suddenDeath') {
      game.value.scores[player.id] = { kind: 'suddenDeath', data: { total: 0, history: [] } }
    } else {
      game.value.scores[player.id] = { kind: 'simple', data: { total: 0, history: [] } }
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

  function setClosedTargetDisplay(val: 'show' | 'hide' | 'fade' | 'strike') {
    if (!game.value) return
    game.value.closedTargetDisplay = val
    saveGame(game.value)
  }

  function setTimerDuration(val: number) {
    if (!game.value) return
    game.value.timerDuration = val
    saveGame(game.value)
  }

  function setThrowTimerDuration(val: number) {
    if (!game.value) return
    game.value.throwTimerDuration = val
    saveGame(game.value)
  }

  function endGame() {
    game.value = null
    saveGame(null)
  }

  return { game, lastTurnWasZero, lastTurnWasTimeout, lastTurnHadBull, playerTimeoutCounts, playerHurryUpCounts, recordTimeout, recordHurryUp, startGame, submitScore, startNextTurn, addPlayerToGame, removePlayerFromGame, setClosedTargetDisplay, setTimerDuration, setThrowTimerDuration, endGame }
})

function checkCricketWin(game: ActiveGame): string | null {
  const isCutThroat = game.gameType === 'cutThroat'

  if (game.cricketPlayToCompletion) {
    // All players must close all targets before a winner is declared
    const everyoneClosed = Object.values(game.scores).every(ps =>
      ps.kind !== 'cricket' || CRICKET_TARGETS.every(t => ps.data.marks[t] >= 3)
    )
    if (!everyoneClosed) return null

    // Winner: most points (standard) or fewest points (cut-throat)
    let winnerId: string | null = null
    let best = isCutThroat ? Infinity : -Infinity
    for (const [pid, ps] of Object.entries(game.scores)) {
      if (ps.kind !== 'cricket') continue
      if (isCutThroat ? ps.data.points < best : ps.data.points > best) {
        best = ps.data.points
        winnerId = pid
      }
    }
    return winnerId
  }

  // Standard: first player to close all targets with a lead wins
  for (const [pid, ps] of Object.entries(game.scores)) {
    if (ps.kind !== 'cricket') continue
    const allClosed = CRICKET_TARGETS.every(t => ps.data.marks[t] >= 3)
    if (!allClosed) continue

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
