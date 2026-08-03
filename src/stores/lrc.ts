import { ref } from 'vue'
import { defineStore } from 'pinia'

export type LRCDiceFace = 'L' | 'R' | 'C' | '●'
export type LRCDiceStyle = 'neon' | 'casino' | 'retro' | 'wood'

export interface LRCPlayer {
  id: string
  name: string
  avatarUrl: string | null
  color: string
  chips: number
  isGuest?: boolean
}

export interface LRCGame {
  players: LRCPlayer[]
  centerPot: number
  currentPlayerIndex: number
  diceResults: LRCDiceFace[]
  diceCount: number
  phase: 'idle' | 'rolling' | 'result' | 'game_over'
  winnerId: string | null
  diceStyle: LRCDiceStyle
  round: number
  lastAction: string
}

const STORAGE_KEY = 'lrc_active_game'
const FACES: LRCDiceFace[] = ['L', 'R', 'C', '●', '●', '●']

export const useLRCStore = defineStore('lrc', () => {
  const game = ref<LRCGame | null>(null)

  function load() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      if (raw) {
        const parsed = JSON.parse(raw) as LRCGame
        if (parsed.phase !== 'game_over') game.value = parsed
      }
    } catch {}
  }

  function persist() {
    if (game.value) localStorage.setItem(STORAGE_KEY, JSON.stringify(game.value))
    else localStorage.removeItem(STORAGE_KEY)
  }

  function startGame(players: Omit<LRCPlayer, 'chips'>[], diceStyle: LRCDiceStyle) {
    game.value = {
      players: players.map(p => ({ ...p, chips: 3 })),
      centerPot: 0,
      currentPlayerIndex: 0,
      diceResults: [],
      diceCount: 0,
      phase: 'idle',
      winnerId: null,
      diceStyle,
      round: 1,
      lastAction: '',
    }
    persist()
  }

  function rollDice() {
    if (!game.value || game.value.phase !== 'idle') return
    const g = game.value
    const player = g.players[g.currentPlayerIndex]!
    if (player.chips === 0) return

    const diceCount = Math.min(player.chips, 3)
    const results: LRCDiceFace[] = Array.from({ length: diceCount }, () =>
      FACES[Math.floor(Math.random() * 6)]!
    )

    g.diceResults = results
    g.diceCount = diceCount
    g.phase = 'rolling'

    setTimeout(() => {
      if (!game.value || game.value.phase !== 'rolling') return
      const g = game.value
      const n = g.players.length
      const player = g.players[g.currentPlayerIndex]!

      const parts: string[] = []
      results.forEach(face => {
        if (face === 'L') {
          player.chips--
          const li = (g.currentPlayerIndex - 1 + n) % n
          g.players[li]!.chips++
          parts.push(`→ ${g.players[li]!.name}`)
        } else if (face === 'R') {
          player.chips--
          const ri = (g.currentPlayerIndex + 1) % n
          g.players[ri]!.chips++
          parts.push(`→ ${g.players[ri]!.name}`)
        } else if (face === 'C') {
          player.chips--
          g.centerPot++
          parts.push('→ CENTER')
        }
      })

      g.lastAction = parts.length
        ? parts.join('   ·   ')
        : `${player.name} keeps all chips!`

      const alive = g.players.filter(p => p.chips > 0)
      if (alive.length === 1) {
        g.winnerId = alive[0]!.id
        g.phase = 'game_over'
      } else {
        g.phase = 'result'
      }
      persist()
    }, 1100)
  }

  function nextTurn() {
    if (!game.value || game.value.phase !== 'result') return
    const g = game.value
    const n = g.players.length
    const prevIdx = g.currentPlayerIndex
    let next = (prevIdx + 1) % n
    const start = next
    while (g.players[next]!.chips === 0) {
      next = (next + 1) % n
      if (next === start) break
    }
    if (next <= prevIdx) g.round++
    g.currentPlayerIndex = next
    g.diceResults = []
    g.diceCount = 0
    g.phase = 'idle'
    g.lastAction = ''
    persist()
  }

  function endGame() {
    game.value = null
    persist()
  }

  load()

  return { game, startGame, rollDice, nextTurn, endGame }
})
