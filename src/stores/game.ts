import { defineStore } from 'pinia'
import { ref, watch } from 'vue'
import { v4 as uuid } from 'uuid'
import type { ActiveGame, GameType, Player, PlayerScore, CricketTarget } from '../types/index'
import { CRICKET_TARGETS, isCricketGame } from '../types/index'
import {
  DEFAULT_LIVES as KILLER_DEFAULT_LIVES, assignNumbers, resolveKillerTurn, survivors,
  type KillerSeat,
} from '../lib/killer'

const HORSE_MAX = 5

function initScore(
  gameType: GameType,
  players: Player[],
  killerLives: number = KILLER_DEFAULT_LIVES,
): Record<string, PlayerScore> {
  const scores: Record<string, PlayerScore> = {}

  // Killer needs every player to own a distinct number, so it is assigned for the whole
  // table at once rather than per player in the loop below.
  const killerNumbers = gameType === 'killer'
    ? assignNumbers(players.map(p => p.id))
    : null

  for (const p of players) {
    if (isCricketGame(gameType)) {
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
    } else if (gameType === 'killer' && killerNumbers) {
      scores[p.id] = {
        kind: 'killer',
        data: { number: killerNumbers[p.id]!, lives: killerLives, isKiller: false, history: [] },
      }
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
      if (parsed.horseSetterIndex === undefined) parsed.horseSetterIndex = 0
      if (parsed.wildEnabled === undefined) parsed.wildEnabled = false
      if (parsed.wildTargets === undefined) parsed.wildTargets = [20, 19, 18, 17, 16, 15]
      if (parsed.wildLockedNums === undefined) parsed.wildLockedNums = []
      if (parsed.killerLives === undefined) parsed.killerLives = KILLER_DEFAULT_LIVES
      if (parsed.killerRequireDouble === undefined) parsed.killerRequireDouble = false
      /*
       * These two were `cricketPlayToCompletion` / `cricketFinishOrder` until the option was
       * extended to the 01 games. A game already in progress when the app updates still has
       * the old keys, and without this it would resume with the option silently switched off
       * mid-game — the finish order lost, and the first player to check out ending it.
       */
      const legacy = parsed as unknown as Record<string, unknown>
      if (parsed.playToCompletion === undefined) parsed.playToCompletion = legacy.cricketPlayToCompletion === true
      if (parsed.finishOrder === undefined) parsed.finishOrder = (legacy.cricketFinishOrder as string[] | undefined) ?? []
      return parsed
    } catch { return null }
  }
  const game = ref<ActiveGame | null>(loadSavedGame())

  let _persistTimer: ReturnType<typeof setTimeout> | null = null
  function persist() {
    if (_persistTimer !== null) clearTimeout(_persistTimer)
    _persistTimer = setTimeout(() => {
      _persistTimer = null
      const val = game.value
      if (val && (val.status === 'playing' || val.status === 'between_turns')) {
        // Strip large base64 image data to keep serialization fast
        const slim = {
          ...val,
          players: val.players.map(p => ({ ...p, avatarUrl: p.avatarUrl?.startsWith('data:') ? null : p.avatarUrl, playerBackground: null })),
        }
        try { localStorage.setItem(SAVE_KEY, JSON.stringify(slim)) } catch { /* best effort: storage can be full, or unavailable in private mode */ }
      } else {
        localStorage.removeItem(SAVE_KEY)
      }
    }, 300)
  }

  watch(game, persist, { deep: true })
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

  function startGame(gameType: GameType, timerDuration: number, throwTimerDuration: number, closedTargetDisplay: 'show' | 'hide', bustEliminates: boolean, playToCompletion: boolean, cricketHatTrickBonus: boolean, cricketRoundLimit: number | null, gameTheme: string | null, gameThemeSize: 'cover' | 'contain' | null, gameThemePosition: 'top' | 'center' | 'bottom' | null, gameThemeFill: 'black' | 'blur' | null, players: Player[], skipWalkup: boolean = false, gameDuration: number | null = null, killerLives: number = KILLER_DEFAULT_LIVES, killerRequireDouble: boolean = false) {
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
      playToCompletion,
      cricketHatTrickBonus,
      cricketRoundLimit,
      gameThemeSize,
      gameThemePosition,
      gameThemeFill,
      bonusTurnActive: false,
      turnSeq: 0,
      skipWalkup,
      finishOrder: [],
      gameTheme,
      players,
      currentPlayerIndex: 0,
      round: 1,
      scores: initScore(gameType, players, killerLives),
      status: 'playing',
      winnerId: null,
      startedAt: new Date().toISOString(),
      gameDuration,
      gameStartedAt: Date.now(),
      horseSetterIndex: 0,
      killerLives,
      killerRequireDouble,
      wildEnabled: false,
      wildTargets: [20, 19, 18, 17, 16, 15],
      wildLockedNums: [],
    }
  }

  function submitScore(playerId: string, value: number | Record<string, number>) {
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
        /*
         * Checking out takes a place rather than ending the game, when the option is on.
         *
         * The same shape as cricket's: the first one out is the winner, the rest keep
         * playing for second and third, and the game ends when everyone has checked out.
         * advanceTurn already skips anyone in the finish order, so a player who is out
         * stops being dealt turns without anything else being needed here.
         */
        if (game.value.playToCompletion) {
          if (!game.value.finishOrder.includes(playerId)) game.value.finishOrder.push(playerId)
          if (game.value.finishOrder.length >= game.value.players.length) {
            game.value.winnerId = game.value.finishOrder[0]!
            game.value.status = 'finished'
            return
          }
          advanceTurn()
          return
        }
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

      if (game.value.wildEnabled) {
        // Wild cricket: update wildMarks, lock numbers, check win
        if (!score.data.wildMarks) score.data.wildMarks = {}
        for (const [key, hits] of Object.entries(value)) {
          if (hits === 0) continue
          score.data.wildMarks[key] = Math.min(marksToClose, (score.data.wildMarks[key] ?? 0) + hits)
          const num = parseInt(key)
          if (!isNaN(num) && !game.value.wildLockedNums.includes(num)) {
            game.value.wildLockedNums.push(num)
          }
        }
        // Win: player closed all current wildTargets + bull
        const allWildKeys = [...game.value.wildTargets.map(String), 'bull']
        const allClosed = allWildKeys.every(k => (score.data.wildMarks![k] ?? 0) >= marksToClose)
        if (allClosed) {
          game.value.winnerId = playerId
          game.value.status = 'finished'
          return
        }
      } else {
        for (const [targetStr, hits] of Object.entries(value)) {
          const target = targetStr as CricketTarget
          if (hits === 0) continue
          score.data.marks[target] = Math.min(marksToClose, score.data.marks[target] + hits)
        }

        if (game.value.playToCompletion) {
          // Track finish order: player closes all targets → placed in order
          const allClosed = CRICKET_TARGETS.every(t => score.data.marks[t] >= marksToClose)
          if (allClosed && !game.value.finishOrder.includes(playerId)) {
            game.value.finishOrder.push(playerId)
            if (game.value.finishOrder.length === game.value.players.length) {
              game.value.winnerId = game.value.finishOrder[0]!
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
      }

      // Hat trick bonus: 3+ marks in one turn → same player goes again
      if (game.value.cricketHatTrickBonus && totalHitsThisTurn >= 3 && game.value.players.length > 1) {
        game.value.bonusTurnActive = true
        game.value.status = 'between_turns'
        return
      }
    } else if (score.kind === 'simple' && typeof value === 'number') {
      score.data.total += value
      score.data.history.push(value)
      // ATC win: first player to reach 20 numbers wins
      if (game.value.gameType === 'aroundTheClock' && score.data.total >= 20) {
        if (game.value.players.length === 1) {
          game.value.winnerId = playerId
          game.value.status = 'finished'
          return
        }
        // Multi-player: first to 20 wins
        game.value.winnerId = playerId
        game.value.status = 'finished'
        return
      }

    } else if (score.kind === 'killer' && typeof value === 'object') {
      // Read the whole table into the pure resolver, then write the result back. Doing the
      // rules here inline is what let this mode ship with no rules at all.
      const seats: KillerSeat[] = game.value.players.map(p => {
        const s = game.value!.scores[p.id]
        return s?.kind === 'killer'
          ? { playerId: p.id, number: s.data.number, lives: s.data.lives, isKiller: s.data.isKiller }
          : { playerId: p.id, number: -1, lives: 0, isKiller: false }
      })

      const result = resolveKillerTurn(seats, playerId, value)
      for (const s of result.seats) {
        const target = game.value.scores[s.playerId]
        if (target?.kind !== 'killer') continue
        target.data.lives = s.lives
        target.data.isKiller = s.isKiller
      }
      score.data.history.push(result.livesTaken.reduce((sum, l) => sum + l.lives, 0))

      // Eliminate after the write-back so the removals see final life counts.
      for (const deadId of result.eliminated) eliminatePlayer(deadId)

      const alive = survivors(result.seats)
      if (alive.length <= 1 || game.value.players.length <= 1) {
        game.value.winnerId = game.value.players[0]?.id ?? alive[0]?.playerId ?? null
        game.value.status = 'finished'
        return
      }

      advanceTurn()
      game.value.status = 'between_turns'
      return

    } else if (score.kind === 'horse' && typeof value === 'number') {
      score.data.history.push(value)
      const setterIdx = game.value.horseSetterIndex
      const isCurrentSetter = game.value.currentPlayerIndex === setterIdx

      if (isCurrentSetter) {
        if (value === 0) {
          // Setter missed → earn a letter, rotate setter
          score.data.letters++
          if (score.data.letters >= HORSE_MAX) {
            // Setter eliminated — rotate index before elimination (eliminatePlayer will adjust if needed)
            const nextSetterIdx = (setterIdx + 1) % game.value.players.length
            eliminatePlayer(playerId)
            if (game.value.players.length === 1) {
              game.value.winnerId = game.value.players[0]!.id
              game.value.status = 'finished'
              return
            }
            game.value.horseSetterIndex = nextSetterIdx % game.value.players.length
          } else {
            game.value.horseSetterIndex = (setterIdx + 1) % game.value.players.length
          }
          game.value.round++
          game.value.currentPlayerIndex = game.value.horseSetterIndex
        } else {
          // Setter set a valid target — move to first non-setter player
          const nextIdx = (setterIdx + 1) % game.value.players.length
          game.value.currentPlayerIndex = nextIdx
        }
        game.value.status = 'between_turns'
        return
      }

      // Non-setter: must exactly match the setter's target
      const setterId = game.value.players[setterIdx]?.id
      const setterScore = setterId ? game.value.scores[setterId] : null
      const target = setterScore?.kind === 'horse' ? (setterScore.data.history.at(-1) ?? 0) : 0
      if (value !== target) {
        score.data.letters++
        if (score.data.letters >= HORSE_MAX) {
          eliminatePlayer(playerId)
          if (game.value.players.length === 1) {
            game.value.winnerId = game.value.players[0]!.id
            game.value.status = 'finished'
            return
          }
        }
      }

      // Advance to next non-setter, or back to setter if round complete
      const currentSetterIdx = game.value.horseSetterIndex
      const nextPlayerIdx = (game.value.currentPlayerIndex + 1) % game.value.players.length
      if (nextPlayerIdx === currentSetterIdx) {
        game.value.round++
        game.value.currentPlayerIndex = currentSetterIdx
      } else {
        game.value.currentPlayerIndex = nextPlayerIdx
      }
      game.value.status = 'between_turns'
      return

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
    // Keep horseSetterIndex valid when a player before the setter is removed
    if (game.value.gameType === 'horse' && idx < game.value.horseSetterIndex) {
      game.value.horseSetterIndex--
    }
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

    // Wild cricket: reshuffle unlocked targets after each turn
    if (game.value.wildEnabled && (game.value.gameType === 'cricket' || game.value.gameType === 'speedCricket')) {
      reshuffleWild(game.value)
    }


    if (game.value.playToCompletion && game.value.finishOrder.length > 0) {
      const finishSet = new Set(game.value.finishOrder)
      let nextIndex = (currentPlayerIndex + 1) % players.length
      let steps = 0
      while (finishSet.has(players[nextIndex]!.id) && steps < players.length) {
        nextIndex = (nextIndex + 1) % players.length
        steps++
      }
      if (nextIndex <= currentPlayerIndex) game.value.round++
      game.value.currentPlayerIndex = nextIndex
      game.value.status = players.length === 1 ? 'playing' : 'between_turns'
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
    // Solo play goes straight back to throwing without a hand-off, so it never reaches
    // startNextTurn — count the turn here instead.
    if (players.length === 1) game.value.turnSeq = (game.value.turnSeq ?? 0) + 1
    game.value.status = players.length === 1 ? 'playing' : 'between_turns'
  }

  function startNextTurn() {
    if (!game.value) return
    game.value.bonusTurnActive = false
    // A turn is starting, whoever's it is. Entry components key off this to get a fresh
    // instance — on a bonus turn the player and round are unchanged, so without it Vue
    // reuses the old one and its submitted latch leaves NEXT dead.
    game.value.turnSeq = (game.value.turnSeq ?? 0) + 1
    game.value.status = 'playing'
  }

  function addPlayerToGame(player: Player) {
    if (!game.value) return
    if (game.value.players.some(p => p.id === player.id)) return
    game.value.players.push(player)
    const gameType = game.value.gameType
    if (isCricketGame(gameType)) {
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
    } else if (gameType === 'killer') {
      // Pick from the numbers nobody at the table already owns, so a late joiner can never
      // share a number — which would make two players draw from one life pool.
      const taken = new Set(
        Object.values(game.value.scores)
          .filter(s => s.kind === 'killer')
          .map(s => (s as { data: { number: number } }).data.number)
      )
      const free = Array.from({ length: 20 }, (_, i) => i + 1).filter(n => !taken.has(n))
      if (free.length === 0) { game.value.players.pop(); return }
      const number = free[Math.floor(Math.random() * free.length)]!
      game.value.scores[player.id] = {
        kind: 'killer',
        data: { number, lives: game.value.killerLives, isKiller: false, history: [] },
      }
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

  function setSkipWalkup(val: boolean) {
    if (!game.value) return
    game.value.skipWalkup = val
  }

  function setWildEnabled(val: boolean) {
    if (!game.value) return
    game.value.wildEnabled = val
    if (val) {
      // Reset wild state when enabling
      game.value.wildLockedNums = []
      game.value.wildTargets = [20, 19, 18, 17, 16, 15]
    }
  }

  // End the game by time — pick the current leader as winner
  function forceEndByTime() {
    if (!game.value || game.value.status === 'finished') return
    const g = game.value
    let winnerId: string | null = null

    if (isCricketGame(g.gameType)) {
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

  function setAtcCompletedNums(playerId: string, nums: number[]) {
    if (!game.value) return
    const score = game.value.scores[playerId]
    if (score?.kind === 'simple') {
      score.data.completedNums = nums
    }
  }

  return { game, lastTurnWasZero, lastTurnWasTimeout, lastTurnHadBull, playerTimeoutCounts, playerHurryUpCounts, recordTimeout, recordHurryUp, startGame, submitScore, setAtcCompletedNums, startNextTurn, addPlayerToGame, removePlayerFromGame, setClosedTargetDisplay, setTimerDuration, setThrowTimerDuration, setRoundLimit, setGameDuration, setSkipWalkup, setWildEnabled, forceEndByTime, endGame }
})

function reshuffleWild(game: ActiveGame) {
  const locked = game.wildLockedNums
  const needed = 6 - locked.length
  if (needed <= 0) return
  const available: number[] = []
  for (let n = 1; n <= 20; n++) {
    if (!locked.includes(n)) available.push(n)
  }
  // Fisher-Yates shuffle
  for (let i = available.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[available[i], available[j]] = [available[j]!, available[i]!]
  }
  const newNums = available.slice(0, needed).sort((a, b) => b - a)
  game.wildTargets = [...locked, ...newNums]
}

function checkCricketWin(game: ActiveGame): string | null {
  const marksToClose = game.gameType === 'speedCricket' ? 1 : 3

  // First player to close all targets wins
  for (const [pid, ps] of Object.entries(game.scores)) {
    if (ps.kind !== 'cricket') continue
    if (CRICKET_TARGETS.every(t => ps.data.marks[t] >= marksToClose)) return pid
  }
  return null
}
