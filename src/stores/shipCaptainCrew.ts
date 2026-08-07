import { ref } from 'vue'
import { defineStore } from 'pinia'
import { v4 as uuid } from 'uuid'
import { SCC_DICE, SCC_ROLLS_PER_TURN, cargoScore, claimFromRoll, isComplete } from '../lib/shipCaptainCrew'
import type { Player } from '../types/index'

export interface SCCPlayer {
  id: string
  name: string
  avatarUrl: string | null
  color: string
  /** Rounds won outright. This is the game score. */
  roundWins: number
  /** Cargo scored in the current round, null until this player has taken their turn. */
  cargo: number | null
}

export interface SCCGame {
  id: string
  startedAt: string
  players: SCCPlayer[]
  currentPlayerIndex: number
  round: number
  /** Round wins needed to take the game. */
  target: number
  /** Dice still being rolled — the claimed 6/5/4 are tracked by `stage`, not kept here. */
  dice: number[]
  stage: number
  rollsUsed: number
  phase: 'idle' | 'rolled' | 'turn_done' | 'round_over' | 'game_over'
  winnerId: string | null
  /** Ids of the players who won the round just ended — plural, since cargo can tie. */
  roundWinnerIds: string[]
  lastAction: string
}

const STORAGE_KEY = 'scc_active_game'
const DEFAULT_TARGET = 3

const roll = (n: number) => Array.from({ length: n }, () => Math.ceil(Math.random() * 6))

export const useSCCStore = defineStore('shipCaptainCrew', () => {
  const game = ref<SCCGame | null>(null)

  function load() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      if (!raw) return
      const parsed = JSON.parse(raw) as SCCGame
      if (parsed.phase === 'game_over') return
      if (!parsed.id) parsed.id = uuid()
      if (!parsed.startedAt) parsed.startedAt = new Date().toISOString()
      game.value = parsed
    } catch {}
  }

  function persist() {
    try {
      if (!game.value) { localStorage.removeItem(STORAGE_KEY); return }
      const slim = {
        ...game.value,
        players: game.value.players.map(p => ({
          ...p, avatarUrl: p.avatarUrl?.startsWith('data:') ? null : p.avatarUrl,
        })),
      }
      localStorage.setItem(STORAGE_KEY, JSON.stringify(slim))
    } catch {}
  }

  function startGame(players: Player[], target = DEFAULT_TARGET) {
    game.value = {
      id: uuid(),
      startedAt: new Date().toISOString(),
      players: players.map(p => ({
        id: p.id, name: p.name, avatarUrl: p.avatarUrl, color: p.color,
        roundWins: 0, cargo: null,
      })),
      currentPlayerIndex: 0,
      round: 1,
      target,
      dice: [],
      stage: 0,
      rollsUsed: 0,
      phase: 'idle',
      winnerId: null,
      roundWinnerIds: [],
      lastAction: '',
    }
    persist()
  }

  /** Roll the unclaimed dice and claim whatever the order allows. */
  function rollDice() {
    const g = game.value
    if (!g || (g.phase !== 'idle' && g.phase !== 'rolled')) return
    if (g.rollsUsed >= SCC_ROLLS_PER_TURN) return

    const unclaimed = SCC_DICE - g.stage
    const result = claimFromRoll(roll(unclaimed), g.stage)

    g.stage = result.stage
    g.dice = result.remaining
    g.rollsUsed++
    g.lastAction = result.claimed.length
      ? `Claimed ${result.claimed.join(', ')}`
      : 'Nothing claimed'
    g.phase = 'rolled'

    // Out of rolls settles the turn immediately — there is nothing left to decide.
    if (g.rollsUsed >= SCC_ROLLS_PER_TURN) finishTurn()
    else persist()
  }

  /** Stop early and keep the cargo showing. Only meaningful once the crew is aboard. */
  function stand() {
    const g = game.value
    if (!g || g.phase !== 'rolled') return
    finishTurn()
  }

  function finishTurn() {
    const g = game.value
    if (!g) return
    const p = g.players[g.currentPlayerIndex]
    if (!p) return

    p.cargo = cargoScore(g.stage, g.dice)
    g.lastAction = isComplete(g.stage)
      ? `${p.name} docks with ${p.cargo} cargo`
      : `${p.name} never got the crew aboard — no score`
    g.phase = 'turn_done'
    persist()
  }

  /** Advance to the next player, or settle the round when everyone has been. */
  function nextTurn() {
    const g = game.value
    if (!g || g.phase !== 'turn_done') return

    const nextIdx = g.currentPlayerIndex + 1
    if (nextIdx < g.players.length) {
      g.currentPlayerIndex = nextIdx
      resetTurn()
      persist()
      return
    }
    settleRound()
  }

  function resetTurn() {
    const g = game.value
    if (!g) return
    g.dice = []
    g.stage = 0
    g.rollsUsed = 0
    g.phase = 'idle'
    g.lastAction = ''
  }

  function settleRound() {
    const g = game.value
    if (!g) return

    const best = Math.max(...g.players.map(p => p.cargo ?? 0))
    // A round where nobody got the crew aboard has no winner at all, rather than everyone
    // tying on zero and all being awarded a round win.
    const winners = best > 0 ? g.players.filter(p => (p.cargo ?? 0) === best) : []
    for (const w of winners) w.roundWins++

    g.roundWinnerIds = winners.map(w => w.id)
    g.lastAction = winners.length === 0
      ? 'No crew aboard all round — nobody takes it'
      : `${winners.map(w => w.name).join(' & ')} take${winners.length === 1 ? 's' : ''} round ${g.round} with ${best}`

    const champion = g.players.find(p => p.roundWins >= g.target)
    if (champion) {
      g.winnerId = champion.id
      g.phase = 'game_over'
    } else {
      g.phase = 'round_over'
    }
    persist()
  }

  /** Start the next round after the round-over summary. */
  function nextRound() {
    const g = game.value
    if (!g || g.phase !== 'round_over') return
    g.round++
    g.currentPlayerIndex = 0
    for (const p of g.players) p.cargo = null
    g.roundWinnerIds = []
    resetTurn()
    persist()
  }

  function endGame() {
    game.value = null
    persist()
  }

  load()

  return { game, startGame, rollDice, stand, nextTurn, nextRound, endGame }
})
