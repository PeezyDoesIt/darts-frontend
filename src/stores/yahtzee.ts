import { defineStore } from 'pinia'
import { ref } from 'vue'
import { v4 as uuid } from 'uuid'
import type { Player } from '../types/index'

export type YahtzeeCategory =
  | 'aces' | 'twos' | 'threes' | 'fours' | 'fives' | 'sixes'
  | 'threeOfAKind' | 'fourOfAKind' | 'fullHouse'
  | 'smallStraight' | 'largeStraight' | 'yahtzee' | 'chance'

export type YahtzeeScorecard = { [K in YahtzeeCategory]: number | null } & { yahtzeeBonusCount: number }

/**
 * The 13 scoring categories, in scorecard order. A scorecard also carries
 * `yahtzeeBonusCount`, which is a running tally rather than a category — anything counting
 * "how much of the card is filled" has to iterate this list, not `Object.keys(scorecard)`.
 */
export const YAHTZEE_CATEGORIES: YahtzeeCategory[] = [
  'aces', 'twos', 'threes', 'fours', 'fives', 'sixes',
  'threeOfAKind', 'fourOfAKind', 'fullHouse',
  'smallStraight', 'largeStraight', 'yahtzee', 'chance',
]

export interface YahtzeePlayerState {
  player: Player
  scorecard: YahtzeeScorecard
  /**
   * Whether this seat is played by the computer. Stored explicitly rather than inferred from
   * the id, so a roster player whose id happens to look like a bot's can never be mistaken
   * for one, and vice versa.
   */
  isBot?: boolean
}

export interface YahtzeeGame {
  /** Stable per-game id. Sent to the API as the idempotency key so a result can never
   *  be recorded twice, however many times the win screen mounts. */
  id: string
  startedAt: string
  players: Player[]
  playerStates: YahtzeePlayerState[]
  currentPlayerIndex: number
  dice: number[]
  held: boolean[]
  rollCount: number
  diceMode: 'electronic' | 'physical'
  status: 'playing' | 'finished'
  winnerId: string | null
}

export function emptyScorecard(): YahtzeeScorecard {
  return {
    aces: null,
    twos: null,
    threes: null,
    fours: null,
    fives: null,
    sixes: null,
    threeOfAKind: null,
    fourOfAKind: null,
    fullHouse: null,
    smallStraight: null,
    largeStraight: null,
    yahtzee: null,
    chance: null,
    yahtzeeBonusCount: 0,
  }
}

export function calcScore(category: YahtzeeCategory, dice: number[]): number {
  const counts: Record<number, number> = {}
  for (const d of dice) counts[d] = (counts[d] ?? 0) + 1
  const sum = dice.reduce((a, b) => a + b, 0)
  const vals = Object.values(counts)

  switch (category) {
    case 'aces':   return (counts[1] ?? 0) * 1
    case 'twos':   return (counts[2] ?? 0) * 2
    case 'threes': return (counts[3] ?? 0) * 3
    case 'fours':  return (counts[4] ?? 0) * 4
    case 'fives':  return (counts[5] ?? 0) * 5
    case 'sixes':  return (counts[6] ?? 0) * 6
    case 'threeOfAKind': return vals.some(v => v >= 3) ? sum : 0
    case 'fourOfAKind':  return vals.some(v => v >= 4) ? sum : 0
    case 'fullHouse':    return vals.includes(3) && vals.includes(2) ? 25 : 0
    case 'smallStraight': {
      const unique = [...new Set(dice)].sort((a, b) => a - b)
      const hasRun = (seq: number[]) => seq.every(n => unique.includes(n))
      return hasRun([1,2,3,4]) || hasRun([2,3,4,5]) || hasRun([3,4,5,6]) ? 30 : 0
    }
    case 'largeStraight': {
      const unique = [...new Set(dice)].sort((a, b) => a - b)
      const hasRun = (seq: number[]) => seq.every(n => unique.includes(n))
      return hasRun([1,2,3,4,5]) || hasRun([2,3,4,5,6]) ? 40 : 0
    }
    case 'yahtzee': return vals.length === 1 ? 50 : 0
    case 'chance':  return sum
  }
}

export function upperTotal(sc: YahtzeeScorecard): number {
  return (sc.aces ?? 0) + (sc.twos ?? 0) + (sc.threes ?? 0) +
    (sc.fours ?? 0) + (sc.fives ?? 0) + (sc.sixes ?? 0)
}

export function upperBonus(sc: YahtzeeScorecard): number {
  const allFilled = sc.aces !== null && sc.twos !== null && sc.threes !== null &&
    sc.fours !== null && sc.fives !== null && sc.sixes !== null
  return allFilled && upperTotal(sc) >= 63 ? 35 : 0
}

export function lowerTotal(sc: YahtzeeScorecard): number {
  return (sc.threeOfAKind ?? 0) + (sc.fourOfAKind ?? 0) + (sc.fullHouse ?? 0) +
    (sc.smallStraight ?? 0) + (sc.largeStraight ?? 0) + (sc.yahtzee ?? 0) +
    (sc.chance ?? 0) + sc.yahtzeeBonusCount * 100
}

export function grandTotal(sc: YahtzeeScorecard): number {
  return upperTotal(sc) + upperBonus(sc) + lowerTotal(sc)
}

export function isScorecardComplete(sc: YahtzeeScorecard): boolean {
  return YAHTZEE_CATEGORIES.every(c => sc[c] !== null)
}

const SAVE_KEY = 'yahtzee_active_game'

export const useYahtzeeStore = defineStore('yahtzee', () => {
  function loadSaved(): YahtzeeGame | null {
    try {
      const raw = localStorage.getItem(SAVE_KEY)
      if (!raw) return null
      const parsed = JSON.parse(raw) as YahtzeeGame
      // Only restore in-progress games, matching the darts store. Restoring a finished one
      // re-ran recordResults() on every mount, adding another win/game to every player each
      // time the win screen was refreshed — unbounded inflation of the leaderboard.
      if (parsed.status !== 'playing') return null
      // Games saved before ids existed would otherwise send an empty idempotency key and
      // be rejected by the API. Backfill so a game in flight across the upgrade survives.
      if (!parsed.id) parsed.id = uuid()
      if (!parsed.startedAt) parsed.startedAt = new Date().toISOString()
      return parsed
    } catch { return null }
  }

  const game = ref<YahtzeeGame | null>(loadSaved())

  /**
   * A game is over the moment every scorecard is full. This is enforced as an invariant
   * rather than only at the two scoring call sites, because any path that fills the last
   * category without checking leaves the game permanently unwinnable: no category is
   * scoreable, the roll button reads DONE and is disabled, and no winner is ever declared.
   * Reproduced with every card complete and status still 'playing' — 0 scoreable rows,
   * roll button disabled, no finish overlay.
   *
   * Also runs on load, so a game already stuck in that state recovers instead of staying
   * dead forever.
   */
  function finishIfComplete(): boolean {
    const g = game.value
    if (!g || g.status !== 'playing') return false
    if (!g.playerStates.every(ps => isScorecardComplete(ps.scorecard))) return false

    let bestScore = -1
    let winnerId: string | null = null
    for (const ps of g.playerStates) {
      const total = grandTotal(ps.scorecard)
      if (total > bestScore) { bestScore = total; winnerId = ps.player.id }
    }
    g.status = 'finished'
    g.winnerId = winnerId
    persist()
    return true
  }

  // Recover a game that was left complete-but-unfinished by an earlier version.
  finishIfComplete()

  function persist() {
    try {
      if (game.value) {
        // Strip large image data from players before persisting to avoid storage quota errors
        const slim = {
          ...game.value,
          players: game.value.players.map(p => ({ ...p, avatarUrl: p.avatarUrl?.startsWith('data:') ? null : p.avatarUrl, playerBackground: null })),
          playerStates: game.value.playerStates.map(ps => ({
            ...ps,
            player: { ...ps.player, avatarUrl: ps.player.avatarUrl?.startsWith('data:') ? null : ps.player.avatarUrl, playerBackground: null },
          })),
        }
        localStorage.setItem(SAVE_KEY, JSON.stringify(slim))
      } else {
        localStorage.removeItem(SAVE_KEY)
      }
    } catch {
      // Storage quota exceeded — game still runs in memory
    }
  }

  function startGame(
    players: Player[],
    diceMode: 'electronic' | 'physical',
    botIds: string[] = [],
  ) {
    game.value = {
      id: uuid(),
      startedAt: new Date().toISOString(),
      players,
      playerStates: players.map(p => ({
        player: p, scorecard: emptyScorecard(), isBot: botIds.includes(p.id),
      })),
      currentPlayerIndex: 0,
      dice: [1, 1, 1, 1, 1],
      held: [false, false, false, false, false],
      rollCount: 0,
      diceMode,
      status: 'playing',
      winnerId: null,
    }
    persist()
  }

  function rollDice() {
    if (!game.value || game.value.rollCount >= 3) return
    game.value.dice = game.value.dice.map((d, i) =>
      game.value!.held[i] ? d : Math.ceil(Math.random() * 6)
    )
    game.value.rollCount++
    persist()
  }

  /** Set every hold at once — the computer decides the whole set, not one die at a time. */
  function setHolds(next: boolean[]) {
    if (!game.value || game.value.rollCount === 0) return
    game.value.held = game.value.held.map((h, i) => next[i] ?? h)
    persist()
  }

  function toggleHold(i: number) {
    if (!game.value || game.value.rollCount === 0) return
    game.value.held[i] = !game.value.held[i]
    persist()
  }

  function setDie(i: number, value: number) {
    if (!game.value) return
    game.value.dice[i] = value
    persist()
  }

  function setPhysicalRollCount(n: number) {
    if (!game.value) return
    game.value.rollCount = n
    persist()
  }

  function autoScoreYahtzee() {
    if (!game.value || game.value.status !== 'playing') return
    const state = game.value.playerStates[game.value.currentPlayerIndex]
    if (!state) return
    const dice = game.value.dice
    if (new Set(dice).size !== 1) return
    const sc = state.scorecard
    if (sc.yahtzee !== null) {
      sc.yahtzeeBonusCount++
    } else {
      sc.yahtzee = 50
    }
    // Check if this auto-score completed the last category on the last turn
    if (finishIfComplete()) return
    // Give a bonus roll — reset dice without advancing the turn
    game.value.dice = [1, 1, 1, 1, 1]
    game.value.held = [false, false, false, false, false]
    game.value.rollCount = 0
    persist()
  }

  function scoreCategory(category: YahtzeeCategory) {
    if (!game.value || game.value.status !== 'playing') return
    const state = game.value.playerStates[game.value.currentPlayerIndex]
    if (!state) return

    const sc = state.scorecard
    const dice = game.value.dice
    const isYahtzeeRoll = new Set(dice).size === 1

    if (category === 'yahtzee' && sc.yahtzee !== null && isYahtzeeRoll) {
      sc.yahtzeeBonusCount++
    } else {
      sc[category] = calcScore(category, dice)
    }

    if (finishIfComplete()) return

    game.value.currentPlayerIndex = (game.value.currentPlayerIndex + 1) % game.value.players.length
    game.value.dice = [1, 1, 1, 1, 1]
    game.value.held = [false, false, false, false, false]
    game.value.rollCount = 0
    persist()
  }

  function addPlayerToGame(player: import('../types/index').Player) {
    if (!game.value) return
    if (game.value.players.some(p => p.id === player.id)) return
    game.value.players.push(player)
    game.value.playerStates.push({ player, scorecard: emptyScorecard() })
    persist()
  }

  /**
   * One player walks away; the rest carry on.
   *
   * Their scorecard goes with them rather than sitting on the final board as an abandoned
   * column — a card stopped at round four is not a result, and ranking it against finished
   * ones invents a loser out of somebody who simply left.
   *
   * Three things have to be right, and each was a way to break the game:
   *
   * - `currentPlayerIndex` is a position in an array that just got shorter. Leaving it alone
   *   would silently hand the turn to whoever slid into that slot, or point past the end.
   *   Removing someone BEFORE the current player shifts everyone down by one, so the index
   *   has to come down too; removing the current player means the turn passes to whoever is
   *   now at that index, which is the next player round, and wrapping covers the last seat.
   * - The dice on the table belong to the turn that was in progress. If that turn was the
   *   leaver's, the next player must not inherit a part-used roll, so the throw resets.
   * - Everyone left may already be finished — the leaver could have been the only one with
   *   rounds to go. `finishIfComplete` is what notices, and without this call the game would
   *   sit unfinishable with nobody able to score.
   *
   * The last player is allowed to stay. Yahtzee is playable alone: they keep the score they
   * were building and finish their thirteen rounds rather than having the game taken away.
   */
  function leaveGame(playerId: string) {
    const g = game.value
    if (!g || g.status !== 'playing') return
    const idx = g.players.findIndex(p => p.id === playerId)
    if (idx === -1) return
    // The last player standing has nobody to hand the game to, so this is where it stops.
    if (g.players.length <= 1) return

    const wasTheirTurn = idx === g.currentPlayerIndex
    g.players.splice(idx, 1)
    g.playerStates.splice(idx, 1)

    if (idx < g.currentPlayerIndex) g.currentPlayerIndex--
    g.currentPlayerIndex = g.currentPlayerIndex % g.players.length

    if (wasTheirTurn) {
      g.dice = [1, 1, 1, 1, 1]
      g.held = [false, false, false, false, false]
      g.rollCount = 0
    }

    if (finishIfComplete()) return
    persist()
  }

  function endGame() {
    game.value = null
    persist()
  }

  return { game, startGame, rollDice, toggleHold, setHolds, setDie, setPhysicalRollCount, autoScoreYahtzee, scoreCategory, addPlayerToGame, leaveGame, endGame, finishIfComplete }
})
