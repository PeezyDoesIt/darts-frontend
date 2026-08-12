import { ref } from 'vue'
import { defineStore } from 'pinia'
import { v4 as uuid } from 'uuid'
import { FARKLE_TARGET, hasAnyScore, scoreSelection } from '../lib/farkle'
import type { Player } from '../types/index'

export interface FarklePlayer {
  id: string
  name: string
  avatarUrl: string | null
  color: string
  score: number
}

export interface FarkleGame {
  /** Stable per-game id, sent to the API as the idempotency key. */
  id: string
  startedAt: string
  players: FarklePlayer[]
  currentPlayerIndex: number
  target: number
  /** The dice currently in play. Shrinks as dice are set aside, refills on hot dice. */
  dice: number[]
  /** Selection mask over `dice`. */
  selected: boolean[]
  /** Banked-this-turn score, lost on a farkle. */
  turnScore: number
  /**
   * 'idle'    — waiting for a roll
   * 'rolled'  — dice on the table, player choosing what to keep
   * 'farkled' — nothing scoring in the roll, turn score forfeit
   */
  phase: 'idle' | 'rolled' | 'farkled' | 'game_over'
  winnerId: string | null
  lastAction: string
}

const STORAGE_KEY = 'farkle_active_game'
const DICE_COUNT = 6

const roll = (n: number) => Array.from({ length: n }, () => Math.ceil(Math.random() * 6))

export const useFarkleStore = defineStore('farkle', () => {
  const game = ref<FarkleGame | null>(null)

  function load() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      if (!raw) return
      const parsed = JSON.parse(raw) as FarkleGame
      // Never restore a finished game — doing so re-runs result recording on every mount.
      if (parsed.phase === 'game_over') return
      if (!parsed.id) parsed.id = uuid()
      if (!parsed.startedAt) parsed.startedAt = new Date().toISOString()
      game.value = parsed
    } catch { /* a corrupt or stale save is discarded rather than crashing the store */ }
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
    } catch {
      // Storage quota exceeded — game still runs in memory
    }
  }

  function startGame(players: Player[], target = FARKLE_TARGET) {
    game.value = {
      id: uuid(),
      startedAt: new Date().toISOString(),
      players: players.map(p => ({
        id: p.id, name: p.name, avatarUrl: p.avatarUrl, color: p.color, score: 0,
      })),
      currentPlayerIndex: 0,
      target,
      dice: [],
      selected: [],
      turnScore: 0,
      phase: 'idle',
      winnerId: null,
      lastAction: '',
    }
    persist()
  }

  /** Dice currently selected, as face values. */
  function selectedFaces(): number[] {
    const g = game.value
    if (!g) return []
    return g.dice.filter((_, i) => g.selected[i])
  }

  /** Value of the current selection, or null when it contains a die that cannot score. */
  function selectionValue(): number | null {
    const faces = selectedFaces()
    return faces.length === 0 ? null : scoreSelection(faces)
  }

  function rollDice() {
    const g = game.value
    if (!g || (g.phase !== 'idle' && g.phase !== 'rolled')) return
    // Rolling with a live selection would silently discard it, so require it be set aside first.
    if (g.phase === 'rolled') return

    const count = g.dice.length === 0 ? DICE_COUNT : g.dice.length
    g.dice = roll(count)
    g.selected = g.dice.map(() => false)

    if (!hasAnyScore(g.dice)) {
      g.phase = 'farkled'
      g.turnScore = 0
      g.lastAction = 'FARKLE — nothing scoring'
    } else {
      g.phase = 'rolled'
      g.lastAction = ''
    }
    persist()
  }

  function toggleDie(i: number) {
    const g = game.value
    if (!g || g.phase !== 'rolled') return
    g.selected[i] = !g.selected[i]
    persist()
  }

  /**
   * Move the selected dice out of play and add their value to the turn score. Refuses an
   * illegal selection outright rather than scoring the legal subset, so a player can never
   * quietly retire a dead die alongside a scoring one.
   */
  function setAside(): boolean {
    const g = game.value
    if (!g || g.phase !== 'rolled') return false
    const value = selectionValue()
    if (value === null) return false

    g.turnScore += value
    const kept = g.dice.filter((_, i) => !g.selected[i])
    // Hot dice: clearing all six earns the whole set back with the turn score intact.
    g.dice = kept.length === 0 ? [] : kept
    g.selected = g.dice.map(() => false)
    g.lastAction = kept.length === 0 ? `+${value} — HOT DICE, roll all six` : `+${value}`
    g.phase = 'idle'
    persist()
    return true
  }

  /** Bank the turn score and pass the dice. Wins immediately on reaching the target. */
  function bank(): boolean {
    const g = game.value
    if (!g || g.turnScore === 0 || g.phase === 'game_over') return false
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

  /** End a farkled turn with nothing scored. */
  function endTurn() {
    const g = game.value
    if (!g || g.phase !== 'farkled') return
    advance()
  }

  function advance() {
    const g = game.value
    if (!g) return
    g.currentPlayerIndex = (g.currentPlayerIndex + 1) % g.players.length
    g.dice = []
    g.selected = []
    g.turnScore = 0
    g.phase = 'idle'
    persist()
  }

  function endGame() {
    game.value = null
    persist()
  }

  load()

  return {
    game, startGame, rollDice, toggleDie, setAside, bank, endTurn, endGame,
    selectedFaces, selectionValue,
  }
})
