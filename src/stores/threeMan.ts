import { ref } from 'vue'
import { defineStore } from 'pinia'
import { v4 as uuid } from 'uuid'
import type { Player } from '../types/index'

/**
 * Three Man.
 *
 * Two dice, a rotating Three Man, and a table of what each total does. Unlike every other
 * game in here it has no win condition — it ends when the room decides it ends — so there is
 * no target and no winner, only a running tally and a summary when someone quits.
 *
 * ── Sips, not drinks ───────────────────────────────────────────────────────────────────────
 *
 * The engine counts an abstract unit and never names it. `unit` decides whether the UI calls
 * it a sip or a point, and nothing below branches on that — the rules, the tallies and the
 * history are identical either way. That keeps one code path instead of two, and means the
 * game is playable by a table that isn't drinking without a second implementation to maintain.
 *
 * ── House rules ────────────────────────────────────────────────────────────────────────────
 *
 * The core is agreed everywhere: threes hit the Three Man, doubles are handed out, and double
 * threes pass the hat. Past that, houses genuinely disagree, and a house that plays 7 to the
 * left is not playing it wrong. Those points are `HouseRules` rather than constants, so the
 * setup screen can match the table instead of arguing with it.
 */

export type SipUnit = 'sips' | 'points'

export interface HouseRules {
  /** Which neighbour a 7 hits. 11 always hits the other one. */
  sevenGoes: 'left' | 'right'
  /** Total of 9 is a social — everyone takes one. Off in a lot of houses. */
  nineIsSocial: boolean
  /**
   * Doubles: the roller hands out the face value and rolls again. With this off, doubles are
   * still handed out but the turn passes — the endless-reroll version is a lot of dice for a
   * table that just wants to go round.
   */
  doublesRollAgain: boolean
}

export const DEFAULT_HOUSE_RULES: HouseRules = {
  sevenGoes: 'left',
  nineIsSocial: false,
  doublesRollAgain: true,
}

export const THREE_MAN_RULES: string[] = [
  'Two dice, passed around the table',
  'Whoever first rolls a 3 becomes the Three Man',
  'Any 3 — on a die or as the total — and the Three Man takes one for each',
  'Roll a 7 or an 11 and a neighbour takes one',
  'Doubles: hand out that many, then roll again',
  'Roll double threes and you are the new Three Man',
]

export interface ThreeManPlayer {
  id: string
  name: string
  avatarUrl: string | null
  color: string
  /** Running tally of the abstract unit. Never called a drink in here. */
  sips: number
}

/** One line of what a roll did, for the table to read back. */
export interface RollOutcome {
  /** Who takes it, or null for a line that only explains something. */
  playerId: string | null
  amount: number
  reason: string
}

export interface ThreeManGame {
  id: string
  startedAt: string
  players: ThreeManPlayer[]
  currentPlayerIndex: number
  /** Null until someone rolls the first 3. */
  threeManId: string | null
  dice: [number, number] | null
  /**
   * `seeking`  — no Three Man yet, rolling to find one
   * `idle`     — the roller's turn, dice not yet thrown
   * `rolled`   — dice are showing, outcomes resolved, waiting to pass
   * `assigning`— doubles: the roller is picking who takes them
   * `over`     — someone ended it; the tally is the result
   */
  phase: 'seeking' | 'idle' | 'rolled' | 'assigning' | 'over'
  /** How many the roller still has to hand out, when phase is `assigning`. */
  pendingAssignment: number
  /** What the last roll did, newest first. */
  outcomes: RollOutcome[]
  rounds: number
  unit: SipUnit
  house: HouseRules
}

const STORAGE_KEY = 'threeman_active_game'

export const useThreeManStore = defineStore('threeMan', () => {
  const game = ref<ThreeManGame | null>(null)

  function load() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      if (!raw) return
      const parsed = JSON.parse(raw) as ThreeManGame
      if (parsed.phase === 'over') return
      if (!parsed.id) parsed.id = uuid()
      if (!parsed.startedAt) parsed.startedAt = new Date().toISOString()
      // A save written before a rule existed is still a good game; fill the gap rather than
      // discarding the table's progress.
      parsed.house = { ...DEFAULT_HOUSE_RULES, ...(parsed.house ?? {}) }
      parsed.unit = parsed.unit === 'points' ? 'points' : 'sips'
      parsed.outcomes = parsed.outcomes ?? []
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

  function startGame(players: Player[], opts: { unit?: SipUnit; house?: Partial<HouseRules> } = {}) {
    game.value = {
      id: uuid(),
      startedAt: new Date().toISOString(),
      players: players.map(p => ({
        id: p.id, name: p.name, avatarUrl: p.avatarUrl, color: p.color, sips: 0,
      })),
      currentPlayerIndex: 0,
      threeManId: null,
      dice: null,
      phase: 'seeking',
      pendingAssignment: 0,
      outcomes: [],
      rounds: 0,
      unit: opts.unit ?? 'sips',
      house: { ...DEFAULT_HOUSE_RULES, ...(opts.house ?? {}) },
    }
    persist()
  }

  const roller = () => game.value?.players[game.value.currentPlayerIndex] ?? null

  /** Neighbour in table order. `offset` is +1 for left, -1 for right. */
  function neighbour(offset: number): ThreeManPlayer | null {
    const g = game.value
    if (!g || g.players.length < 2) return null
    const n = g.players.length
    return g.players[(g.currentPlayerIndex + offset + n) % n] ?? null
  }

  function give(playerId: string | null, amount: number, reason: string, into: RollOutcome[]) {
    if (amount <= 0) return
    into.push({ playerId, amount, reason })
    if (!playerId) return
    const p = game.value?.players.find(x => x.id === playerId)
    if (p) p.sips += amount
  }

  /**
   * Whether the dice are the roller's to throw.
   *
   * `phase` alone is not enough: after a roll the phase is `rolled` and stays there until the
   * dice are passed, so guarding on phase let the roller throw again and again, re-applying a
   * fresh set of outcomes every time and never advancing the turn. The dice being on the table
   * is what actually means "you have had your throw", so that is what the guard reads. Doubles
   * clear them deliberately, which is how a re-roll is granted rather than assumed.
   */
  function canRoll(): boolean {
    const g = game.value
    if (!g || g.phase === 'over' || g.phase === 'assigning') return false
    return g.dice === null
  }

  function rollDice() {
    const g = game.value
    if (!g || !canRoll()) return
    const a = Math.ceil(Math.random() * 6)
    const b = Math.ceil(Math.random() * 6)
    g.dice = [a, b]
    const total = a + b
    const doubles = a === b
    const out: RollOutcome[] = []
    const me = roller()

    /*
     * Double threes first, and deliberately before the threes are counted.
     *
     * The hat passes on this roll, so the new Three Man is the one who takes them — which is
     * the whole joke of the roll and the reason it is the only way anyone volunteers for the
     * job. Counting first would charge the outgoing Three Man for the roll that freed them.
     */
    if (doubles && a === 3 && me) {
      g.threeManId = me.id
      out.push({ playerId: null, amount: 0, reason: `${me.name} is the new Three Man` })
    }

    // Any 3 showing, plus a total of 3 (which is 1 and 2, so it never double-counts a face).
    let threes = (a === 3 ? 1 : 0) + (b === 3 ? 1 : 0)
    if (total === 3) threes += 1

    if (threes > 0) {
      if (!g.threeManId && me) {
        // Nobody holds it yet: the first 3 of the game hands it over. They take it too —
        // finding out what the job is, is part of taking it.
        g.threeManId = me.id
        out.push({ playerId: null, amount: 0, reason: `${me.name} rolled a 3 and is the Three Man` })
      }
      const tm = g.players.find(p => p.id === g.threeManId)
      if (tm) give(tm.id, threes, threes > 1 ? `Two threes — Three Man` : 'Three Man', out)
    }

    if (g.threeManId) {
      // The neighbour rules only make sense once the table is playing properly.
      const leftFirst = g.house.sevenGoes === 'left'
      if (total === 7) {
        const n = neighbour(leftFirst ? 1 : -1)
        if (n) give(n.id, 1, `7 — to the ${leftFirst ? 'left' : 'right'}`, out)
      }
      if (total === 11) {
        const n = neighbour(leftFirst ? -1 : 1)
        if (n) give(n.id, 1, `11 — to the ${leftFirst ? 'right' : 'left'}`, out)
      }
      if (total === 9 && g.house.nineIsSocial) {
        for (const p of g.players) give(p.id, 1, 'Social', out)
      }
    }

    if (doubles) {
      g.pendingAssignment = a
      g.phase = 'assigning'
      out.push({ playerId: null, amount: a, reason: `Doubles — hand out ${a}` })
    } else {
      g.phase = 'rolled'
    }

    g.outcomes = out
    persist()
  }

  /**
   * Hand one of the pending doubles to a player. Called once per unit rather than once per
   * roll so the roller can split them up, which is how the roll is actually played.
   */
  function assignTo(playerId: string) {
    const g = game.value
    if (!g || g.phase !== 'assigning' || g.pendingAssignment <= 0) return
    const p = g.players.find(x => x.id === playerId)
    if (!p) return
    p.sips += 1
    g.pendingAssignment -= 1
    const existing = g.outcomes.find(o => o.playerId === playerId && o.reason === 'Doubles')
    if (existing) existing.amount += 1
    else g.outcomes.push({ playerId, amount: 1, reason: 'Doubles' })

    if (g.pendingAssignment === 0) {
      // Handed out. Doubles usually buy another roll; a house that plays otherwise passes.
      g.phase = 'rolled'
      if (g.house.doublesRollAgain) g.dice = null
    }
    persist()
  }

  function pass() {
    const g = game.value
    if (!g || g.phase === 'over' || g.phase === 'assigning') return
    g.currentPlayerIndex = (g.currentPlayerIndex + 1) % g.players.length
    if (g.currentPlayerIndex === 0) g.rounds += 1
    g.dice = null
    g.outcomes = []
    // Nobody has thrown yet on the new turn, so this is never `rolled` — that phase means the
    // dice are showing, and pairing it with a cleared table is what made `canRoll` necessary.
    g.phase = g.threeManId ? 'idle' : 'seeking'
    persist()
  }

  /** Hand the job to someone else — some houses let the Three Man trade out. */
  function setThreeMan(playerId: string) {
    const g = game.value
    if (!g || g.phase === 'over') return
    if (!g.players.some(p => p.id === playerId)) return
    g.threeManId = playerId
    persist()
  }

  /** A player leaves; the others carry on. Mirrors the Yahtzee leave behaviour. */
  function leaveGame(playerId: string) {
    const g = game.value
    if (!g || g.players.length <= 1) return
    const idx = g.players.findIndex(p => p.id === playerId)
    if (idx === -1) return
    g.players.splice(idx, 1)
    if (idx < g.currentPlayerIndex) g.currentPlayerIndex -= 1
    g.currentPlayerIndex %= g.players.length
    if (g.threeManId === playerId) {
      // The job cannot sit with someone who left, and nobody would remember to reassign it.
      g.threeManId = null
      g.phase = 'seeking'
      g.dice = null
      g.outcomes = []
    }
    persist()
  }

  function endGame() {
    const g = game.value
    if (!g) return
    g.phase = 'over'
    persist()
  }

  function clearGame() {
    game.value = null
    persist()
  }

  load()

  return {
    game,
    startGame,
    rollDice,
    assignTo,
    pass,
    setThreeMan,
    leaveGame,
    canRoll,
    endGame,
    clearGame,
  }
})
