import { ref } from 'vue'
import { defineStore } from 'pinia'
import { v4 as uuid } from 'uuid'
import {
  HAND_SIZE, PLAYER_COUNT, WINNING_SCORE, applyBagPenalty, cardId, deal,
  effectiveSuit, legalPlays, scoreSide, sortHand, trickWinner, type Card, type Suit,
} from '../lib/spades'
import type { Player } from '../types/index'

export interface SpadesPlayer {
  id: string
  name: string
  avatarUrl: string | null
  color: string
}

/** Seats 0 and 2 are one side, 1 and 3 the other — partners sit opposite. */
export const teamOf = (seat: number): 0 | 1 => (seat % 2 === 0 ? 0 : 1)

export interface SpadesGame {
  id: string
  startedAt: string
  players: SpadesPlayer[]
  hands: Card[][]
  dealerIndex: number
  /** Seat whose action it is. */
  turnIndex: number
  /**
   * 'pass'      — privacy screen; the device is being handed over
   * 'bidding'   — the seat at turnIndex is entering a bid
   * 'playing'   — the seat at turnIndex is choosing a card
   * 'trick_end' — trick complete, showing who took it
   * 'hand_over' — 13 tricks played, showing the score
   */
  phase: 'pass' | 'bidding' | 'playing' | 'trick_end' | 'hand_over' | 'game_over'
  bids: (number | null)[]
  tricksWon: number[]
  currentTrick: { seat: number; card: Card }[]
  leadSeat: number
  spadesBroken: boolean
  /** Team totals — index 0 is seats 0 and 2. */
  scores: [number, number]
  bags: [number, number]
  handNumber: number
  winnerTeam: 0 | 1 | null
  lastTrickWinnerSeat: number | null
  lastHandSummary: string
}

const STORAGE_KEY = 'spades_active_game'

export const useSpadesStore = defineStore('spades', () => {
  const game = ref<SpadesGame | null>(null)

  function load() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      if (!raw) return
      const parsed = JSON.parse(raw) as SpadesGame
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

  function startGame(players: Player[]) {
    if (players.length !== PLAYER_COUNT) return
    game.value = {
      id: uuid(),
      startedAt: new Date().toISOString(),
      players: players.map(p => ({
        id: p.id, name: p.name, avatarUrl: p.avatarUrl, color: p.color,
      })),
      hands: deal(),
      dealerIndex: 0,
      // Bidding and play both start left of the dealer.
      turnIndex: 1 % PLAYER_COUNT,
      phase: 'pass',
      bids: Array(PLAYER_COUNT).fill(null),
      tricksWon: Array(PLAYER_COUNT).fill(0),
      currentTrick: [],
      leadSeat: 1 % PLAYER_COUNT,
      spadesBroken: false,
      scores: [0, 0],
      bags: [0, 0],
      handNumber: 1,
      winnerTeam: null,
      lastTrickWinnerSeat: null,
      lastHandSummary: '',
    }
    persist()
  }

  /** Leave the privacy screen and let the seated player act. */
  function reveal() {
    const g = game.value
    if (!g || g.phase !== 'pass') return
    g.phase = g.bids.some(b => b === null) ? 'bidding' : 'playing'
    persist()
  }

  /** Hide the hand again and hand the device on. */
  function conceal() {
    const g = game.value
    if (!g) return
    g.phase = 'pass'
    persist()
  }

  function placeBid(bid: number) {
    const g = game.value
    if (!g || g.phase !== 'bidding') return
    if (bid < 0 || bid > HAND_SIZE) return

    g.bids[g.turnIndex] = bid
    const next = (g.turnIndex + 1) % PLAYER_COUNT

    if (g.bids.some(b => b === null)) {
      g.turnIndex = next
      g.phase = 'pass'
    } else {
      // Everyone has bid — play starts left of the dealer.
      g.turnIndex = (g.dealerIndex + 1) % PLAYER_COUNT
      g.leadSeat = g.turnIndex
      g.phase = 'pass'
    }
    persist()
  }

  /** Cards the seated player may legally play right now. */
  function legalForCurrent(): Card[] {
    const g = game.value
    if (!g) return []
    const led = g.currentTrick.length > 0 ? effectiveSuit(g.currentTrick[0]!.card) : null
    return legalPlays(g.hands[g.turnIndex] ?? [], led, g.spadesBroken)
  }

  function isLegal(card: Card): boolean {
    return legalForCurrent().some(c => cardId(c) === cardId(card))
  }

  function playCard(card: Card) {
    const g = game.value
    if (!g || g.phase !== 'playing') return
    if (!isLegal(card)) return

    const hand = g.hands[g.turnIndex]!
    const idx = hand.findIndex(c => cardId(c) === cardId(card))
    if (idx === -1) return
    hand.splice(idx, 1)

    if (effectiveSuit(card) === 'spades') g.spadesBroken = true
    g.currentTrick.push({ seat: g.turnIndex, card })

    if (g.currentTrick.length < PLAYER_COUNT) {
      g.turnIndex = (g.turnIndex + 1) % PLAYER_COUNT
      g.phase = 'pass'
      persist()
      return
    }

    // Trick complete. Resolve against the suit that was actually led.
    const led = effectiveSuit(g.currentTrick[0]!.card) as Suit
    const winIdx = trickWinner(g.currentTrick.map(t => t.card), led)
    const winSeat = g.currentTrick[winIdx]!.seat
    g.tricksWon[winSeat]!++
    g.lastTrickWinnerSeat = winSeat
    g.phase = 'trick_end'
    persist()
  }

  /** Clear the finished trick and lead the next one, or score the hand. */
  function nextTrick() {
    const g = game.value
    if (!g || g.phase !== 'trick_end') return
    g.currentTrick = []

    const played = g.tricksWon.reduce((a, b) => a + b, 0)
    if (played >= HAND_SIZE) { scoreHand(); return }

    g.turnIndex = g.lastTrickWinnerSeat ?? g.leadSeat
    g.leadSeat = g.turnIndex
    g.phase = 'pass'
    persist()
  }

  function scoreHand() {
    const g = game.value
    if (!g) return

    const parts: string[] = []
    for (const team of [0, 1] as const) {
      const seats = [0, 1, 2, 3].filter(s => teamOf(s) === team)
      // A nil bid contributes nothing to the partnership contract, so it is excluded from
      // the combined bid and scored on its own.
      const contract = seats.reduce((sum, s) => sum + (g.bids[s] === 0 ? 0 : g.bids[s] ?? 0), 0)
      const tricks = seats.reduce((sum, s) => sum + (g.tricksWon[s] ?? 0), 0)
      const nilSeats = seats.filter(s => g.bids[s] === 0)
      const nilBids = nilSeats.map(s => ({ nil: true, tricks: g.tricksWon[s] ?? 0 }))
      // Tricks taken by a nil bidder do not count toward the partner's contract.
      const contractTricks = tricks - nilBids.reduce((sum, n) => sum + n.tricks, 0)

      const result = scoreSide(contract, contractTricks, nilBids)
      g.scores[team] += result.points
      g.bags[team] += result.bags

      const penalty = applyBagPenalty(g.bags[team])
      g.scores[team] += penalty.score
      g.bags[team] = penalty.bags

      const names = seats.map(s => g.players[s]?.name ?? '').join(' & ')
      parts.push(`${names}: bid ${contract}${nilSeats.length ? ' + nil' : ''}, made ${contractTricks} (${result.points >= 0 ? '+' : ''}${result.points})`)
    }
    g.lastHandSummary = parts.join('  ·  ')

    // A side only wins by reaching 500 outright and ahead — a tie plays another hand.
    const [a, b] = g.scores
    if ((a >= WINNING_SCORE || b >= WINNING_SCORE) && a !== b) {
      g.winnerTeam = a > b ? 0 : 1
      g.phase = 'game_over'
    } else {
      g.phase = 'hand_over'
    }
    persist()
  }

  /** Deal the next hand. */
  function nextHand() {
    const g = game.value
    if (!g || g.phase !== 'hand_over') return
    g.hands = deal()
    g.dealerIndex = (g.dealerIndex + 1) % PLAYER_COUNT
    g.turnIndex = (g.dealerIndex + 1) % PLAYER_COUNT
    g.leadSeat = g.turnIndex
    g.bids = Array(PLAYER_COUNT).fill(null)
    g.tricksWon = Array(PLAYER_COUNT).fill(0)
    g.currentTrick = []
    g.spadesBroken = false
    g.lastTrickWinnerSeat = null
    g.handNumber++
    g.phase = 'pass'
    persist()
  }

  function endGame() {
    game.value = null
    persist()
  }

  load()

  return {
    game, startGame, reveal, conceal, placeBid, playCard, nextTrick, nextHand, endGame,
    legalForCurrent, isLegal, sortHand,
  }
})
