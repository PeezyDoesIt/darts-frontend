<template>
  <div v-if="game" class="sp-page">
    <div class="drip-bar" />

    <header class="sp-header">
      <button v-ripple class="btn btn-outline btn-sm" @click="quit">← Quit</button>
      <div class="sp-title-wrap">
        <h1 class="sp-title display">SPADES</h1>
        <span class="sp-sub">{{ VARIANT_LABELS[game.variant] }} · {{ game.mode === 'solo' ? 'solo' : 'partners' }} · hand {{ game.handNumber }} · to {{ target }}</span>
      </div>
      <!--
        Three buttons do not fit beside the title at 393px — they crowd the wordmark and each
        other. On a phone they collapse into one control opening a sheet; from the tablet band
        up there is room and all three stay out in the open, one tap each.
      -->
      <div class="header-actions">
        <button v-ripple class="btn btn-outline btn-sm ha-wide" @click="showDeck = true">Deck</button>
        <button v-ripple class="btn btn-outline btn-sm ha-wide" @click="showSort = true">Sort</button>
        <button v-ripple class="btn btn-outline btn-sm ha-wide" @click="showRules = true">Rules</button>
        <button
          v-ripple
          class="btn btn-outline btn-sm ha-menu"
          aria-label="Deck, sort and rules"
          :aria-expanded="showMenu"
          @click="showMenu = true"
        >☰</button>
      </div>
    </header>

    <!-- The phone sheet. Rises from the bottom because that is where the thumb is. -->
    <div v-if="showMenu" class="overlay sheet-overlay" @click.self="showMenu = false">
      <div class="menu-sheet street-panel">
        <span class="sheet-tape">THIS HAND</span>
        <button v-ripple class="sheet-btn" @click="openFromMenu('deck')">Deck</button>
        <button v-ripple class="sheet-btn" @click="openFromMenu('sort')">Sort</button>
        <button v-ripple class="sheet-btn" @click="openFromMenu('rules')">Rules</button>
        <button v-ripple class="sheet-btn sheet-cancel" @click="showMenu = false">Close</button>
      </div>
    </div>

    <!-- Side scores: two in a partnership game, four when everyone is on their own -->
    <div class="teams" :class="{ solo: game.mode === 'solo' }">
      <div v-for="s in sides" :key="s.side" class="team" :class="`t${s.side}`">
        <span class="team-names">{{ s.names }}</span>
        <span class="team-score display">{{ s.score }}</span>
        <span class="team-bags">{{ s.bags }} {{ s.bags === 1 ? 'bag' : 'bags' }}</span>
        <!-- Three sets lose the game in Wild Style, so the count cannot live only on the
             end-of-hand screen. -->
        <span v-if="s.setLabel" class="team-sets" :class="{ danger: s.setDanger }">{{ s.setLabel }}</span>
      </div>
    </div>

    <div class="sp-body" :class="{ fit: game.phase === 'playing' || game.phase === 'book_end' }">
      <!-- ── Privacy screen ─────────────────────────────── -->
      <div v-if="game.phase === 'pass'" class="pass-screen">
        <span class="pass-label">PASS THE DEVICE TO</span>
        <div class="pass-avatar" :style="{ background: seated.color }">
          <img v-if="isPhoto(seated.avatarUrl)" :src="seated.avatarUrl!" alt="" />
          <span v-else>{{ avatarGlyph(seated) }}</span>
        </div>
        <h2 class="pass-name display" :style="{ color: seated.color }">{{ seated.name }}</h2>
        <p class="pass-note">
          {{ needsBid ? 'Everyone else, look away — you are bidding.' : 'Everyone else, look away.' }}
        </p>
        <button v-ripple class="btn btn-spray btn-lg pass-btn" @click="spades.reveal()">
          I'm {{ seated.name }} — show my hand
        </button>
      </div>

      <!-- ── Bidding ────────────────────────────────────── -->
      <template v-else-if="game.phase === 'bidding'">
        <div class="seat-strip">
          <span class="ss-name" :style="{ color: seated.color }">{{ seated.name }}</span>
          <span class="ss-note">{{ seatedIsBot ? 'is bidding…' : 'how many books?' }}</span>
        </div>
        <!-- A bot's hand is never rendered — showing it would hand the table its cards. -->
        <div v-if="seatedIsBot" class="bot-thinking">
          <div class="hand-row fanned" :style="{ '--n': 13, '--fan-lap': fanLap }">
            <span v-for="i in 13" :key="i" class="fan-slot" :style="{ '--i': i - 1 }">
              <PlayingCard :theme="deck.theme" :art-courts="deck.artCourts" :card="{ kind: 'joker', joker: 'big' }" :width="cardWidth" faceDown />
            </span>
          </div>
          <span class="bt-note">{{ seated.name }} is looking at their hand</span>
        </div>
        <div v-else class="hand-row fanned" :style="{ '--n': sortedHand.length, '--fan-lap': fanLap }">
          <span v-for="(c, i) in sortedHand" :key="cardId(c)" class="fan-slot" :style="{ '--i': i }">
            <PlayingCard :theme="deck.theme" :art-courts="deck.artCourts" :card="c" :width="cardWidth" />
          </span>
        </div>
        <div v-if="!seatedIsBot" class="bid-grid">
          <button
            v-for="n in 14"
            :key="n - 1"
            v-ripple
            class="bid-btn"
            :class="{ nil: n - 1 === 0 }"
            :disabled="n - 1 === 0 ? !nilAllowed : n - 1 < minBid"
            @click="submitBid(n - 1)"
          >{{ n - 1 === 0 ? 'NIL' : n - 1 }}</button>
        </div>
        <!-- Board is why the low numbers are greyed out; saying so beats a dead button. -->
        <p v-if="!seatedIsBot && (minBid > 1 || !nilAllowed)" class="board-note">
          {{ partnerName }} bid {{ partnerBidLabel }} — board is {{ BOARD }}, so you need
          {{ minBid }} or more{{ nilAllowed ? '. Nil is still open.' : ', and nil is closed: it would leave your side short.' }}
        </p>
      </template>

      <!-- ── Playing ────────────────────────────────────── -->
      <template v-else-if="game.phase === 'playing' || game.phase === 'book_end'">
        <!-- Round the table. Every seat carries its own name and its own books-of-bid, sitting
             where that person sits, with the card they played beside it — so the individual
             bids are on the table all hand instead of appearing at scoring time. A phone has
             no room for a table, so below the tablet band the seats simply stack. -->
        <div class="table-area">
          <div v-for="v in seatViews" :key="v.seat" class="seat" :class="`seat-${v.pos}`">
            <div class="seat-plate" :style="{ borderColor: v.color }">
              <span class="sp-name" :style="{ color: v.color }">{{ v.name }}</span>
              <span class="sp-books">{{ v.books }}<span class="sp-of">of</span>{{ bidLabel(v.bid) }}</span>
            </div>
            <div class="seat-card">
              <PlayingCard v-if="v.card" :theme="deck.theme" :art-courts="deck.artCourts" :card="v.card" :width="bookCardWidth" />
              <div v-else class="seat-slot" />
              <!-- Following suit is enforced, so an off-suit card can only mean a void.
                   Saying so stops it reading as the game letting someone cheat. -->
              <span v-if="v.isVoid" class="tc-void">void in {{ ledSymbol }}</span>
            </div>
          </div>

          <div class="seat seat-you">
            <span class="you-tape">▼ YOU · {{ seated.name }}</span>
            <span class="seat-plate you-plate">
              <span class="sp-books">{{ seatedBooks }}<span class="sp-of">of</span>{{ bidLabel(seatedBid) }}</span>
            </span>
            <span v-if="ledSymbol" class="led-tape">{{ ledSymbol }} LED</span>
            <span v-else-if="!game.spadesBroken" class="led-tape">SPADES NOT BROKEN</span>
            <span v-else class="led-tape">YOU LEAD</span>
          </div>

          <p v-if="game.phase === 'book_end'" class="book-won">
            {{ game.players[game.lastBookWinnerSeat!]?.name }} takes it
          </p>
        </div>

        <template v-if="game.phase === 'playing'">
          <div class="seat-strip">
            <span class="ss-name" :style="{ color: seated.color }">{{ seated.name }}</span>
            <span class="ss-note">{{ seatedIsBot ? 'is thinking…' : `${legalCount} playable` }}</span>
          </div>
          <div v-if="seatedIsBot" class="bot-thinking">
            <div class="hand-row fanned" :style="{ '--n': game.hands[game.turnIndex]?.length ?? 0, '--fan-lap': fanLap }">
              <span
                v-for="i in (game.hands[game.turnIndex]?.length ?? 0)"
                :key="i"
                class="fan-slot"
                :style="{ '--i': i - 1 }"
              >
                <PlayingCard :theme="deck.theme" :art-courts="deck.artCourts" :card="{ kind: 'joker', joker: 'big' }" :width="cardWidth" faceDown />
              </span>
            </div>
          </div>
          <div v-else class="hand-row fanned" :style="{ '--n': sortedHand.length, '--fan-lap': fanLap }">
            <span v-for="(c, i) in sortedHand" :key="cardId(c)" class="fan-slot" :style="{ '--i': i }">
              <PlayingCard :theme="deck.theme" :art-courts="deck.artCourts"
                :card="c"
                :width="cardWidth"
                interactive
                :playable="spades.isLegal(c)"
                :selected="cardId(c) === selectedId"
                @play="onCardTap"
              />
            </span>
          </div>
        </template>
      </template>

      <!-- ── Hand over ──────────────────────────────────── -->
      <div v-else-if="game.phase === 'hand_over' || game.phase === 'game_over'" class="hand-over">
        <h2 class="ho-title display">
          {{ game.phase === 'game_over' ? 'GAME OVER' : `HAND ${game.handNumber}` }}
        </h2>
        <p v-if="game.phase === 'game_over'" class="ho-winner">{{ winnerLabel }}</p>
        <!-- A Wild Style loss can end the game with the losing side ahead on points, so the
             reason has to be on screen or the result looks like a bug. -->
        <p v-if="game.lossNote" class="ho-loss">{{ game.lossNote }}</p>

        <div class="ho-sides">
          <div v-for="s in game.lastHandSides" :key="s.side" class="ho-side" :class="`t${s.side}`">
            <span class="hs-names">{{ s.names }}</span>
            <span class="hs-line">
              <span class="hs-big display">{{ s.books }}</span>
              <span class="hs-of">of</span>
              <span class="hs-big display">{{ s.bid }}</span>
            </span>
            <span class="hs-verdict" :class="s.set ? 'is-set' : 'is-made'">{{ verdictFor(s) }}</span>            <span class="hs-pts display">{{ s.points > 0 ? '+' : '' }}{{ s.points }}</span>
            <span v-if="s.nils > 0" class="hs-note">
              nil {{ s.nilsMade === s.nils ? 'made' : 'broken' }}
            </span>
            <span v-if="s.penalty !== 0" class="hs-pen">{{ s.penalty }} — 10 bags</span>
            <span class="hs-total">now {{ s.total }}</span>
            <span v-if="setsFor(s.side)" class="hs-sets" :class="{ danger: setsDangerFor(s.side) }">{{ setsFor(s.side) }}</span>
          </div>
        </div>

        <div class="ho-seats">
          <span class="ho-seats-label">INDIVIDUAL BIDS</span>
          <div class="ho-seat-row">
            <div v-for="p in game.lastHandSeats" :key="p.seat" class="ho-seat">
              <span class="hp-name">{{ p.name }}</span>
              <span class="hp-val display">{{ p.books }}<span class="hp-of">of</span>{{ p.nil ? 'NIL' : p.bid }}</span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <footer v-if="showFooter" class="sp-footer">
      <button v-if="game.phase === 'book_end'" v-ripple class="btn btn-spray btn-lg wide" @click="spades.nextBook()">
        {{ booksPlayed >= HAND_SIZE ? 'Score the hand →' : 'Next book →' }}
      </button>
      <button v-else-if="game.phase === 'hand_over'" v-ripple class="btn btn-spray btn-lg wide" @click="spades.nextHand()">
        Deal hand {{ game.handNumber + 1 }} →
      </button>
      <button v-else-if="game.phase === 'game_over'" v-ripple class="btn btn-spray btn-lg wide" @click="finish">
        Done
      </button>
    </footer>

    <div v-if="showDeck" class="overlay" @click.self="showDeck = false">
      <div class="rules-card street-panel">
        <h2 class="rules-title display">CARD STYLE</h2>
        <p class="sort-note">Changes apply straight away — mid-hand is fine.</p>

        <div class="deck-grid">
          <button
            v-for="d in DECKS" :key="d.id"
            v-ripple
            class="deck-btn"
            :class="{ on: deckIsOn(d) }"
            @click="setDeck(d)"
          >
            <span class="deck-swatch" :style="d.swatch" />
            <span class="deck-name">{{ d.name }}</span>
            <span v-if="d.id === 'bellot'" class="deck-default">DEFAULT</span>
          </button>
        </div>

        <div class="sort-block">
          <span class="sort-label">Court cards</span>
          <div class="seg">
            <button v-ripple class="seg-btn" :class="{ on: !deck.artCourts }" @click="deck = { ...deck, artCourts: false }">Themed</button>
            <button
              v-ripple class="seg-btn"
              :class="{ on: deck.artCourts }"
              :disabled="!artAvailable"
              @click="deck = { ...deck, artCourts: true }"
            >Traditional</button>
          </div>
          <span class="deck-hint">
            Jokers are drawn on every deck either way — the switch is about court cards.
          </span>
        </div>

        <button v-ripple class="btn btn-spray wide" @click="showDeck = false">Done</button>
      </div>
    </div>

    <div v-if="showSort" class="overlay" @click.self="showSort = false">
      <div class="rules-card street-panel">
        <h2 class="rules-title display">HOW YOUR HAND SITS</h2>
        <p class="sort-note">Display only — it never changes what you are allowed to play.</p>

        <div class="sort-block">
          <span class="sort-label">Spades on</span>
          <div class="seg">
            <button v-ripple class="seg-btn" :class="{ on: spadesSide === 'left' }" @click="setSpadesSide('left')">Left</button>
            <button v-ripple class="seg-btn" :class="{ on: spadesSide === 'right' }" @click="setSpadesSide('right')">Right</button>
          </div>
          <span class="deck-hint">
            Trumps at the end of the hand you reach for, with the jokers outside them. The
            other suits mirror with them.
          </span>
        </div>

        <div class="sort-block">
          <span class="sort-label">Within a suit</span>
          <div class="seg">
            <button v-ripple class="seg-btn" :class="{ on: sortPrefs.ascending }" @click="sortPrefs.ascending = true">Low → High</button>
            <button v-ripple class="seg-btn" :class="{ on: !sortPrefs.ascending }" @click="sortPrefs.ascending = false">High → Low</button>
          </div>
        </div>

        <!-- Not a setting: a joker inside the spade run hides inside the suit that beats it. -->
        <div v-if="game.variant === 'wild'" class="sort-block">
          <span class="sort-label">Jokers</span>
          <p class="sort-note sort-note-left">
            Always outside the spade run, at the spades end — high on the far edge.
          </p>
        </div>

        <button v-ripple class="btn btn-outline wide" @click="resetSort">Reset to default</button>
        <button v-ripple class="btn btn-spray wide" @click="showSort = false">Done</button>
      </div>
    </div>

    <div v-if="showRules" class="overlay" @click.self="showRules = false">
      <div class="rules-card street-panel">
        <h2 class="rules-title display">SPADES — {{ VARIANT_LABELS[game.variant].toUpperCase() }}</h2>
        <ul class="rules-list"><li v-for="(r, i) in rules" :key="i">{{ r }}</li></ul>
        <div v-if="game.variant === 'wild'" class="joker-row">
          <PlayingCard :theme="deck.theme" :art-courts="deck.artCourts" :card="{ kind: 'joker', joker: 'big' }" :width="84" />
          <PlayingCard :theme="deck.theme" :art-courts="deck.artCourts" :card="{ kind: 'joker', joker: 'little' }" :width="84" />
        </div>
        <button v-ripple class="btn btn-spray wide" @click="showRules = false">Got it</button>
      </div>
    </div>
  </div>

  <div v-else class="empty-state">
    <p>No game in progress.</p>
    <button v-ripple class="btn btn-spray btn-lg" @click="router.replace('/spades/setup')">Set one up</button>
  </div>
</template>

<script setup lang="ts">
import { computed, onUnmounted, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { avatarGlyph, isPhoto } from '../lib/playerDisplay'
import PlayingCard, { ART_CAPABLE, type CardTheme } from '../components/PlayingCard.vue'
import { useSpadesStore } from '../stores/spades'
import { usePlayersStore } from '../stores/players'
import {
  DEFAULT_HAND_SORT, BOARD, HAND_SIZE, SUIT_SYMBOL, VARIANT_LABELS, cardId,
  effectiveSuit, rulesFor, sideCount, sideOf, sortHand, targetFor,
  type Card, type HandSortPrefs,
} from '../lib/spades'
import { recordGameResult } from '../api/gameResults'
import { playTurnResultSound, playStartChime, unlockAudio } from '../composables/useSounds'
import { goBack } from '../router/goBack'

const router = useRouter()
const spades = useSpadesStore()
const playersStore = usePlayersStore()
const game = computed(() => spades.game)
const showRules = ref(false)
const showSort = ref(false)
const showDeck = ref(false)

/**
 * Which deck this device draws. Kept beside the sort preference in localStorage — it is
 * a way of seeing the cards, not part of the game, so it changes live and never travels
 * with a synced game.
 */
const DECKS = [
  { id: 'bellot',  name: 'Bellot',  theme: 'classic' as CardTheme, artCourts: true,
    swatch: { background: 'linear-gradient(135deg,#fffefb,#d1122c)' } },
  { id: 'classic', name: 'Classic', theme: 'classic' as CardTheme, artCourts: false,
    swatch: { background: 'linear-gradient(135deg,#17171b,#d1122c)' } },
  { id: 'bold',    name: 'Bold',    theme: 'bold' as CardTheme, artCourts: false,
    swatch: { background: 'linear-gradient(135deg,#101014,#e01b3c)' } },
] as const

/** Bellot: the deck every card game starts on. */
const DEFAULT_DECK = { theme: 'classic' as CardTheme, artCourts: true }

const DECK_KEY = 'spades_deck'
function loadDeck(): { theme: CardTheme; artCourts: boolean } {
  try {
    const raw = localStorage.getItem(DECK_KEY)
    if (!raw) return { ...DEFAULT_DECK }
    const p = JSON.parse(raw) as { theme?: CardTheme; artCourts?: boolean }
    // A stored theme from the retired list (ink, vintage, neon, midnight, slate) no longer
    // exists, so it falls back to Bellot rather than drawing nothing.
    const theme = DECKS.some(d => d.theme === p.theme) ? p.theme! : DEFAULT_DECK.theme
    return { theme, artCourts: !!p.artCourts && ART_CAPABLE.includes(theme) }
  } catch { return { ...DEFAULT_DECK } }
}
const deck = ref(loadDeck())
const artAvailable = computed(() => ART_CAPABLE.includes(deck.value.theme))
watch(deck, (d) => {
  try { localStorage.setItem(DECK_KEY, JSON.stringify(d)) } catch { /* best effort: storage can be full, or unavailable in private mode */ }
}, { deep: true })

/** A deck entry carries both halves of the choice: Bellot is classic stock with the courts on. */
function setDeck(d: { theme: CardTheme; artCourts: boolean }) {
  deck.value = { theme: d.theme, artCourts: d.artCourts && ART_CAPABLE.includes(d.theme) }
}
function deckIsOn(d: { theme: CardTheme; artCourts: boolean }) {
  return deck.value.theme === d.theme && deck.value.artCourts === d.artCourts
}

/**
 * How this device lays a hand out. Kept in localStorage rather than the game, so it
 * survives between games and does not travel with a synced game to someone else's phone.
 */
const SORT_KEY = 'spades_hand_sort'
function loadSortPrefs(): HandSortPrefs {
  try {
    const raw = localStorage.getItem(SORT_KEY)
    if (!raw) return { ...DEFAULT_HAND_SORT }
    const parsed = JSON.parse(raw) as Partial<HandSortPrefs>
    // Merge rather than trust: a stored order from an older build could be short a suit.
    return {
      suitOrder: parsed.suitOrder?.length === 4 ? parsed.suitOrder : [...DEFAULT_HAND_SORT.suitOrder],
      ascending: parsed.ascending ?? DEFAULT_HAND_SORT.ascending,
      jokersLast: parsed.jokersLast ?? DEFAULT_HAND_SORT.jokersLast,
    }
  } catch { return { ...DEFAULT_HAND_SORT } }
}
const showMenu = ref(false)
/** The sheet is a way in, not a place: it closes as the panel it opened comes up. */
function openFromMenu(which: 'deck' | 'sort' | 'rules') {
  showMenu.value = false
  if (which === 'deck') showDeck.value = true
  else if (which === 'sort') showSort.value = true
  else showRules.value = true
}

const sortPrefs = ref<HandSortPrefs>(loadSortPrefs())
watch(sortPrefs, (p) => {
  try { localStorage.setItem(SORT_KEY, JSON.stringify(p)) } catch { /* best effort: a lost sort preference is not worth breaking the hand over */ }
}, { deep: true })

/*
 * Which end the trumps sit at, as one tap.
 *
 * A four-row reorder could express this too, and used to, but the hand a player reaches for is
 * a left-or-right decision rather than a sort — and the mirror is only meaningful against a
 * known order: with an arbitrary custom one, "spades on left" says nothing about where
 * anything else lands. `suitOrder` stays in storage for anyone who set one, and is simply no
 * longer offered; choosing a side rewrites it from the standard order.
 */
const STANDARD_SUITS = ['hearts', 'clubs', 'diamonds', 'spades'] as const

const spadesSide = computed<'left' | 'right'>(() =>
  sortPrefs.value.suitOrder[0] === 'spades' ? 'left' : 'right')

function setSpadesSide(side: 'left' | 'right') {
  const others = STANDARD_SUITS.filter(su => su !== 'spades')
  /*
   * Flipping the side mirrors the hand rather than only moving the spade block: ranks run
   * toward the trumps either way, so the strongest cards stay at the outer edge you reach for
   * and the high joker stays the outermost card. Within-a-suit direction can still be
   * overridden below — this only sets the sensible one for the side just chosen.
   */
  sortPrefs.value = {
    ...sortPrefs.value,
    // A mirror, not a rotation: reversing the other three too is what keeps the suit
    // beside the trumps the same one on either side. Moving only the spade block would
    // change which suit your thumb lands next to when you flip the hand over.
    suitOrder: side === 'left' ? ['spades', ...[...others].reverse()] : [...others, 'spades'],
    ascending: side === 'right',
  }
}
function resetSort() { sortPrefs.value = { ...DEFAULT_HAND_SORT, suitOrder: [...DEFAULT_HAND_SORT.suitOrder] } }

const seated = computed(() => game.value!.players[game.value!.turnIndex]!)
const rules = computed(() => rulesFor(game.value?.variant ?? 'wild', game.value?.mode ?? 'partners'))
const target = computed(() => targetFor(game.value?.mode ?? 'partners'))

/**
 * The scoring sides — two partnerships, or four individuals in a solo game. The bid here
 * is the side's combined contract, which is the only bid the table sees while the hand is
 * being played; a nil adds nothing to it, so it is counted separately.
 */
const sides = computed(() => {
  const g = game.value
  if (!g) return []
  return Array.from({ length: sideCount(g.mode) }, (_, side) => {
    const seats = [0, 1, 2, 3].filter(s => sideOf(s, g.mode) === side)
    const allIn = seats.every(s => g.bids[s] !== null)
    const setCount = g.setCount[side] ?? 0
    const setStreak = g.setStreak[side] ?? 0
    // Wild Style partnerships lose at two in a row or three in all, so the count is a
    // warning there rather than a statistic.
    const rulesBite = g.variant === 'wild' && g.mode === 'partners'
    return {
      side,
      names: seats.map(s => g.players[s]?.name ?? '').join(' & '),
      score: g.scores[side] ?? 0,
      bags: g.bags[side] ?? 0,
      bid: allIn ? seats.reduce((sum, s) => sum + (g.bids[s] === 0 ? 0 : g.bids[s] ?? 0), 0) : null,
      nils: seats.filter(s => g.bids[s] === 0).length,
      books: seats.reduce((sum, s) => sum + (g.booksWon[s] ?? 0), 0),
      isTurn: seats.includes(g.turnIndex),
      setLabel: setStreak > 0 && rulesBite
        ? 'SET LAST HAND'
        : setCount > 0 ? `${setCount} ${setCount === 1 ? 'set' : 'sets'}` : '',
      setDanger: rulesBite && (setStreak > 0 || setCount >= 2),
    }
  })
})

/** Running set count for a side, spelled out at the end of the hand. */
function setsFor(side: number): string {
  const g = game.value
  if (!g) return ''
  const count = g.setCount[side] ?? 0
  if (count === 0) return ''
  if (g.variant === 'wild' && g.mode === 'partners') {
    if (count >= 2) return `${count} sets — one more loses`
    return `${count} set of 3`
  }
  return `${count} ${count === 1 ? 'set' : 'sets'} so far`
}

function setsDangerFor(side: number): boolean {
  const g = game.value
  if (!g) return false
  return g.variant === 'wild' && g.mode === 'partners' && (g.setCount[side] ?? 0) >= 2
}

/** Board floor for the seat that is bidding, and who put it there. */
const minBid = computed(() => spades.minBidForSeat(game.value?.turnIndex ?? 0))
const nilAllowed = computed(() => spades.nilAllowedForSeat(game.value?.turnIndex ?? 0))
const partnerName = computed(() => {
  const g = game.value
  if (!g) return ''
  return g.players[(g.turnIndex + 2) % 4]?.name ?? ''
})
const partnerBidLabel = computed(() => {
  const g = game.value
  if (!g) return ''
  const b = g.bids[(g.turnIndex + 2) % 4]
  return b === 0 ? 'nil' : String(b ?? '')
})

const winnerLabel = computed(() => {
  const g = game.value
  if (!g || g.winnerTeam === null) return ''
  const names = sides.value[g.winnerTeam]?.names ?? ''
  const rest = g.scores.filter((_, i) => i !== g.winnerTeam).sort((a, b) => b - a)
  return `${names} win ${g.scores[g.winnerTeam]}–${rest.join('–')}`
})
const needsBid = computed(() => game.value?.bids.some(b => b === null) ?? false)
const sortedHand = computed(() =>
  sortHand(game.value?.hands[game.value.turnIndex] ?? [], sortPrefs.value)
)
const legalCount = computed(() => spades.legalForCurrent().length)
const booksPlayed = computed(() => game.value?.booksWon.reduce((a, b) => a + b, 0) ?? 0)
const showFooter = computed(() =>
  ['book_end', 'hand_over', 'game_over'].includes(game.value?.phase ?? '')
)

/**
 * Card size follows the screen as well as the hand. A phone can only hold thirteen 94px
 * cards by overlapping them into a fan; an iPad or a desktop has room for a card you can
 * actually read from across the table, so it gets one.
 *
 * The listener is registered in setup rather than onMounted — this view only ever renders
 * on the client, and onUnmounted below is what matters for cleanup.
 */
const viewportWidth = ref(window.innerWidth)
function onViewportResize() { viewportWidth.value = window.innerWidth }
window.addEventListener('resize', onViewportResize)
onUnmounted(() => window.removeEventListener('resize', onViewportResize))

const sizeTier = computed<'phone' | 'tablet' | 'desktop'>(() =>
  viewportWidth.value >= 1100 ? 'desktop' : viewportWidth.value >= 768 ? 'tablet' : 'phone'
)

/*
 * The fan's own geometry. FAN_SWING is the width the outer cards need to swing into once the
 * row is turned; MIN_SLICE is the narrowest sliver a card may show before the hand is allowed
 * to shrink the cards instead; TIGHTEN gathers the hand a little inside the room it strictly
 * has, because filling the row edge to edge reads as a layout rather than a hand being held.
 */
const FAN_SWING = 150
const MIN_SLICE = 30
const TIGHTEN = 0.86

/**
 * Card width and overlap for the held fan.
 *
 * Below the tablet band these are pinned rather than derived. The fan's own maths collapses on
 * a phone — 393px leaves ~300px of room, thirteen cards at MIN_SLICE do not fit, and it shrinks
 * the card to about 62px. That is the wrong trade: the sliver is already thin enough to need
 * the two-tap lift, and once a card has lifted it has to be READABLE. So the room is spent on
 * a card you can read when it rises, and the fan keeps only the pivot and the rotation here.
 */
const handFan = computed(() => {
  if (sizeTier.value === 'phone') {
    return viewportWidth.value >= 393 ? { width: 88, lap: 64 } : { width: 76, lap: 54 }
  }
  const n = Math.max(1, sortedHand.value.length)
  const room = Math.max(300, viewportWidth.value - FAN_SWING)
  const crowded = n > 9
  let w = sizeTier.value === 'desktop' ? (crowded ? 148 : 172) : (crowded ? 124 : 146)
  const widestThatFits = room - (n - 1) * MIN_SLICE
  if (n > 1 && w > widestThatFits) w = Math.max(62, widestThatFits)
  const slice = n > 1 ? Math.min(w - 10, ((room - w) / (n - 1)) * TIGHTEN) : w
  return { width: Math.round(w), lap: Math.max(0, Math.round(w - slice)) }
})
const cardWidth = computed(() => handFan.value.width)
const fanLap = computed(() => `${handFan.value.lap}px`)

/** The four cards on the table have no crowding problem, so they simply scale up. */
const bookCardWidth = computed(() =>
  sizeTier.value === 'desktop' ? 148 : sizeTier.value === 'tablet' ? 124 : 94
)

/** The suit that was actually led this book, for the void tag. */
const ledSuit = computed(() => {
  const t = game.value?.currentBook
  return t && t.length > 0 ? effectiveSuit(t[0]!.card) : null
})
const ledSymbol = computed(() => (ledSuit.value ? SUIT_SYMBOL[ledSuit.value] : ''))

/**
 * True when this card did not follow the led suit. Legality is enforced in the store, so
 * this can only happen when the seat held none of that suit — worth labelling, because
 * from across the table it looks like the rule was skipped.
 */
function offSuit(t: { card: Card }, i: number): boolean {
  return i > 0 && ledSuit.value !== null && effectiveSuit(t.card) !== ledSuit.value
}

/**
 * The three other seats, placed where that person is sitting relative to the device: play
 * runs clockwise, so the next seat to play is on your left. The seated player is always
 * turnIndex — the device is passed round — so "you" is the plate above your own hand.
 */
const SEAT_POS = ['left', 'top', 'right'] as const
const seatViews = computed(() => {
  const g = game.value
  if (!g) return []
  return SEAT_POS.map((pos, i) => {
    const seat = (g.turnIndex + 1 + i) % 4
    const p = g.players[seat]
    const idx = g.currentBook.findIndex(t => t.seat === seat)
    const played = idx >= 0 ? g.currentBook[idx]! : null
    return {
      seat, pos,
      name: p?.name ?? '',
      color: p?.color ?? 'rgba(255,255,255,0.4)',
      books: g.booksWon[seat] ?? 0,
      bid: g.bids[seat] ?? null,
      card: played?.card ?? null,
      isVoid: played ? offSuit(played, idx) : false,
    }
  })
})

const seatedBooks = computed(() => game.value?.booksWon[game.value.turnIndex] ?? 0)
const seatedBid = computed(() => game.value?.bids[game.value.turnIndex] ?? null)
/** A nil is a bid of zero, and reads as a word rather than a digit. */
function bidLabel(bid: number | null): string {
  return bid === null ? '—' : bid === 0 ? 'NIL' : String(bid)
}



/**
 * The verdict describes the CONTRACT, not the hand's points. A side can miss its bid and
 * still score, because a partner's made nil is scored separately — so "no points" is only
 * claimed when the hand really did score nothing.
 */
function verdictFor(s: { set: boolean; points: number }): string {
  if (!s.set) return 'MADE IT'
  return s.points > 0 ? 'SET — BID SCORES NOTHING' : 'SET — NO POINTS'
}

function submitBid(n: number) {
  unlockAudio()
  spades.placeBid(n)
  playTurnResultSound(false)
}

function onPlay(c: Card) {
  unlockAudio()
  selectedId.value = null
  spades.playCard(c)
  playTurnResultSound(false)
}

/**
 * On a phone thirteen cards in one row leave a ~24px sliver each — under the 44px target
 * minimum, and there is no card width that fixes that (44px slivers need 616px of row and
 * the screen gives 377). So a phone tap LIFTS the card clear of its neighbours and the
 * second tap plays it: a thin first tap is recoverable because you can see which card rose,
 * a thin play tap is not. From the tablet band up there is room, and one tap plays.
 */
const selectedId = ref<string | null>(null)
function onCardTap(c: Card) {
  if (sizeTier.value !== 'phone' || selectedId.value === cardId(c)) {
    onPlay(c)
    return
  }
  unlockAudio()
  selectedId.value = cardId(c)
}

// A selection belongs to one turn. Passing the device or the book moving on clears it.
watch(() => [game.value?.turnIndex, game.value?.phase] as const, () => { selectedId.value = null })

function finish() {
  const g = game.value
  if (g && g.winnerTeam !== null) {
    const winningSeats = [0, 1, 2, 3].filter(s => sideOf(s, g.mode) === g.winnerTeam)
    const winnerIds = winningSeats.map(s => g.players[s]!.id)
    g.players.forEach(p => {
      const stored = playersStore.players.find(sp => sp.id === p.id)
      if (!stored) return
      playersStore.updatePlayer(p.id, {
        wins: stored.wins + (winnerIds.includes(p.id) ? 1 : 0),
        gamesPlayed: stored.gamesPlayed + 1,
      })
    })
    // Spades is won by a partnership, but the result schema records a single winner. Take
    // the higher-seated partner as the nominal winner and keep the full picture in
    // finalScores, rather than dropping the result or inventing a fake player id.
    void recordGameResult({
      clientGameId: g.id,
      gameType: 'spades',
      winnerId: winnerIds[0]!,
      playerIds: g.players.map(p => p.id),
      startedAt: g.startedAt ?? null,
      finishedAt: new Date().toISOString(),
      roundCount: g.handNumber,
      finalScores: {
        // One entry per scoring side, so a solo game records four rows rather than
        // pretending the table was two partnerships.
        teams: g.scores.map((score, side) => ({
          players: [0, 1, 2, 3].filter(s => sideOf(s, g.mode) === side).map(s => g.players[s]!.id),
          score,
          bags: g.bags[side] ?? 0,
        })),
        mode: g.mode,
        winningTeam: g.winnerTeam,
      },
    })
    playStartChime()
  }
  spades.endGame()
  router.replace('/')
}

function quit() { spades.endGame(); goBack(router, '/') }

/**
 * Bots decide in microseconds, which reads as cards teleporting onto the table. The delay
 * is purely so a person can follow what happened — it is not compute time.
 */
const BOT_THINK_MS = 700
let botTimer: ReturnType<typeof setTimeout> | null = null

function scheduleBot() {
  if (botTimer !== null) { clearTimeout(botTimer); botTimer = null }
  if (!spades.isBotTurn()) return
  botTimer = setTimeout(() => {
    botTimer = null
    // Re-check on fire: the player may have quit or the game ended while we waited.
    if (spades.isBotTurn()) spades.botAct()
  }, BOT_THINK_MS)
}

// Watch the seat and phase together — a bot bidding then playing from the same seat is two
// separate turns, and watching the seat alone would miss the second.
watch(
  () => [game.value?.turnIndex, game.value?.phase] as const,
  () => scheduleBot(),
  { immediate: true }
)

onUnmounted(() => { if (botTimer !== null) clearTimeout(botTimer) })

/** Whether the seated player is a bot, so the board can say so instead of prompting. */
const seatedIsBot = computed(() => !!game.value?.players[game.value.turnIndex]?.isBot)
</script>

<style scoped>
.sp-page {
  display: flex; flex-direction: column; width: 100vw; height: 100dvh; overflow: hidden;
  /* Flat printed panel, not glass: solid stock with a halftone dot over it. */
  background-color: #0a0a0d;
  background-image: radial-gradient(rgba(255,255,255,0.05) 0.7px, transparent 0.7px);
  background-size: 5px 5px;
}
.sp-header {
  display: flex; align-items: center; justify-content: space-between; gap: 8px;
  padding: 10px 16px; padding-top: calc(10px + env(safe-area-inset-top));
  border-bottom: 2px solid #24242e; background: rgba(0,0,0,0.35); flex-shrink: 0;
}

/* Phone: one control. Tablet and up: the three, and the menu button goes away. */
.ha-wide { display: none; }
.ha-menu { font-size: 18px; line-height: 1; min-width: 44px; min-height: 44px; }
@media (min-width: 768px) {
  .ha-wide { display: inline-flex; }
  .ha-menu { display: none; }
}

.sheet-overlay { align-items: flex-end; }
.menu-sheet {
  width: 100%; max-width: 560px;
  display: flex; flex-direction: column; gap: 10px;
  padding: 18px 16px calc(18px + env(safe-area-inset-bottom));
}
.sheet-tape {
  align-self: flex-start;
  background: #f6f4ee; color: #101014;
  font-size: 10px; font-weight: 800; letter-spacing: 0.16em; text-transform: uppercase;
  padding: 3px 10px 2px; transform: rotate(-1.4deg);
  box-shadow: 3px 3px 0 rgba(0,0,0,0.6);
}
.sheet-btn {
  min-height: 56px; width: 100%;
  background: #17171d; color: var(--text);
  border: 2px solid rgba(255,255,255,0.14);
  font-family: var(--font-display); font-size: 20px; font-weight: 800;
  letter-spacing: 0.08em; text-transform: uppercase;
  box-shadow: 4px 4px 0 rgba(0,0,0,0.55);
  cursor: pointer;
}
.sheet-cancel { background: #101014; color: var(--text-muted); box-shadow: none; }
.sp-title-wrap { display: flex; flex-direction: column; align-items: center; }
/* Inked, not gradient-filled: a hard offset shadow is what Street does with display type. */
.sp-title {
  font-size: 30px; letter-spacing: 0.12em; margin: 0; color: #fff;
  text-shadow: 3px 3px 0 rgba(0,0,0,0.6);
}
.sp-sub { font-size: 15px; font-weight: 700; color: rgba(255,255,255,0.5); letter-spacing: 0.09em; }

.teams { display: flex; gap: 12px; padding: 12px 16px 0; flex-shrink: 0; }
/* Poster blocks: square corners, 2px border in the side's colour, hard offset shadow. */
.team {
  flex: 1; display: flex; flex-direction: column; align-items: center; gap: 2px;
  padding: 10px 12px; background: #141419; border: 2px solid #2a2a34;
  box-shadow: 5px 5px 0 rgba(0,0,0,0.55);
}
.team.t0 { border-color: #aaff00; }
.team.t1 { border-color: #ff2d78; }
.team-names { font-size: 15px; font-weight: 700; color: rgba(255,255,255,0.6); text-align: center; overflow-wrap: anywhere; }
.team-score { font-size: 40px; line-height: 0.9; color: #fff; }
.team-bags { font-size: 14px; font-weight: 800; letter-spacing: 0.08em; color: rgba(255,255,255,0.45); }

.sp-body {
  flex: 1; min-height: 0; overflow-y: auto; -webkit-overflow-scrolling: touch;
  overscroll-behavior: contain; padding: 10px 14px 16px; display: flex;
  flex-direction: column; gap: 12px;
}

.pass-screen { flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 12px; text-align: center; padding: 20px 0; }
.pass-label { font-size: 10px; letter-spacing: 0.2em; color: var(--text-muted); }
.pass-avatar { width: 84px; height: 84px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 38px; overflow: hidden; }
.pass-avatar img { width: 100%; height: 100%; object-fit: cover; }
.pass-name { font-size: 30px; margin: 0; overflow-wrap: anywhere; }
.pass-note { font-size: 13px; color: var(--text-muted); margin: 0; }
.pass-btn { margin-top: 8px; min-height: 56px; padding: 0 22px; }

.seat-strip { display: flex; align-items: baseline; justify-content: space-between; gap: 10px; }
.ss-name { font-size: 16px; font-weight: 800; overflow-wrap: anywhere; }
.ss-note { font-size: 12px; color: var(--text-muted); }

/* The hand scrolls horizontally rather than wrapping — thirteen wrapped cards push the
   bid controls off a short phone. */
.hand-row {
  display: flex; gap: 5px; overflow-x: auto; overflow-y: hidden; padding: 12px 2px 14px;
  -webkit-overflow-scrolling: touch; overscroll-behavior-x: contain;
}
/* Overlap rather than shrink: a bigger card with its corner showing beats a whole card
   too small to read. Extra right padding leaves room for the last card's hover lift. */
/* Gathered rather than spread: the overlap is tightened so the hand reads as held. */
.hand-row.fanned {
  gap: 0; align-items: flex-end; overflow: visible; justify-content: center;
  /* The side padding is the swing: an outer card turns about a pivot below the row, so it
     travels sideways as well as round, and without this it lands outside the row and gets
     clipped — the same "cannot see your hand" fault as before, by another route. */
  padding: 26px 62px 10px;
  --fan-step: 1.8deg;
}

/*
 * Fit mode: nothing scrolls, the table absorbs whatever is spare, and the hand keeps its full
 * height at the bottom. min-height: 0 is what lets the table shrink past its own content —
 * without it a flex child refuses to go below it and pushes the hand out of view again.
 */
.sp-body.fit { overflow-y: hidden; }
.sp-body.fit .table-area { flex: 1 1 auto; min-height: 0; }
.sp-body.fit .hand-row,
.sp-body.fit .bot-thinking,
.sp-body.fit .seat-strip { flex-shrink: 0; }
.hand-row.fanned > * + * { margin-left: calc(var(--fan-lap, 44px) * -1); }

/*
 * A hand being HELD, not dealt out flat. Each card turns about a pivot well below the row —
 * roughly where a thumb would be — so the fan rises into an arc on its own instead of being
 * positioned card by card. The turn lives on this wrapper rather than on the card, because the
 * card keeps its own lift when selected: on the wrapper the two compose, so a card lifting out
 * rises along the angle it is already sitting at.
 */
.fan-slot {
  display: block; flex-shrink: 0;
  transform-origin: 50% 190%;
  transform: rotate(calc((var(--i, 0) - (var(--n, 1) - 1) / 2) * var(--fan-step)));
}

.bot-thinking { display: flex; flex-direction: column; align-items: center; gap: 6px; }
.bt-note { font-size: 12px; color: var(--text-muted); }

.bid-grid { display: grid; grid-template-columns: repeat(5, 1fr); gap: 8px; }
.bid-btn {
  min-height: 48px; border-radius: 10px; background: rgba(255,255,255,0.05);
  border: 1px solid rgba(255,255,255,0.12); color: var(--text); font-weight: 800;
  font-size: 16px; cursor: pointer; font-family: var(--font-display);
}
.bid-btn:hover { background: rgba(255,255,255,0.1); }
.bid-btn.nil { grid-column: span 2; color: var(--gold); letter-spacing: 0.1em; }
.bid-btn:disabled { opacity: 0.28; cursor: default; }
.bid-btn:disabled:hover { background: rgba(255,255,255,0.05); }
.board-note { font-size: 12.5px; color: var(--text-muted); margin: 0; line-height: 1.45; text-align: center; }
.team-sets { font-size: 10px; font-weight: 800; letter-spacing: 0.08em; color: var(--text-muted); text-transform: uppercase; }
.team-sets.danger { color: #ff5fa2; }

/* ── The table ─────────────────────────────────────────────────────────────
   Below the tablet band the seats stack in reading order; from 768 up they take
   their real positions round a table, which is the whole point of the layout. */
.table-area {
  display: flex; flex-wrap: wrap; align-items: flex-start; justify-content: center;
  gap: 10px; flex-shrink: 0; padding-top: 4px;
}
/* column-reverse, so the card played sits above its own name tag. */
.seat { display: flex; flex-direction: column-reverse; align-items: center; gap: 6px; }
/* Your own plate always gets its own line, directly above your hand. */
.seat-you {
  flex-basis: 100%; flex-direction: row; align-items: center;
  justify-content: center; gap: 9px; padding-top: 2px;
}
/* On a phone the plate is a tag under the card — column, no shadow, so three fit across. */
.seat-plate {
  display: flex; flex-direction: column; align-items: center; gap: 1px;
  min-width: 64px; padding: 4px 8px; background: #141419; border: 2px solid #2a2a34;
}
.sp-name { font-family: var(--font-display); font-size: 17px; letter-spacing: 0.04em; line-height: 1; }
.sp-books { font-family: var(--font-display); font-size: 19px; line-height: 1; color: #fff; }
.sp-of {
  font-family: var(--font-body, Inter, system-ui, sans-serif); font-size: 15px; font-weight: 700;
  letter-spacing: 0.08em; color: rgba(255,255,255,0.5); margin: 0 5px;
}
.seat-card { display: flex; flex-direction: column; align-items: center; gap: 6px; }
/* An empty slot keeps the table's shape while a seat is still to play. */
.seat-slot { width: 68px; height: 99px; border: 2px dashed rgba(255,255,255,0.26); }
.you-plate { border-color: #aaff00; }
.you-tape {
  transform: rotate(-2.5deg); padding: 4px 11px 3px; background: #aaff00; color: #141c00;
  font-family: var(--font-display); font-size: 18px; letter-spacing: 0.07em;
  box-shadow: 3px 3px 0 rgba(0,0,0,0.55); white-space: nowrap;
}
.led-tape {
  transform: rotate(1.5deg); padding: 4px 11px 3px; background: #00d4ff; color: #00232c;
  font-family: var(--font-display); font-size: 18px; letter-spacing: 0.07em;
  box-shadow: 3px 3px 0 rgba(0,0,0,0.55); white-space: nowrap;
}
.tc-void {
  font-size: 13px; font-weight: 900; letter-spacing: 0.1em; color: #2b2200;
  background: var(--gold); padding: 2px 8px 1px; white-space: nowrap;
  box-shadow: 2px 2px 0 rgba(0,0,0,0.5);
}
.book-won {
  font-family: var(--font-display); font-size: 26px; letter-spacing: 0.08em;
  color: var(--gold); margin: 0;
}

.hand-over { flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 12px; text-align: center; }
.ho-title { font-size: 28px; margin: 0; color: var(--gold); }
.ho-winner { font-size: 17px; font-weight: 800; margin: 0; }
.ho-summary { font-size: 13px; color: var(--text-muted); margin: 0; line-height: 1.6; max-width: 420px; }

.sp-footer {
  flex-shrink: 0; display: flex; gap: 10px; padding: 12px 16px;
  padding-bottom: calc(12px + env(safe-area-inset-bottom));
  border-top: 2px solid #24242e; background: rgba(0,0,0,0.35);
}
.wide { width: 100%; min-height: 56px; }

.overlay {
  position: fixed; inset: 0; z-index: 50; display: flex; align-items: center;
  justify-content: center; padding: 24px; background: rgba(0,0,0,0.88);
}
/* Flat stock, square corners, hard shadow — and 620px rather than 420, because these are
   read at arm's length off a stand rather than in the hand. */
.rules-card {
  width: 100%; max-width: 620px; max-height: 86dvh; overflow-y: auto;
  display: flex; flex-direction: column; align-items: stretch; gap: 16px;
  padding: 26px 24px 24px; text-align: left;
  background-color: #101014;
  background-image: radial-gradient(rgba(255,255,255,0.055) 0.7px, transparent 0.7px);
  background-size: 5px 5px;
  border: 2px solid #2a2a34; box-shadow: 8px 8px 0 rgba(0,0,0,0.6);
}
/* A taped label, laid off-true, the way section headings are set everywhere else. */
.rules-title {
  align-self: flex-start; transform: rotate(-1.5deg); margin: 0;
  padding: 5px 14px 4px; background: var(--gold); color: #2b2200;
  font-size: 28px; letter-spacing: 0.08em; box-shadow: 3px 3px 0 rgba(0,0,0,0.55);
}
.rules-list {
  margin: 0; padding-left: 20px; display: flex; flex-direction: column; gap: 10px;
  color: var(--text); font-size: 15.5px; line-height: 1.55; text-align: left;
}
.joker-row { display: flex; gap: 10px; }

.header-actions { display: flex; gap: 8px; align-items: center; }
.sort-note { margin: 0; font-size: 15px; color: rgba(255,255,255,0.55); line-height: 1.6; }
.sort-note-left { text-align: left; }
.sort-block { width: 100%; display: flex; flex-direction: column; gap: 9px; }
/* Taped label rather than a whispered caption. */
.sort-label {
  align-self: flex-start; transform: rotate(-1deg); padding: 3px 11px 2px;
  background: rgba(255,255,255,0.1); border: 2px solid rgba(255,255,255,0.22);
  font-size: 13px; font-weight: 900; letter-spacing: 0.14em; text-transform: uppercase;
  color: rgba(255,255,255,0.7);
}
.suit-rows { display: flex; flex-direction: column; gap: 8px; }
.suit-row {
  display: flex; align-items: center; gap: 12px; padding: 9px 12px;
  background: #141419; border: 2px solid #2a2a34;
}
.suit-pos { font-family: var(--font-display); font-size: 20px; color: rgba(255,255,255,0.5); width: 14px; }
.suit-sym { font-size: 24px; line-height: 1; }
.sr-red { color: #ff2d78; }
.sr-black { color: #fff; }
.suit-name { flex: 1; text-align: left; font-size: 15px; font-weight: 700; text-transform: capitalize; }
.move-btn {
  width: 48px; height: 48px; flex-shrink: 0; cursor: pointer;
  background: #141419; border: 2px solid rgba(255,255,255,0.28);
  color: #fff; font-size: 17px; position: relative; overflow: hidden;
}
.move-btn:disabled { opacity: 0.3; cursor: default; }
.seg { display: flex; gap: 10px; }
/* Poster-block buttons: the chosen one is a solid colour fill with dark ink on it. */
.seg-btn {
  flex: 1; min-height: 52px; cursor: pointer;
  background: #141419; border: 2px solid #2a2a34;
  color: rgba(255,255,255,0.6); font-family: var(--font-display);
  font-size: 23px; letter-spacing: 0.06em; position: relative; overflow: hidden;
}
.seg-btn.on {
  background: var(--gold); border-color: #2b2200; color: #2b2200;
  box-shadow: 3px 3px 0 rgba(0,0,0,0.5);
}
.seg-btn:disabled { opacity: 0.35; cursor: default; }
.deck-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; width: 100%; }
.deck-btn {
  display: flex; align-items: center; gap: 12px; padding: 11px 13px;
  cursor: pointer; background: #141419; border: 2px solid #2a2a34;
  color: rgba(255,255,255,0.72); text-align: left;
  position: relative; overflow: hidden;
}
.deck-btn.on { border-color: var(--gold); color: #fff; background: rgba(255,215,0,0.12); }
/* A card is a physical object — its corners stay rounded even in Street. */
.deck-swatch {
  width: 30px; height: 42px; border-radius: 4px; flex-shrink: 0;
  border: 2px solid rgba(255,255,255,0.24);
}
.deck-btn.on .deck-swatch { border-color: rgba(0,0,0,0.5); }
.deck-name { flex: 1; font-family: var(--font-display); font-size: 24px; letter-spacing: 0.05em; }
.deck-default { font-size: 13px; font-weight: 900; letter-spacing: 0.1em; color: var(--gold); }
.deck-hint { font-size: 14.5px; color: rgba(255,255,255,0.5); line-height: 1.6; text-align: left; }
.empty-state {
  height: 100dvh; display: flex; flex-direction: column; align-items: center;
  justify-content: center; gap: 16px; color: var(--text-muted);
}

/* ── Solo play and the bigger end-of-hand board ───────────────────────────── */

/* Four sides do not fit the two-column strip, so solo wraps into a grid instead. */
.teams.solo { display: grid; grid-template-columns: repeat(2, 1fr); }
.team.t2 { border-left-color: #ffd700; }
.team.t3 { border-left-color: #ff5fa2; }

/* The end of a hand is the one moment the whole table is looking at the screen from
   wherever they happen to be sitting, so it is set to be read across a room. */
.ho-title { font-size: clamp(38px, 9vw, 64px); letter-spacing: 0.06em; margin: 0; }
.ho-winner { font-size: clamp(18px, 4.4vw, 28px); font-weight: 800; color: var(--gold); margin: 0; line-height: 1.3; }

.ho-loss { font-size: clamp(15px, 3.4vw, 20px); font-weight: 800; color: #ff5fa2; margin: 0; line-height: 1.35; }

.ho-sides {
  display: grid; grid-template-columns: repeat(auto-fit, minmax(min(100%, 210px), 1fr));
  gap: 12px; width: 100%; max-width: 900px;
}
.ho-side {
  display: flex; flex-direction: column; align-items: center; gap: 4px;
  padding: 16px 14px; border-radius: 12px; background: rgba(255,255,255,0.05);
  border: 1px solid rgba(255,255,255,0.1); border-top: 4px solid;
}
.ho-side.t0 { border-top-color: #7ee68a; }
.ho-side.t1 { border-top-color: #5fd0ff; }
.ho-side.t2 { border-top-color: #ffd700; }
.ho-side.t3 { border-top-color: #ff5fa2; }
.hs-names { font-size: 13px; font-weight: 700; color: var(--text-muted); text-align: center; overflow-wrap: anywhere; }
.hs-line { display: flex; align-items: baseline; gap: 8px; }
.hs-big { font-size: clamp(40px, 9vw, 60px); line-height: 1; }
.hs-of { font-size: 13px; font-weight: 700; color: var(--text-muted); }
.hs-verdict { font-size: 12px; font-weight: 800; letter-spacing: 0.14em; }
.hs-verdict.is-made { color: #7ee68a; }
.hs-verdict.is-set { color: #ff5fa2; }
.hs-pts { font-size: clamp(28px, 6vw, 40px); line-height: 1; }
.hs-note { font-size: 11px; font-weight: 700; letter-spacing: 0.1em; color: var(--gold); text-transform: uppercase; }
.hs-pen { font-size: 12px; font-weight: 800; color: #ff5fa2; }
.hs-total { font-size: 14px; font-weight: 700; color: var(--text-muted); }
.hs-sets { font-size: 11px; font-weight: 800; letter-spacing: 0.08em; color: var(--text-muted); text-transform: uppercase; }
.hs-sets.danger { color: #ff5fa2; }

/* Individual bids are deliberately smaller than the side totals — they are the detail
   people go looking for after the result, not the result itself. */
.ho-seats { display: flex; flex-direction: column; align-items: center; gap: 8px; width: 100%; }
.ho-seats-label { font-size: 10px; font-weight: 800; letter-spacing: 0.16em; color: var(--text-muted); }
.ho-seat-row { display: flex; flex-wrap: wrap; gap: 8px; justify-content: center; }
.ho-seat {
  display: flex; flex-direction: column; align-items: center; gap: 2px;
  min-width: 82px; padding: 8px 12px; border-radius: 10px;
  background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.09);
}
.hp-name { font-size: 11px; color: var(--text-muted); overflow-wrap: anywhere; }
.hp-val { font-size: 22px; line-height: 1; }
.hp-of { font-family: var(--font-body, Inter, system-ui, sans-serif); font-size: 11px; font-weight: 600; color: var(--text-muted); margin: 0 4px; }

/* iPad and desktop have the room for larger cards, so the rows that hold them grow too. */
@media (min-width: 768px) {
  .hand-row { gap: 8px; padding: 16px 4px 18px; }
  .team-score { font-size: 46px; }

  /* Each seat takes its real position: across the table, left, right, and you at the
     bottom above your own hand. */
  .table-area { display: block; position: relative; flex: 1; min-height: 380px; padding-top: 0; }
  .seat { position: absolute; gap: 12px; }
  .seat-top { left: 50%; top: 0; transform: translateX(-50%); flex-direction: column-reverse; }
  .seat-left { left: 0; top: 50%; transform: translateY(-50%); flex-direction: row; }
  .seat-right { right: 0; top: 50%; transform: translateY(-50%); flex-direction: row-reverse; }
  .seat-you { left: 50%; bottom: 0; transform: translateX(-50%); flex-basis: auto; padding-top: 0; }
  .book-won { position: absolute; left: 0; bottom: 4px; }
  .seat-slot { width: 124px; height: 180px; }

  /* Room for the plate to be a plate again, beside its card rather than a tag under it. */
  .seat-plate {
    flex-direction: row; align-items: center; gap: 10px; min-width: 0; padding: 8px 14px;
    box-shadow: 5px 5px 0 rgba(0,0,0,0.55);
  }
  .sp-name { font-size: 24px; letter-spacing: 0.06em; }
  .sp-books { font-size: 30px; line-height: 0.85; }
  .you-tape, .led-tape { padding: 5px 14px 4px; font-size: 23px; letter-spacing: 0.09em; }
}
@media (min-width: 1100px) {
  .hand-row { gap: 10px; justify-content: center; }
  .table-area { min-height: 420px; }
  .seat-slot { width: 148px; height: 215px; }
}
</style>
