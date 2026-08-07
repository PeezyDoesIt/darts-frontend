import { ref } from 'vue'
import { defineStore } from 'pinia'
import { v4 as uuid } from 'uuid'
import type { Player } from '../types/index'

export const PIG_TARGET = 100

export const PIG_RULES: string[] = [
  'Roll one die as many times as you dare',
  'Each roll adds to your turn total',
  'Roll a 1 and the turn total is gone — you score nothing',
  'Bank at any time to add the turn total to your score',
  'First to 100 wins',
]

export interface PigPlayer {
  id: string
  name: string
  avatarUrl: string | null
  color: string
  score: number
}

export interface PigGame {
  id: string
  startedAt: string
  players: PigPlayer[]
  currentPlayerIndex: number
  target: number
  /** Face showing from the last roll, null before the first roll of a turn. */
  die: number | null
  turnScore: number
  phase: 'idle' | 'rolled' | 'busted' | 'game_over'
  winnerId: string | null
  lastAction: string
}

const STORAGE_KEY = 'pig_active_game'

export const usePigStore = defineStore('pig', () => {
  const game = ref<PigGame | null>(null)

  function load() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      if (!raw) return
      const parsed = JSON.parse(raw) as PigGame
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

  function startGame(players: Player[], target = PIG_TARGET) {
    game.value = {
      id: uuid(),
      startedAt: new Date().toISOString(),
      players: players.map(p => ({
        id: p.id, name: p.name, avatarUrl: p.avatarUrl, color: p.color, score: 0,
      })),
      currentPlayerIndex: 0,
      target,
      die: null,
      turnScore: 0,
      phase: 'idle',
      winnerId: null,
      lastAction: '',
    }
    persist()
  }

  function rollDie() {
    const g = game.value
    if (!g || (g.phase !== 'idle' && g.phase !== 'rolled')) return
    const face = Math.ceil(Math.random() * 6)
    g.die = face

    if (face === 1) {
      g.turnScore = 0
      g.phase = 'busted'
      g.lastAction = 'Rolled a 1 — turn total gone'
    } else {
      g.turnScore += face
      g.phase = 'rolled'
      g.lastAction = `+${face}`
    }
    persist()
  }

  function bank(): boolean {
    const g = game.value
    if (!g || g.phase !== 'rolled' || g.turnScore === 0) return false
    const p = g.players[g.currentPlayerIndex]
    if (!p) return false

    p.score += g.turnScore
    g.lastAction = `${p.name} banked ${g.turnScore}`

    if (p.score >= g.target) {
      g.winnerId = p.id
      g.phase = 'game_over'
      persist()
      return true
    }
    advance()
    return true
  }

  /** End a busted turn. */
  function endTurn() {
    const g = game.value
    if (!g || g.phase !== 'busted') return
    advance()
  }

  function advance() {
    const g = game.value
    if (!g) return
    g.currentPlayerIndex = (g.currentPlayerIndex + 1) % g.players.length
    g.die = null
    g.turnScore = 0
    g.phase = 'idle'
    persist()
  }

  function endGame() {
    game.value = null
    persist()
  }

  load()

  return { game, startGame, rollDie, bank, endTurn, endGame }
})
