import { ref } from 'vue'
import { defineStore } from 'pinia'
import { v4 as uuid } from 'uuid'
import { PROMPTS, TIERS, deckFor, type NhiePrompt, type NhieTier } from '../lib/nhiePrompts'

/**
 * Never Have I Ever.
 *
 * No turn engine, no scoring, no winner — the app is the deck and the table is the game. What
 * it does have to get right is which cards can appear and what happens to one nobody wants.
 *
 * ── Hidden cards outlive a game ────────────────────────────────────────────────────────────
 *
 * Skipping is for right now; hiding is forever. A card hidden at one table stays gone at the
 * next, because the reason it was hidden — it lands badly with these people, it is about
 * someone who is dead, it is simply not funny — does not stop being true when the game ends.
 * So hidden ids live under their own key rather than inside the game, and survive `endGame`.
 *
 * ── Edits sit beside the deck, not on top of it ────────────────────────────────────────────
 *
 * An edited prompt is stored as an override keyed by id. The shipped text stays where it is,
 * so an edit can be undone, and a future version of the deck can reword a card without
 * silently discarding what somebody typed.
 */

export interface NhiePlayer {
  id: string
  name: string
  avatarUrl: string | null
  color: string
  isGuest?: boolean
}

export interface NhieGame {
  id: string
  startedAt: string
  players: NhiePlayer[]
  tiers: NhieTier[]
  /** Ids in the order they will be dealt. Shuffled once at the start. */
  order: string[]
  /** How far through `order` we are. Equal to its length means the deck is spent. */
  position: number
  /** Skipped this game only — they come back next time. */
  skipped: string[]
}

const GAME_KEY = 'nhie_active_game'
const HIDDEN_KEY = 'nhie_hidden_v1'
const EDITS_KEY = 'nhie_edits_v1'

function readJson<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key)
    return raw ? (JSON.parse(raw) as T) : fallback
  } catch { return fallback }
}

function writeJson(key: string, value: unknown) {
  try { localStorage.setItem(key, JSON.stringify(value)) } catch { /* best effort */ }
}

export const useNhieStore = defineStore('nhie', () => {
  const game = ref<NhieGame | null>(null)
  /** Ids this device will never deal again. */
  const hidden = ref<string[]>(readJson<string[]>(HIDDEN_KEY, []))
  /** id → replacement text. */
  const edits = ref<Record<string, string>>(readJson<Record<string, string>>(EDITS_KEY, {}))

  function load() {
    const parsed = readJson<NhieGame | null>(GAME_KEY, null)
    if (!parsed || !parsed.order) return
    if (!parsed.id) parsed.id = uuid()
    parsed.skipped = parsed.skipped ?? []
    game.value = parsed
  }

  function persist() {
    if (!game.value) { try { localStorage.removeItem(GAME_KEY) } catch { /* ignore */ }; return }
    writeJson(GAME_KEY, game.value)
  }

  /**
   * Fisher–Yates, so every order is equally likely.
   *
   * The obvious `sort(() => Math.random() - 0.5)` is not a shuffle — it biases heavily toward
   * the original order, which for a deck people play through repeatedly means the same cards
   * keep turning up early.
   */
  function shuffled(ids: string[]): string[] {
    const a = [...ids]
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1))
      ;[a[i], a[j]] = [a[j]!, a[i]!]
    }
    return a
  }

  function startGame(players: NhiePlayer[], tiers: NhieTier[]) {
    // Bar is always in. A deck with no tiers selected would deal nothing, and an empty screen
    // is a worse answer than the safe pack.
    const chosen = tiers.length ? tiers : ['bar' as NhieTier]
    const deck = deckFor(new Set(chosen), new Set(hidden.value))
    game.value = {
      id: uuid(),
      startedAt: new Date().toISOString(),
      players,
      tiers: TIERS.filter(t => chosen.includes(t)),
      order: shuffled(deck.map(p => p.id)),
      position: 0,
      skipped: [],
    }
    persist()
  }

  /** The card on the table, with any edit applied. Null once the deck is spent. */
  function current(): (NhiePrompt & { edited: boolean }) | null {
    const g = game.value
    if (!g || g.position >= g.order.length) return null
    const id = g.order[g.position]!
    const base = PROMPTS.find(p => p.id === id)
    if (!base) return null
    const override = edits.value[id]
    return { ...base, text: override ?? base.text, edited: override !== undefined }
  }

  const remaining = () => {
    const g = game.value
    return g ? Math.max(0, g.order.length - g.position) : 0
  }

  function next() {
    const g = game.value
    if (!g || g.position >= g.order.length) return
    g.position += 1
    persist()
  }

  /** Not for me, not now. It returns in a later game. */
  function skip() {
    const g = game.value
    if (!g) return
    const id = g.order[g.position]
    if (id && !g.skipped.includes(id)) g.skipped.push(id)
    next()
  }

  /**
   * Never deal this again, on this device.
   *
   * Removed from the rest of this game's order too, not just from future ones — a card hidden
   * because it landed badly must not come back forty cards later in the same sitting.
   */
  function hide(id: string) {
    if (!hidden.value.includes(id)) {
      hidden.value = [...hidden.value, id]
      writeJson(HIDDEN_KEY, hidden.value)
    }
    const g = game.value
    if (!g) return
    const at = g.position
    g.order = g.order.filter((cardId, i) => i < at || cardId !== id)
    persist()
  }

  function unhide(id: string) {
    hidden.value = hidden.value.filter(h => h !== id)
    writeJson(HIDDEN_KEY, hidden.value)
  }

  /** Reword a card. An empty or unchanged value clears the override rather than storing it. */
  function editPrompt(id: string, text: string) {
    const trimmed = text.trim()
    const base = PROMPTS.find(p => p.id === id)
    const nextEdits = { ...edits.value }
    if (!trimmed || trimmed === base?.text) delete nextEdits[id]
    else nextEdits[id] = trimmed
    edits.value = nextEdits
    writeJson(EDITS_KEY, edits.value)
  }

  /** Add a card of your own. Stored as an edit against a generated id so it deals like any other. */
  function addPrompt(text: string, tier: NhieTier) {
    const trimmed = text.trim()
    if (!trimmed) return
    const id = `custom-${uuid().slice(0, 8)}`
    PROMPTS.push({ id, tier, text: trimmed })
    const g = game.value
    // Straight onto the end of what is left, so it gets played tonight rather than next time.
    if (g && g.tiers.includes(tier)) { g.order.push(id); persist() }
  }

  function endGame() {
    game.value = null
    persist()
  }

  load()

  return {
    game, hidden, edits,
    startGame, current, remaining, next, skip, hide, unhide, editPrompt, addPrompt, endGame,
  }
})
