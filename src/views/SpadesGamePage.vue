<template>
  <div v-if="game" class="sp-page">
    <div class="drip-bar" />

    <header class="sp-header">
      <button v-ripple class="btn btn-outline btn-sm" @click="quit">← Quit</button>
      <div class="sp-title-wrap">
        <h1 class="sp-title display">SPADES</h1>
        <span class="sp-sub">{{ VARIANT_LABELS[game.variant] }} · {{ game.mode === 'solo' ? 'solo' : 'partners' }} · hand {{ game.handNumber }} · to {{ target }}</span>
      </div>
      <div class="header-actions">
        <button v-ripple class="btn btn-outline btn-sm" @click="showDeck = true">Deck</button>
        <button v-ripple class="btn btn-outline btn-sm" @click="showSort = true">Sort</button>
        <button v-ripple class="btn btn-outline btn-sm" @click="showRules = true">Rules</button>
      </div>
    </header>

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

    <div class="sp-body">
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
          <div class="hand-row fanned">
            <PlayingCard :theme="deck.theme" :art-courts="deck.artCourts" :out-of-play="deck.outOfPlay" v-for="i in 13" :key="i" :card="{ kind: 'joker', joker: 'big' }" :width="cardWidth" faceDown />
          </div>
          <span class="bt-note">{{ seated.name }} is looking at their hand</span>
        </div>
        <div v-else class="hand-row fanned">
          <PlayingCard :theme="deck.theme" :art-courts="deck.artCourts" :out-of-play="deck.outOfPlay" v-for="c in sortedHand" :key="cardId(c)" :card="c" :width="cardWidth" />
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
        <!-- The bid on show during play is the SIDE's contract, not the individual bids —
             those stay private until the hand is scored. -->
        <div class="bids-row" :class="{ solo: game.mode === 'solo' }">
          <div v-for="s in sides" :key="s.side" class="bid-chip" :class="{ turn: s.isTurn }">
            <span class="bc-name">{{ s.names }}</span>
            <span class="bc-val">{{ s.books }}<span class="bc-sep">of</span>{{ s.bid === null ? '—' : s.bid }}</span>
            <span class="bc-label">books · bid</span>
            <span v-if="s.nils > 0" class="bc-nil">{{ s.nils > 1 ? s.nils + ' × NIL' : 'NIL' }}</span>
          </div>
        </div>

        <div class="book-area">
          <p v-if="game.currentBook.length === 0" class="book-hint">
            {{ seated.name }} leads{{ game.spadesBroken ? '' : ' — spades not broken' }}
          </p>
          <div class="book-cards">
            <div v-for="(t, i) in game.currentBook" :key="t.seat" class="book-card">
              <PlayingCard :theme="deck.theme" :art-courts="deck.artCourts" :out-of-play="deck.outOfPlay" :card="t.card" :width="bookCardWidth" />
              <span class="tc-name">{{ game.players[t.seat]?.name }}</span>
              <!-- Following suit is enforced, so an off-suit card can only mean a void.
                   Saying so stops it reading as the game letting someone cheat. -->
              <span v-if="offSuit(t, i)" class="tc-void">void in {{ ledSymbol }}</span>
            </div>
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
            <div class="hand-row fanned">
              <PlayingCard :theme="deck.theme" :art-courts="deck.artCourts" :out-of-play="deck.outOfPlay"
                v-for="i in (game.hands[game.turnIndex]?.length ?? 0)"
                :key="i"
                :card="{ kind: 'joker', joker: 'big' }"
                :width="cardWidth"
                faceDown
              />
            </div>
          </div>
          <div v-else class="hand-row fanned">
            <PlayingCard :theme="deck.theme" :art-courts="deck.artCourts" :out-of-play="deck.outOfPlay"
              v-for="c in sortedHand"
              :key="cardId(c)"
              :card="c"
              :width="cardWidth"
              interactive
              :playable="spades.isLegal(c)"
              @play="onPlay"
            />
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
      <template v-else-if="game.phase === 'hand_over'">
        <button v-ripple class="btn btn-outline btn-lg review-btn" @click="showReview = true">Review books</button>
        <button v-ripple class="btn btn-spray btn-lg" @click="spades.nextHand()">
          Deal hand {{ game.handNumber + 1 }} →
        </button>
      </template>
      <template v-else-if="game.phase === 'game_over'">
        <button v-ripple class="btn btn-outline btn-lg review-btn" @click="showReview = true">Review books</button>
        <button v-ripple class="btn btn-spray btn-lg" @click="finish">Done</button>
      </template>
    </footer>

    <div v-if="showDeck" class="overlay" @click.self="showDeck = false">
      <div class="rules-card glass-panel">
        <h2 class="rules-title display">CARD STYLE</h2>
        <p class="sort-note">Changes apply straight away — mid-hand is fine.</p>

        <div class="deck-grid">
          <button
            v-for="d in DECKS" :key="d.id"
            v-ripple
            class="deck-btn"
            :class="{ on: deck.theme === d.id }"
            @click="setTheme(d.id)"
          >
            <span class="deck-swatch" :style="d.swatch" />
            <span class="deck-name">{{ d.name }}</span>
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
          <span v-if="!artAvailable" class="deck-hint">
            Vintage has no traditional courts — its aged stock reads as a different century from the artwork.
          </span>
        </div>

        <button v-ripple class="btn btn-spray wide" @click="showDeck = false">Done</button>
      </div>
    </div>

    <div v-if="showSort" class="overlay" @click.self="showSort = false">
      <div class="rules-card glass-panel">
        <h2 class="rules-title display">HOW YOUR HAND SITS</h2>
        <p class="sort-note">Display only — it never changes what you are allowed to play.</p>

        <div class="sort-block">
          <span class="sort-label">Suit order, left to right</span>
          <div class="suit-rows">
            <div v-for="(s, i) in sortPrefs.suitOrder" :key="s" class="suit-row">
              <span class="suit-pos">{{ i + 1 }}</span>
              <span class="suit-sym" :class="s === 'hearts' || s === 'diamonds' ? 'sr-red' : 'sr-black'">
                {{ SUIT_SYMBOL[s] }}
              </span>
              <span class="suit-name">{{ s }}</span>
              <button v-ripple class="move-btn" :disabled="i === 0" @click="moveSuit(i, -1)">↑</button>
              <button v-ripple class="move-btn" :disabled="i === sortPrefs.suitOrder.length - 1" @click="moveSuit(i, 1)">↓</button>
            </div>
          </div>
        </div>

        <div class="sort-block">
          <span class="sort-label">Within a suit</span>
          <div class="seg">
            <button v-ripple class="seg-btn" :class="{ on: sortPrefs.ascending }" @click="sortPrefs.ascending = true">Low → High</button>
            <button v-ripple class="seg-btn" :class="{ on: !sortPrefs.ascending }" @click="sortPrefs.ascending = false">High → Low</button>
          </div>
        </div>

        <div v-if="game.variant === 'wild'" class="sort-block">
          <span class="sort-label">Jokers</span>
          <div class="seg">
            <button v-ripple class="seg-btn" :class="{ on: sortPrefs.jokersLast }" @click="sortPrefs.jokersLast = true">Far right</button>
            <button v-ripple class="seg-btn" :class="{ on: !sortPrefs.jokersLast }" @click="sortPrefs.jokersLast = false">With spades</button>
          </div>
        </div>

        <button v-ripple class="btn btn-outline wide" @click="resetSort">Reset to default</button>
        <button v-ripple class="btn btn-spray wide" @click="showSort = false">Done</button>
      </div>
    </div>

    <!--
      Reading the hand back. Books are otherwise discarded the moment the next one leads, so
      once a hand is scored there is no way to see how it got there — which card gave a book
      away, or where a side stopped making its bid.
    -->
    <div v-if="showReview" class="overlay" @click.self="showReview = false">
      <div class="review-card glass-panel">
        <div class="review-head">
          <h2 class="review-title display">HAND {{ game.handNumber }}</h2>
          <button class="review-close" aria-label="Close" @click="showReview = false">✕</button>
        </div>

        <div v-if="game.bookLog.length === 0" class="review-empty">
          No books were played in this hand.
        </div>

        <div v-for="b in game.bookLog" :key="b.number" class="review-book">
          <div class="rb-head">
            <span class="rb-num display">BOOK {{ b.number }}</span>
            <span class="rb-note">{{ bookInsight(b) }}</span>
          </div>
          <div class="rb-cards">
            <div
              v-for="(c, i) in b.cards"
              :key="c.seat"
              class="rb-card"
              :class="{ won: c.seat === b.winnerSeat }"
            >
              <PlayingCard :card="c.card" :width="42" />
              <span class="rb-name" :style="{ color: game.players[c.seat]?.color }">
                {{ game.players[c.seat]?.name }}
              </span>
              <!-- The two facts a learner needs: who led, and who was out of the suit. -->
              <span v-if="i === 0" class="rb-tag">led</span>
              <span v-else-if="couldNotFollow(b, c.seat)" class="rb-tag rb-tag-void">void</span>
            </div>
          </div>
          <span class="rb-winner">{{ game.players[b.winnerSeat]?.name }} takes it</span>
        </div>

        <button v-ripple class="btn btn-spray wide" @click="showReview = false">Close</button>
      </div>
    </div>

    <div v-if="showRules" class="overlay" @click.self="showRules = false">
      <div class="rules-card glass-panel">
        <h2 class="rules-title display">SPADES — {{ VARIANT_LABELS[game.variant].toUpperCase() }}</h2>
        <ul class="rules-list"><li v-for="(r, i) in rules" :key="i">{{ r }}</li></ul>
        <div v-if="game.variant === 'wild'" class="joker-row">
          <PlayingCard :theme="deck.theme" :art-courts="deck.artCourts" :out-of-play="deck.outOfPlay" :card="{ kind: 'joker', joker: 'big' }" :width="84" />
          <PlayingCard :theme="deck.theme" :art-courts="deck.artCourts" :out-of-play="deck.outOfPlay" :card="{ kind: 'joker', joker: 'little' }" :width="84" />
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
import PlayingCard, { ART_CAPABLE, type CardTheme, type OutOfPlay } from '../components/PlayingCard.vue'
import { useSpadesStore } from '../stores/spades'
import { usePlayersStore } from '../stores/players'
import {
  DEFAULT_HAND_SORT, BOARD, HAND_SIZE, SUIT_SYMBOL, VARIANT_LABELS, cardId,
  bookInsight, couldNotFollow, effectiveSuit, rulesFor, sideCount, sideOf, sortHand, targetFor,
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
const showReview = ref(false)
const showSort = ref(false)
const showDeck = ref(false)

/**
 * Which deck this device draws. Kept beside the sort preference in localStorage — it is
 * a way of seeing the cards, not part of the game, so it changes live and never travels
 * with a synced game.
 */
const DECKS = [
  { id: 'ink',      name: 'Ink',      swatch: { background: 'linear-gradient(135deg,#8fdcff,#ff7f9c)' } },
  { id: 'bold',     name: 'Bold',     swatch: { background: 'linear-gradient(135deg,#101014,#e01b3c)' } },
  { id: 'classic',  name: 'Classic',  swatch: { background: 'linear-gradient(135deg,#17171b,#d1122c)' } },
  { id: 'vintage',  name: 'Vintage',  swatch: { background: 'linear-gradient(135deg,#2b2118,#a8202a)' } },
  { id: 'midnight', name: 'Midnight', swatch: { background: 'linear-gradient(135deg,#e3e9f7,#ff8b93)' } },
  { id: 'slate',    name: 'Slate',    swatch: { background: 'linear-gradient(135deg,#ece2c8,#f2946b)' } },
] as const

/*
 * Bellot's traditional artwork IS the Spades deck. It was being treated as an option two
 * switches deep: the default was ink with themed courts, and ink is excluded from
 * ART_CAPABLE, so the artwork could not appear until the player left ink AND flipped courts
 * to Traditional. The settled joker markers sat behind the same two switches and fell back
 * to the star and word. Classic is the stock the artwork was drawn for, so that is the
 * default now; ink stays selectable as the novelty it was meant to be.
 *
 * The key is versioned because devices already carry a saved "ink / themed" from before
 * this, and a stored preference would otherwise keep overriding the new default forever.
 */
const DECK_KEY = 'spades_deck_v2'
type DeckPrefs = { theme: CardTheme; artCourts: boolean; outOfPlay: OutOfPlay }
const OUT_OF_PLAY: OutOfPlay[] = ['sunk', 'taped']
const DEFAULT_DECK: DeckPrefs = { theme: 'classic', artCourts: true, outOfPlay: 'sunk' }
function loadDeck(): DeckPrefs {
  try {
    const raw = localStorage.getItem(DECK_KEY)
    if (!raw) return { ...DEFAULT_DECK }
    const p = JSON.parse(raw) as Partial<DeckPrefs>
    const theme = DECKS.some(d => d.id === p.theme) ? p.theme! : DEFAULT_DECK.theme
    // A stored "traditional" from before a switch to vintage would have nothing to draw.
    return {
      theme,
      artCourts: !!p.artCourts && ART_CAPABLE.includes(theme),
      outOfPlay: OUT_OF_PLAY.includes(p.outOfPlay!) ? p.outOfPlay! : DEFAULT_DECK.outOfPlay,
    }
  } catch { return { ...DEFAULT_DECK } }
}
const deck = ref(loadDeck())
const artAvailable = computed(() => ART_CAPABLE.includes(deck.value.theme))
watch(deck, (d) => {
  try { localStorage.setItem(DECK_KEY, JSON.stringify(d)) } catch { /* best effort: storage can be full, or unavailable in private mode */ }
}, { deep: true })

function setTheme(theme: CardTheme) {
  // Switching to a deck without artwork has to drop the art choice, or the courts would
  // silently fall back to the themed mark while the control still said "Traditional".
  deck.value = { theme, artCourts: deck.value.artCourts && ART_CAPABLE.includes(theme), outOfPlay: deck.value.outOfPlay }
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
const sortPrefs = ref<HandSortPrefs>(loadSortPrefs())
watch(sortPrefs, (p) => {
  try { localStorage.setItem(SORT_KEY, JSON.stringify(p)) } catch { /* best effort: storage can be full, or unavailable in private mode */ }
}, { deep: true })

function moveSuit(i: number, delta: number) {
  const order = [...sortPrefs.value.suitOrder]
  const j = i + delta
  if (j < 0 || j >= order.length) return
  ;[order[i], order[j]] = [order[j]!, order[i]!]
  sortPrefs.value = { ...sortPrefs.value, suitOrder: order }
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
  viewportWidth.value >= 1100 ? 'desktop' : viewportWidth.value >= 700 ? 'tablet' : 'phone'
)

const cardWidth = computed(() => {
  const crowded = sortedHand.value.length > 9
  if (sizeTier.value === 'desktop') return crowded ? 148 : 172
  if (sizeTier.value === 'tablet') return crowded ? 124 : 146
  return crowded ? 94 : 112
})

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
  spades.playCard(c)
  playTurnResultSound(false)
}

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
.sp-page { display: flex; flex-direction: column; width: 100vw; height: 100dvh; overflow: hidden; background: #0a0a12; }
.sp-header {
  display: flex; align-items: center; justify-content: space-between; gap: 8px;
  padding: 12px 14px; padding-top: calc(12px + env(safe-area-inset-top));
  border-bottom: 2px solid rgba(255,255,255,0.08); background: rgba(0,0,0,0.6); flex-shrink: 0;
}
.sp-title-wrap { display: flex; flex-direction: column; align-items: center; }
.sp-title {
  font-size: 21px; letter-spacing: 0.14em; margin: 0;
  background: linear-gradient(135deg, #cfd4ff, #8f7bff);
  -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text;
}
.sp-sub { font-size: 10px; color: var(--text-muted); letter-spacing: 0.08em; }

.teams { display: flex; gap: 8px; padding: 10px 14px; flex-shrink: 0; }
.team {
  flex: 1; display: flex; flex-direction: column; align-items: center; gap: 1px;
  padding: 8px;  background: #16161c; border-left: 4px solid;
}
.team.t0 { border-left-color: #7ee68a; }
.team.t1 { border-left-color: #5fd0ff; }
.team-names { font-size: 11px; font-weight: 600; color: var(--text-muted); text-align: center; overflow-wrap: anywhere; }
.team-score { font-size: 22px; }
.team-bags { font-size: 10px; color: var(--text-muted); }

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
.hand-row.fanned { gap: 0; padding-right: 14px; }
.hand-row.fanned > * + * { margin-left: -40px; }

.bot-thinking { display: flex; flex-direction: column; align-items: center; gap: 6px; }
.bt-note { font-size: 12px; color: var(--text-muted); }

.bid-grid { display: grid; grid-template-columns: repeat(5, 1fr); gap: 8px; }
.bid-btn {
  min-height: 48px;  background: #17171d;
  border: 2px solid rgba(255,255,255,0.12); color: var(--text); font-weight: 800;
  font-size: 16px; cursor: pointer; font-family: var(--font-display);
}

.bid-btn.nil { grid-column: span 2; color: var(--gold); letter-spacing: 0.1em; }
.bid-btn:disabled { opacity: 0.28; cursor: default; }

.board-note { font-size: 12.5px; color: var(--text-muted); margin: 0; line-height: 1.45; text-align: center; }
.team-sets { font-size: 10px; font-weight: 800; letter-spacing: 0.08em; color: var(--text-muted); text-transform: uppercase; }
.team-sets.danger { color: #ff5fa2; }

.bids-row { display: flex; flex-wrap: wrap; gap: 6px; }
.bid-chip {
  flex: 1 1 auto; min-width: 72px; display: flex; flex-direction: column; align-items: center;
  padding: 6px 8px;  background: #16161c;
  border: 2px solid transparent;
}
.bid-chip.turn { border-color: var(--gold); background: #202027; }
.bc-name { font-size: 10px; color: var(--text-muted); overflow-wrap: anywhere; }
.bc-val { font-size: 15px; font-weight: 800; }

.book-area { display: flex; flex-direction: column; align-items: center; gap: 8px; min-height: 182px; justify-content: center; }
.book-cards { display: flex; gap: 8px; flex-wrap: wrap; justify-content: center; }
.book-card { display: flex; flex-direction: column; align-items: center; gap: 4px; }
.tc-name { font-size: 11px; color: var(--text-muted); overflow-wrap: anywhere; max-width: 94px; text-align: center; }
.tc-void {
  font-size: 9px; font-weight: 800; letter-spacing: 0.06em; color: var(--gold);
  background: rgba(255,215,0,0.12); border: 2px solid rgba(255,215,0,0.3);
   padding: 1px 5px; white-space: nowrap;
}
.book-hint { font-size: 13px; color: var(--text-muted); margin: 0; text-align: center; }
.book-won { font-size: 14px; font-weight: 800; color: var(--gold); margin: 0; }

.hand-over { flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 12px; text-align: center; }
.ho-title { font-size: 28px; margin: 0; color: var(--gold); }
.ho-winner { font-size: 17px; font-weight: 800; margin: 0; }
.ho-summary { font-size: 13px; color: var(--text-muted); margin: 0; line-height: 1.6; max-width: 420px; }

.sp-footer {
  flex-shrink: 0; display: flex; gap: 10px; padding: 12px 14px;
  padding-bottom: calc(12px + env(safe-area-inset-bottom));
  border-top: 2px solid rgba(255,255,255,0.08); background: rgba(0,0,0,0.6);
}
.wide { width: 100%; min-height: 56px; }
/* Two buttons share the footer once a hand is over: review keeps its natural width so the
   label never truncates, and the primary action takes what is left. */
.review-btn { flex-shrink: 0; min-height: 56px; padding: 0 16px; }
.sp-footer .btn-spray { flex: 1; min-height: 56px; }

.overlay {
  position: fixed; inset: 0; z-index: 50; display: flex; align-items: center;
  justify-content: center; padding: 24px; background: rgba(0,0,0,0.82);
  backdrop-filter: blur(6px); -webkit-backdrop-filter: blur(6px);
}
/* ── Reading the hand back ── */
/* Bounded and scrollable: thirteen books do not fit a phone, and an unbounded card grows
   past the viewport and takes its own close button off screen with it. */
.review-card {
  width: 100%; max-width: 460px; max-height: 86dvh; overflow-y: auto;
  -webkit-overflow-scrolling: touch; overscroll-behavior: contain;
  display: flex; flex-direction: column; gap: 12px;
  padding: 20px 18px; 
}
.review-head { display: flex; align-items: center; justify-content: space-between; gap: 12px; }
.review-title { font-size: 20px; margin: 0; color: var(--gold); letter-spacing: 0.1em; }
.review-close {
  background: none; border: none; color: var(--text-muted); font-size: 20px;
  cursor: pointer; padding: 4px 8px; min-height: 44px; min-width: 44px; flex-shrink: 0;
}
.review-empty { font-size: 13px; color: var(--text-muted); text-align: center; padding: 20px 0; }

.review-book {
  display: flex; flex-direction: column; gap: 6px;
  padding: 10px 12px; 
  background: #16161c; border: 2px solid rgba(255,255,255,0.08);
}
.rb-head { display: flex; align-items: baseline; justify-content: space-between; gap: 10px; }
.rb-num { font-size: 13px; letter-spacing: 0.12em; color: rgba(255,255,255,0.75); }
.rb-note { font-size: 10.5px; font-weight: 700; color: var(--text-muted); text-align: right; }

/* Scrolls rather than wrapping, so four cards stay on one line on a narrow phone. */
.rb-cards { display: flex; gap: 6px; overflow-x: auto; padding-bottom: 2px; }
.rb-card {
  display: flex; flex-direction: column; align-items: center; gap: 3px;
  flex-shrink: 0; padding: 4px;  border: 2px solid transparent;
}
.rb-card.won { border-color: var(--gold); background: rgba(255,200,87,0.1); }
.rb-name { font-size: 9.5px; font-weight: 700; max-width: 52px; text-align: center; overflow-wrap: anywhere; }
.rb-tag {
  font-size: 8px; font-weight: 900; letter-spacing: 0.1em; text-transform: uppercase;
  color: rgba(255,255,255,0.5);
}
.rb-tag-void { color: var(--pink); }
.rb-winner { font-size: 11px; font-weight: 700; color: var(--gold); }

.rules-card {
  width: 100%; max-width: 420px; max-height: 82dvh; overflow-y: auto;
  display: flex; flex-direction: column; align-items: center; gap: 12px;
  padding: 26px 22px;  text-align: center;
}
.rules-title { font-size: 19px; margin: 0; color: var(--gold); }
.rules-list {
  margin: 0; padding-left: 18px; display: flex; flex-direction: column; gap: 8px;
  color: var(--text); font-size: 13.5px; line-height: 1.5; text-align: left;
}
.joker-row { display: flex; gap: 10px; }

.header-actions { display: flex; gap: 8px; align-items: center; }
.sort-note { margin: 0; font-size: 12px; color: var(--text-muted); text-align: center; }
.sort-block { width: 100%; display: flex; flex-direction: column; gap: 8px; }
.sort-label { font-size: 10px; font-weight: 800; letter-spacing: 0.16em; text-transform: uppercase; color: var(--text-muted); text-align: left; }
.suit-rows { display: flex; flex-direction: column; gap: 6px; }
.suit-row {
  display: flex; align-items: center; gap: 10px; padding: 8px 10px; 
  background: #17171d; border: 2px solid rgba(255,255,255,0.1);
}
.suit-pos { font-size: 11px; font-weight: 800; color: var(--text-muted); width: 12px; }
.suit-sym { font-size: 20px; line-height: 1; }
.sr-red { color: #ff7f9c; }
.sr-black { color: #8fdcff; }
.suit-name { flex: 1; text-align: left; font-size: 13px; font-weight: 700; text-transform: capitalize; }
.move-btn {
  width: 34px; height: 34px; flex-shrink: 0;  cursor: pointer;
  background: #1a1a20; border: 2px solid rgba(255,255,255,0.16);
  color: #fff; font-size: 14px; position: relative; overflow: hidden;
}
.move-btn:disabled { opacity: 0.3; cursor: default; }
.seg { display: flex; gap: 8px; }
.seg-btn {
  flex: 1; min-height: 44px;  cursor: pointer;
  background: #17171d; border: 2px solid rgba(255,255,255,0.14);
  color: rgba(255,255,255,0.65); font-size: 13px; font-weight: 800;
  position: relative; overflow: hidden;
}
.seg-btn.on { border-color: var(--gold); color: #fff; background: rgba(255,215,0,0.12); }
.seg-btn:disabled { opacity: 0.35; cursor: default; }
.deck-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 8px; width: 100%; }
.deck-btn {
  display: flex; align-items: center; gap: 10px; padding: 10px 12px; 
  cursor: pointer; background: #17171d;
  border: 2px solid rgba(255,255,255,0.14); color: rgba(255,255,255,0.7);
  font-size: 14px; font-weight: 700; text-align: left;
  position: relative; overflow: hidden;
}
.deck-btn.on { border-color: var(--gold); color: #fff; background: rgba(255,215,0,0.1); }
.deck-swatch { width: 22px; height: 30px;  flex-shrink: 0; border: 2px solid rgba(255,255,255,0.3); }
.deck-name { flex: 1; }
.deck-hint { font-size: 11px; color: var(--text-muted); line-height: 1.5; text-align: left; }
.empty-state {
  height: 100dvh; display: flex; flex-direction: column; align-items: center;
  justify-content: center; gap: 16px; color: var(--text-muted);
}

/* ── Solo play and the bigger end-of-hand board ───────────────────────────── */

/* Four sides do not fit the two-column strip, so solo wraps into a grid instead. */
.teams.solo { display: grid; grid-template-columns: repeat(2, 1fr); }
/* Four chips do not fit one row on a phone, and wrapping a flex row leaves the last one
   stretched across the full width on its own — three narrow chips and one enormous. A grid
   keeps all four the same size, matching the score panels above them. */
.bids-row.solo { display: grid; grid-template-columns: repeat(2, 1fr); }
.team.t2 { border-left-color: #ffd700; }
.team.t3 { border-left-color: #ff5fa2; }

.bc-sep { font-size: 11px; font-weight: 600; color: var(--text-muted); margin: 0 4px; }
.bc-label { font-size: 9px; font-weight: 800; letter-spacing: 0.1em; color: var(--text-muted); text-transform: uppercase; }
.bc-nil { font-size: 9px; font-weight: 800; letter-spacing: 0.12em; color: var(--gold); }

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
  padding: 16px 14px;  background: #17171d;
  border: 2px solid rgba(255,255,255,0.1); border-top: 4px solid;
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
  min-width: 82px; padding: 8px 12px; 
  background: #16161c; border: 2px solid rgba(255,255,255,0.09);
}
.hp-name { font-size: 11px; color: var(--text-muted); overflow-wrap: anywhere; }
.hp-val { font-size: 22px; line-height: 1; }
.hp-of { font-family: var(--font-body, Inter, system-ui, sans-serif); font-size: 11px; font-weight: 600; color: var(--text-muted); margin: 0 4px; }

/* iPad and desktop have the room for larger cards, so the rows that hold them grow too. */
@media (min-width: 768px) {
  .hand-row { gap: 8px; padding: 16px 4px 18px; }
  .book-area { min-height: 240px; }
  .book-cards { gap: 12px; }
  .tc-name { font-size: 13px; max-width: 124px; }
  .team-score { font-size: 30px; }
  .team-names { font-size: 13px; }
  .bc-val { font-size: 20px; }
  .bc-name { font-size: 12px; }
}
@media (min-width: 1100px) {
  .hand-row { gap: 10px; justify-content: center; }
  .book-area { min-height: 290px; }
  .tc-name { font-size: 14px; max-width: 148px; }
  .team-score { font-size: 36px; }
}

/* ══════════════════════════════════════════════════════════════════════
   STREET TREATMENT — identical block in every view. Flat printed panels
   instead of glass: no blur, square corners, 2px rules, hard offset
   shadows, halftone grain. Adds only what the sweep cannot infer.
   Lift this into src/style.css once the look is settled.
   ══════════════════════════════════════════════════════════════════════ */
.display { text-shadow: 2px 2px 0 rgba(0,0,0,0.55); }
.glass-panel::before, .panel::before, .card::before {
  content: '';
  position: absolute; inset: 0; pointer-events: none; z-index: 0;
  background-image: radial-gradient(rgba(255,255,255,0.13) 0.7px, transparent 0.7px);
  background-size: 5px 5px;
  opacity: 0.5;
}
.glass-panel > *, .panel > *, .card > * { position: relative; z-index: 1; }
.toggle-thumb { border-radius: 0; box-shadow: 1px 1px 0 rgba(0,0,0,0.5); }

@media (hover: hover) and (pointer: fine) {
  .bid-btn:hover { background: #222229; }
  .bid-btn:disabled:hover { background: #17171d; }
}
</style>
