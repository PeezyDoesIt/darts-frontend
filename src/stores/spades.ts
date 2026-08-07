import { ref } from 'vue'
import { defineStore } from 'pinia'
import { v4 as uuid } from 'uuid'
import {
  HAND_SIZE, PLAYER_COUNT, applyBagPenalty, cardId, deal,
  effectiveSuit, legalPlays, scoreSide, sortHand, trickWinner, winnerTeamFor,
  type Card, type SpadesVariant, type Suit,
} from '../lib/spades'
import { chooseBid, chooseCard } from '../lib/spadesBot'
import type { Player } from '../types/index'

/**
 * A seat filled by the computer rather than a person. The flag is explicit rather than
 * inferred from a missing field, so adding a field to either shape can never silently
 * turn a bot into a human or the reverse.
 */
export interface BotSeat { id: string; name: string; color: string; isBot: true }

export interface SpadesPlayer {
  id: string
  name: string
  avatarUrl: string | null
  color: string
  /** Bot seats never get a privacy screen — there is nobody to hide the hand from. */
  isBot: boolean
}

/** Seats 0 and 2 are one side, 1 and 3 the other — partners sit opposite. */
export const teamOf = (seat: number): 0 | 1 => (seat % 2 === 0 ? 0 : 1)

export interface SpadesGame {
  id: string
  startedAt: string
  /** Which deck this game is being played with — fixed for the whole game. */
  variant: SpadesVariant
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
      // Games saved before the variant existed were all played with the joker deck.
      if (!parsed.variant) parsed.variant = 'wild'
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

  /**
   * `seats` is the table in seat order. A string entry names a bot; a Player is a person.
   * Order matters — seats 0 and 2 are partners, so mixing humans and bots changes who is
   * playing with whom.
   */
  function startGame(seats: (Player | BotSeat)[], variant: SpadesVariant = 'wild') {
    if (seats.length !== PLAYER_COUNT) return
    game.value = {
      id: uuid(),
      startedAt: new Date().toISOString(),
      players: seats.map(p => ({
        id: p.id,
        name: p.name,
        avatarUrl: 'isBot' in p ? null : p.avatarUrl,
        color: p.color,
        isBot: 'isBot' in p,
      })),
      variant,
      hands: deal(variant),
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
    // Send the first seat through the same hand-off, so a bot dealt the opening bid does
    // not sit behind a "pass the device" screen nobody can dismiss meaningfully.
    handOffTo(1 % PLAYER_COUNT)
    persist()
  }

  /**
   * The privacy screen only earns its tap when there is somebody to hide the hand from.
   * One human against bots would otherwise be told to "pass the device" to themselves
   * before every bid and every one of the 13 tricks in a hand.
   */
  function needsPrivacyScreen(): boolean {
    const g = game.value
    if (!g) return false
    return g.players.filter(p => !p.isBot).length > 1
  }

  /**
   * Move the turn to `seat`. A human at a shared table gets the privacy screen; a bot goes
   * straight to its action phase, because there is nobody to hide the hand from and a "pass
   * the device to Ada" screen would be nonsense. A lone human skips it for the same reason.
   */
  function handOffTo(seat: number) {
    const g = game.value
    if (!g) return
    g.turnIndex = seat
    const actionPhase = g.bids.some(b => b === null) ? 'bidding' : 'playing'
    const hide = !g.players[seat]?.isBot && needsPrivacyScreen()
    g.phase = hide ? 'pass' : actionPhase
  }

  /** True when the store is waiting on a bot rather than a person. */
  function isBotTurn(): boolean {
    const g = game.value
    if (!g) return false
    if (g.phase !== 'bidding' && g.phase !== 'playing') return false
    return !!g.players[g.turnIndex]?.isBot
  }

  /**
   * Play one bot decision. Deliberately a single step rather than a loop, so the view can
   * pace the seats and the player can see what happened.
   */
  function botAct() {
    const g = game.value
    if (!g || !isBotTurn()) return
    const seat = g.turnIndex
    const hand = g.hands[seat] ?? []
    if (hand.length === 0 && g.phase === 'playing') return

    if (g.phase === 'bidding') {
      placeBid(chooseBid(hand))
      return
    }
    const partnerSeat = (seat + 2) % PLAYER_COUNT
    playCard(chooseCard(hand, {
      trick: g.currentTrick,
      seat,
      partnerSeat,
      spadesBroken: g.spadesBroken,
      myBid: g.bids[seat] ?? null,
      partnerBid: g.bids[partnerSeat] ?? null,
    }))
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

    if (g.bids.some(b => b === null)) {
      handOffTo((g.turnIndex + 1) % PLAYER_COUNT)
    } else {
      // Everyone has bid — play starts left of the dealer.
      const first = (g.dealerIndex + 1) % PLAYER_COUNT
      g.leadSeat = first
      handOffTo(first)
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
      handOffTo((g.turnIndex + 1) % PLAYER_COUNT)
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

    const lead = g.lastTrickWinnerSeat ?? g.leadSeat
    g.leadSeat = lead
    handOffTo(lead)
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

    const winner = winnerTeamFor(g.scores)
    g.winnerTeam = winner
    g.phase = winner === null ? 'hand_over' : 'game_over'
    persist()
  }

  /** Deal the next hand. */
  function nextHand() {
    const g = game.value
    if (!g || g.phase !== 'hand_over') return
    g.hands = deal(g.variant)
    g.dealerIndex = (g.dealerIndex + 1) % PLAYER_COUNT
    g.bids = Array(PLAYER_COUNT).fill(null)
    g.tricksWon = Array(PLAYER_COUNT).fill(0)
    g.currentTrick = []
    g.spadesBroken = false
    g.lastTrickWinnerSeat = null
    g.handNumber++
    // Bids are cleared first so handOffTo sends a bot straight into bidding, not playing.
    const first = (g.dealerIndex + 1) % PLAYER_COUNT
    g.leadSeat = first
    handOffTo(first)
    persist()
  }

  function endGame() {
    game.value = null
    persist()
  }

  load()

  return {
    game, startGame, reveal, conceal, placeBid, playCard, nextTrick, nextHand, endGame,
    legalForCurrent, isLegal, sortHand, isBotTurn, botAct,
  }
})
