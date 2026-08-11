import { ref } from 'vue'
import { defineStore } from 'pinia'
import { v4 as uuid } from 'uuid'
import {
  BOARD, HAND_SIZE, PLAYER_COUNT, WILD_MAX_CONSECUTIVE_SETS, applyHandToSide, cardId, deal,
  effectiveSuit, legalPlays, minBidFor, nilAllowedFor, scoreSide, sideCount, sideOf,
  sortHand, targetFor, trickWinner, wildLossTeam, winnerTeamFor,
  type Card, type SpadesMode, type SpadesVariant, type Suit,
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

/**
 * Partners sit opposite: seats 0 and 2 against 1 and 3. Kept for partnership games only —
 * anything that has to work in solo play wants `sideOf(seat, mode)` instead.
 */
export const teamOf = (seat: number): 0 | 1 => (seat % 2 === 0 ? 0 : 1)

/** One side's hand result, kept structured so the end-of-hand screen can lay it out. */
export interface HandSideResult {
  side: number
  names: string
  /** Combined contract, excluding any nil. */
  bid: number
  /** Books that counted toward the contract. */
  books: number
  nils: number
  nilsMade: number
  /** Points won this hand, before the bag penalty. Never negative. */
  points: number
  /** Missed the contract, so the hand scored nothing. */
  set: boolean
  bags: number
  /** Sandbag penalty applied this hand — negative, or 0. */
  penalty: number
  /** Running total after this hand. */
  total: number
}

/** One seat's own bid and books, shown at the end of the hand rather than during it. */
export interface HandSeatResult {
  seat: number
  name: string
  bid: number
  books: number
  nil: boolean
}

export interface SpadesGame {
  id: string
  startedAt: string
  /** Which deck this game is being played with — fixed for the whole game. */
  variant: SpadesVariant
  /** Partners or every player for themselves — fixed for the whole game. */
  mode: SpadesMode
  players: SpadesPlayer[]
  hands: Card[][]
  dealerIndex: number
  /** Seat whose action it is. */
  turnIndex: number
  /**
   * 'pass'      — privacy screen; the device is being handed over
   * 'bidding'   — the seat at turnIndex is entering a bid
   * 'playing'   — the seat at turnIndex is choosing a card
   * 'trick_end' — book complete, showing who took it
   * 'hand_over' — 13 books played, showing the score
   */
  phase: 'pass' | 'bidding' | 'playing' | 'trick_end' | 'hand_over' | 'game_over'
  bids: (number | null)[]
  /** Books taken per seat. Named for tricks because saved games store it under that key. */
  tricksWon: number[]
  currentTrick: { seat: number; card: Card }[]
  leadSeat: number
  spadesBroken: boolean
  /** Score per side: two entries in partners, four in solo. */
  scores: number[]
  bags: number[]
  /** Hands each side has been set. Wild Style partnership games lose at three. */
  setCount: number[]
  /** Hands each side has been set in a row. Wild Style partnership games lose at two. */
  setStreak: number[]
  handNumber: number
  /** Winning side index, or null while the game is live. */
  winnerTeam: number | null
  lastTrickWinnerSeat: number | null
  lastHandSides: HandSideResult[]
  lastHandSeats: HandSeatResult[]
  /** Why a side lost outright, when the game ended on the Wild Style rules rather than score. */
  lossNote: string
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
      // Games saved before solo play existed were all partnerships.
      if (!parsed.mode) parsed.mode = 'partners'
      // scores and bags were fixed two-element tuples until solo play added four sides.
      const sides = sideCount(parsed.mode)
      if (!Array.isArray(parsed.scores) || parsed.scores.length !== sides) {
        parsed.scores = Array(sides).fill(0)
      }
      if (!Array.isArray(parsed.bags) || parsed.bags.length !== sides) {
        parsed.bags = Array(sides).fill(0)
      }
      if (!Array.isArray(parsed.lastHandSides)) parsed.lastHandSides = []
      if (!Array.isArray(parsed.lastHandSeats)) parsed.lastHandSeats = []
      if (!Array.isArray(parsed.setCount) || parsed.setCount.length !== sides) {
        parsed.setCount = Array(sides).fill(0)
      }
      if (!Array.isArray(parsed.setStreak) || parsed.setStreak.length !== sides) {
        parsed.setStreak = Array(sides).fill(0)
      }
      if (typeof parsed.lossNote !== 'string') parsed.lossNote = ''
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
   * Order matters in a partnership game — seats 0 and 2 are partners, so the order decides
   * who is playing with whom. In solo it only sets the turn rotation.
   */
  function startGame(
    seats: (Player | BotSeat)[],
    variant: SpadesVariant = 'wild',
    mode: SpadesMode = 'partners',
  ) {
    if (seats.length !== PLAYER_COUNT) return
    const sides = sideCount(mode)
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
      mode,
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
      scores: Array(sides).fill(0),
      bags: Array(sides).fill(0),
      setCount: Array(sides).fill(0),
      setStreak: Array(sides).fill(0),
      handNumber: 1,
      winnerTeam: null,
      lastTrickWinnerSeat: null,
      lastHandSides: [],
      lastHandSeats: [],
      lossNote: '',
    }
    // Wild Style opens on an auto-bid: every seat is bid from its own hand by the same
    // evaluation the computer players use, so nobody chooses a contract they can be
    // instantly lost by. With no bids left outstanding, handOffTo sends the first seat
    // straight into play rather than bidding.
    if (variant === 'wild' && mode === 'partners') {
      const auto = game.value.hands.map(hand => chooseBid(hand))
      // The bot evaluation bids each hand on its own merits and knows nothing about board,
      // so a light side can come in under 4. Lift the weaker partner until it reaches board.
      for (const side of [0, 1]) {
        const seats = [0, 1, 2, 3].filter(s => sideOf(s, mode) === side)
        const contract = seats.reduce((sum, s) => sum + (auto[s] === 0 ? 0 : auto[s] ?? 0), 0)
        // A side bidding nothing but nil has no contract, so board does not apply to it.
        if (contract === 0 || contract >= BOARD) continue
        const lift = seats.filter(s => auto[s] !== 0)
          .sort((a, b) => (auto[a] ?? 0) - (auto[b] ?? 0))[0]
        if (lift !== undefined) auto[lift] = (auto[lift] ?? 0) + (BOARD - contract)
      }
      game.value.bids = auto
    }
    // Send the first seat through the same hand-off, so a bot dealt the opening bid does
    // not sit behind a "pass the device" screen nobody can dismiss meaningfully.
    handOffTo(1 % PLAYER_COUNT)
    persist()
  }

  /**
   * The privacy screen only earns its tap when there is somebody to hide the hand from.
   * One human against bots would otherwise be told to "pass the device" to themselves
   * before every bid and every one of the 13 books in a hand.
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
      // Board applies to the computer too, and the evaluation knows nothing about it.
      const min = minBidForSeat(seat)
      const wanted = chooseBid(hand)
      const wantsNil = wanted === 0 && nilAllowedForSeat(seat)
      placeBid(wantsNil ? 0 : Math.max(min, wanted))
      return
    }
    // In solo there is nobody to protect or duck under, so the bot is told it has no
    // partner rather than being pointed at the seat opposite.
    const partnerSeat = g.mode === 'partners' ? (seat + 2) % PLAYER_COUNT : -1
    const choice = chooseCard(hand, {
      trick: g.currentTrick,
      seat,
      partnerSeat,
      spadesBroken: g.spadesBroken,
      myBid: g.bids[seat] ?? null,
      partnerBid: partnerSeat >= 0 ? g.bids[partnerSeat] ?? null : null,
    })
    // playCard refuses an illegal card, and a refused bot turn is a game that sits there
    // forever with no way forward. The heuristics should never produce one — but if they
    // ever do, take any legal card instead of hanging the table.
    if (isLegal(choice)) { playCard(choice); return }
    const fallback = legalForCurrent()[0]
    if (fallback) playCard(fallback)
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
    // Board: a side's contract is either 0 (both nil) or at least BOARD. Both halves of that
    // are enforced here, so bid ORDER can never change what is legal.
    if (bid === 0 && !nilAllowedForSeat(g.turnIndex)) return
    if (bid !== 0 && bid < minBidForSeat(g.turnIndex)) return

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

  /**
   * The lowest number the given seat may bid, once board is taken into account. Exposed so
   * the bid grid can disable what the store would refuse rather than letting a player tap a
   * button that silently does nothing.
   */
  function minBidForSeat(seat: number): number {
    const g = game.value
    if (!g) return 1
    if (g.mode !== 'partners') return 1
    const partner = (seat + 2) % PLAYER_COUNT
    return minBidFor(g.bids[partner] ?? null, g.mode)
  }

  /**
   * Whether the given seat may declare nil. False when the partner has already bid a number
   * short of board, since nil would leave the side under it.
   */
  function nilAllowedForSeat(seat: number): boolean {
    const g = game.value
    if (!g) return true
    if (g.mode !== 'partners') return true
    const partner = (seat + 2) % PLAYER_COUNT
    return nilAllowedFor(g.bids[partner] ?? null, g.mode)
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

    // Book complete. Resolve against the suit that was actually led.
    const led = effectiveSuit(g.currentTrick[0]!.card) as Suit
    const winIdx = trickWinner(g.currentTrick.map(t => t.card), led)
    const winSeat = g.currentTrick[winIdx]!.seat
    g.tricksWon[winSeat]!++
    g.lastTrickWinnerSeat = winSeat
    g.phase = 'trick_end'
    persist()
  }

  /** Clear the finished book and lead the next one, or score the hand. */
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

    const sides: HandSideResult[] = []
    const wasSet: boolean[] = []
    for (let side = 0; side < sideCount(g.mode); side++) {
      const seats = [0, 1, 2, 3].filter(s => sideOf(s, g.mode) === side)
      // A nil bid contributes nothing to the contract, so it is excluded from the combined
      // bid and scored on its own.
      const contract = seats.reduce((sum, s) => sum + (g.bids[s] === 0 ? 0 : g.bids[s] ?? 0), 0)
      const books = seats.reduce((sum, s) => sum + (g.tricksWon[s] ?? 0), 0)
      const nilSeats = seats.filter(s => g.bids[s] === 0)
      const nilBids = nilSeats.map(s => ({ nil: true, tricks: g.tricksWon[s] ?? 0 }))
      // Books taken by a nil bidder do not count toward the contract.
      const contractBooks = books - nilBids.reduce((sum, n) => sum + n.tricks, 0)

      // Being set is missing the contract. A side bidding nothing but nil has no contract to
      // miss, so it cannot be set however its nils land.
      wasSet[side] = contract > 0 && contractBooks < contract

      const result = scoreSide(contract, contractBooks, nilBids)
      const before = g.scores[side] ?? 0
      const next = applyHandToSide(
        {
          score: before,
          bags: g.bags[side] ?? 0,
          setCount: g.setCount[side] ?? 0,
          setStreak: g.setStreak[side] ?? 0,
        },
        result,
        wasSet[side]!,
      )
      g.scores[side] = next.score
      g.bags[side] = next.bags
      g.setCount[side] = next.setCount
      g.setStreak[side] = next.setStreak

      sides.push({
        side,
        names: seats.map(s => g.players[s]?.name ?? '').join(' & '),
        bid: contract,
        books: contractBooks,
        nils: nilSeats.length,
        nilsMade: nilSeats.filter(s => (g.tricksWon[s] ?? 0) === 0).length,
        points: result.points,
        set: wasSet[side]!,
        bags: result.bags,
        // The penalty is the difference the standing shows beyond the points won, which is
        // the only place a total can fall.
        penalty: next.score - before - result.points,
        total: next.score,
      })
    }
    g.lastHandSides = sides
    // Individual bids are held back until the hand is over — during play the table only
    // sees the side's combined contract.
    g.lastHandSeats = g.players.map((p, s) => ({
      seat: s,
      name: p.name,
      bid: g.bids[s] ?? 0,
      books: g.tricksWon[s] ?? 0,
      nil: g.bids[s] === 0,
    }))
    g.lossNote = ''

    // A Wild Style loss outranks the score: a side can be sitting on more points and still
    // hand the game over by being set on the opening hand, twice running, or three times.
    // Partnerships only — four solo sides get set often enough that this would end most
    // games on the first hand.
    const loser = g.variant === 'wild' && g.mode === 'partners'
      ? wildLossTeam(g.handNumber, wasSet, g.setStreak, g.setCount, g.scores)
      : null
    if (loser !== null) {
      g.winnerTeam = loser === 0 ? 1 : 0
      g.phase = 'game_over'
      g.lossNote = lossReason(g, loser)
      persist()
      return
    }

    const winner = winnerTeamFor(g.scores, targetFor(g.mode))
    g.winnerTeam = winner
    g.phase = winner === null ? 'hand_over' : 'game_over'
    persist()
  }

  /** Why a side lost outright, so the hand-over screen can say so rather than just ending. */
  function lossReason(g: SpadesGame, loser: number): string {
    const names = [0, 1, 2, 3].filter(s => sideOf(s, g.mode) === loser)
      .map(s => g.players[s]?.name ?? '').join(' & ')
    if (g.handNumber === 1) return `${names} were set on the first hand`
    if ((g.setStreak[loser] ?? 0) >= WILD_MAX_CONSECUTIVE_SETS) return `${names} were set two hands running`
    return `${names} were set three times`
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
    legalForCurrent, isLegal, sortHand, isBotTurn, botAct, minBidForSeat, nilAllowedForSeat,
  }
})
