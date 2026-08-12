import { ref } from 'vue'
import { defineStore } from 'pinia'
import { v4 as uuid } from 'uuid'
import type { Player } from '../types/index'
import {
  buildShoe, dealerShouldHit, handValue, isBlackjack, isBust,
  payoutMultiplier, settle, type Outcome, type PipCard,
} from '../lib/blackjack'

export const STARTING_CHIPS = 100
export const DEFAULT_BET = 10
export const DEFAULT_DECKS = 6
/** Reshuffle once the shoe is this low rather than dealing it to the last card. */
export const RESHUFFLE_AT = 15

export const BLACKJACK_RULES: string[] = [
  'Beat the dealer without going over 21',
  'Court cards count ten, an ace counts one or eleven',
  'Hit to take another card, stand to keep what you have',
  'Go over 21 and you lose, even if the dealer busts after you',
  'Two-card 21 is blackjack and pays three to two',
  'The dealer draws to 16 and stands on all 17s',
]

export type PlayerStatus = 'betting' | 'playing' | 'stood' | 'bust' | 'blackjack'

export interface BlackjackPlayer {
  id: string
  name: string
  avatarUrl: string | null
  color: string
  chips: number
  bet: number
  hand: PipCard[]
  status: PlayerStatus
  /** Set once the round settles; null while the hand is live. */
  outcome: Outcome | null
}

export interface BlackjackGame {
  id: string
  startedAt: string
  players: BlackjackPlayer[]
  dealer: PipCard[]
  shoe: PipCard[]
  currentPlayerIndex: number
  /**
   * betting -> playing -> dealer -> settled, then back to betting for the next round.
   * game_over is only reached when nobody can afford to bet.
   */
  phase: 'betting' | 'playing' | 'dealer' | 'settled' | 'game_over'
  round: number
  lastAction: string
}

const STORAGE_KEY = 'blackjack_active_game'

export const useBlackjackStore = defineStore('blackjack', () => {
  const game = ref<BlackjackGame | null>(null)

  function load() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      if (!raw) return
      const parsed = JSON.parse(raw) as BlackjackGame
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
    } catch { /* best effort: storage can be full, or unavailable in private mode */ }
  }

  /** Draws from the shoe, rebuilding it first if it has run low. */
  function draw(g: BlackjackGame): PipCard {
    if (g.shoe.length <= RESHUFFLE_AT) g.shoe = buildShoe(DEFAULT_DECKS)
    return g.shoe.pop()!
  }

  function startGame(players: Player[], chips = STARTING_CHIPS) {
    game.value = {
      id: uuid(),
      startedAt: new Date().toISOString(),
      players: players.map(p => ({
        id: p.id, name: p.name, avatarUrl: p.avatarUrl, color: p.color,
        chips, bet: 0, hand: [], status: 'betting', outcome: null,
      })),
      dealer: [],
      shoe: buildShoe(DEFAULT_DECKS),
      currentPlayerIndex: 0,
      phase: 'betting',
      round: 1,
      lastAction: 'Place your bets',
    }
    persist()
  }

  function setBet(playerId: string, bet: number) {
    const g = game.value
    if (!g || g.phase !== 'betting') return
    const p = g.players.find(x => x.id === playerId)
    if (!p) return
    p.bet = Math.max(0, Math.min(bet, p.chips))
    persist()
  }

  /** Deals two cards to every player with a bet, and two to the dealer. */
  function deal() {
    const g = game.value
    if (!g || g.phase !== 'betting') return

    const live = g.players.filter(p => p.bet > 0)
    if (!live.length) return

    for (const p of g.players) {
      p.hand = []
      p.outcome = null
      p.status = p.bet > 0 ? 'playing' : 'betting'
      // The stake leaves the stack now, the way chips go onto the felt before the deal.
      // payoutMultiplier returns stake-inclusive multiples — 2 for a win, 1 for a push — so
      // if the bet were still sitting in chips a winner would be paid twice and a loser
      // would risk nothing.
      p.chips -= p.bet
    }
    g.dealer = []

    // Two rounds of one card each, as it is dealt at a table.
    for (let i = 0; i < 2; i++) {
      for (const p of live) p.hand.push(draw(g))
      g.dealer.push(draw(g))
    }

    for (const p of live) {
      if (isBlackjack(p.hand)) p.status = 'blackjack'
    }

    g.phase = 'playing'
    g.currentPlayerIndex = nextLiveIndex(g, -1)
    g.lastAction = 'Cards are out'
    // Everyone may have been dealt blackjack, which leaves nobody to act.
    if (g.currentPlayerIndex === -1) playDealer()
    else persist()
  }

  /** Index of the next player still able to act, or -1 if there is none. */
  function nextLiveIndex(g: BlackjackGame, from: number): number {
    for (let i = from + 1; i < g.players.length; i++) {
      if (g.players[i]!.status === 'playing') return i
    }
    return -1
  }

  function current(): BlackjackPlayer | null {
    const g = game.value
    if (!g || g.currentPlayerIndex < 0) return null
    return g.players[g.currentPlayerIndex] ?? null
  }

  function hit() {
    const g = game.value
    const p = current()
    if (!g || !p || g.phase !== 'playing' || p.status !== 'playing') return

    p.hand.push(draw(g))
    if (isBust(p.hand)) {
      p.status = 'bust'
      g.lastAction = `${p.name} busts on ${handValue(p.hand).total}`
      advance()
    } else {
      g.lastAction = `${p.name} hits`
      persist()
    }
  }

  function stand() {
    const g = game.value
    const p = current()
    if (!g || !p || g.phase !== 'playing' || p.status !== 'playing') return
    p.status = 'stood'
    g.lastAction = `${p.name} stands on ${handValue(p.hand).total}`
    advance()
  }

  function advance() {
    const g = game.value
    if (!g) return
    const next = nextLiveIndex(g, g.currentPlayerIndex)
    if (next === -1) playDealer()
    else { g.currentPlayerIndex = next; persist() }
  }

  /**
   * The dealer only draws when somebody can still be beaten. With every hand busted the
   * dealer's cards change nothing, and turning them over is just theatre.
   */
  function playDealer() {
    const g = game.value
    if (!g) return
    g.phase = 'dealer'

    const contested = g.players.some(p => p.bet > 0 && p.status !== 'bust')
    if (contested) {
      while (dealerShouldHit(g.dealer)) g.dealer.push(draw(g))
    }

    settleRound()
  }

  function settleRound() {
    const g = game.value
    if (!g) return

    for (const p of g.players) {
      if (p.bet <= 0) continue
      p.outcome = settle(p.hand, g.dealer)
      p.chips += Math.round(p.bet * payoutMultiplier(p.outcome))
    }

    g.phase = 'settled'
    const d = handValue(g.dealer)
    g.lastAction = isBust(g.dealer)
      ? `Dealer busts on ${d.total}`
      : `Dealer stands on ${d.total}`
    persist()
  }

  /** Clears the table for the next hand, or ends the game if nobody can bet. */
  function nextRound() {
    const g = game.value
    if (!g || g.phase !== 'settled') return

    for (const p of g.players) {
      p.hand = []
      p.bet = 0
      p.outcome = null
      p.status = 'betting'
    }
    g.dealer = []
    g.round++

    if (!g.players.some(p => p.chips > 0)) {
      g.phase = 'game_over'
      g.lastAction = 'Everyone is out of chips'
    } else {
      g.phase = 'betting'
      g.lastAction = 'Place your bets'
    }
    persist()
  }

  function endGame() {
    game.value = null
    persist()
  }

  return {
    game, load, persist, startGame, setBet, deal, hit, stand, nextRound, endGame, current,
  }
})
