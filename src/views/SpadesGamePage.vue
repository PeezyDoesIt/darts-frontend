<template>
  <div v-if="game" class="sp-page">
    <div class="drip-bar" />

    <header class="sp-header">
      <button v-ripple class="btn btn-outline btn-sm" @click="quit">← Quit</button>
      <div class="sp-title-wrap">
        <h1 class="sp-title display">SPADES</h1>
        <span class="sp-sub">hand {{ game.handNumber }} · to {{ WINNING_SCORE }}</span>
      </div>
      <button v-ripple class="btn btn-outline btn-sm" @click="showRules = true">Rules</button>
    </header>

    <!-- Team scores -->
    <div class="teams">
      <div v-for="t in [0, 1] as const" :key="t" class="team" :class="`t${t}`">
        <span class="team-names">{{ teamNames(t) }}</span>
        <span class="team-score display">{{ game.scores[t] }}</span>
        <span class="team-bags">{{ game.bags[t] }} bags</span>
      </div>
    </div>

    <div class="sp-body">
      <!-- ── Privacy screen ─────────────────────────────── -->
      <div v-if="game.phase === 'pass'" class="pass-screen">
        <span class="pass-label">PASS THE DEVICE TO</span>
        <div class="pass-avatar" :style="{ background: seated.color }">
          <img v-if="isPhoto(seated.avatarUrl)" :src="seated.avatarUrl!" alt="" />
          <span v-else>🂡</span>
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
          <span class="ss-note">{{ seatedIsBot ? 'is bidding…' : 'how many tricks?' }}</span>
        </div>
        <!-- A bot's hand is never rendered — showing it would hand the table its cards. -->
        <div v-if="seatedIsBot" class="bot-thinking">
          <div class="hand-row">
            <PlayingCard v-for="i in 13" :key="i" :card="{ kind: 'joker', joker: 'big' }" :width="cardWidth" faceDown />
          </div>
          <span class="bt-note">{{ seated.name }} is looking at their hand</span>
        </div>
        <div v-else class="hand-row">
          <PlayingCard v-for="c in sortedHand" :key="cardId(c)" :card="c" :width="cardWidth" />
        </div>
        <div v-if="!seatedIsBot" class="bid-grid">
          <button
            v-for="n in 14"
            :key="n - 1"
            v-ripple
            class="bid-btn"
            :class="{ nil: n - 1 === 0 }"
            @click="submitBid(n - 1)"
          >{{ n - 1 === 0 ? 'NIL' : n - 1 }}</button>
        </div>
      </template>

      <!-- ── Playing ────────────────────────────────────── -->
      <template v-else-if="game.phase === 'playing' || game.phase === 'trick_end'">
        <div class="bids-row">
          <div v-for="(p, i) in game.players" :key="p.id" class="bid-chip" :class="{ turn: i === game.turnIndex }">
            <span class="bc-name">{{ p.name }}</span>
            <span class="bc-val">{{ game.tricksWon[i] }}/{{ game.bids[i] === 0 ? 'nil' : game.bids[i] }}</span>
          </div>
        </div>

        <div class="trick-area">
          <p v-if="game.currentTrick.length === 0" class="trick-hint">
            {{ seated.name }} leads{{ game.spadesBroken ? '' : ' — spades not broken' }}
          </p>
          <div class="trick-cards">
            <div v-for="t in game.currentTrick" :key="t.seat" class="trick-card">
              <PlayingCard :card="t.card" :width="52" />
              <span class="tc-name">{{ game.players[t.seat]?.name }}</span>
            </div>
          </div>
          <p v-if="game.phase === 'trick_end'" class="trick-won">
            {{ game.players[game.lastTrickWinnerSeat!]?.name }} takes it
          </p>
        </div>

        <template v-if="game.phase === 'playing'">
          <div class="seat-strip">
            <span class="ss-name" :style="{ color: seated.color }">{{ seated.name }}</span>
            <span class="ss-note">{{ seatedIsBot ? 'is thinking…' : `${legalCount} playable` }}</span>
          </div>
          <div v-if="seatedIsBot" class="bot-thinking">
            <div class="hand-row">
              <PlayingCard
                v-for="i in (game.hands[game.turnIndex]?.length ?? 0)"
                :key="i"
                :card="{ kind: 'joker', joker: 'big' }"
                :width="cardWidth"
                faceDown
              />
            </div>
          </div>
          <div v-else class="hand-row">
            <PlayingCard
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
        <p v-if="game.phase === 'game_over'" class="ho-winner">
          {{ teamNames(game.winnerTeam!) }} win {{ game.scores[game.winnerTeam!] }}–{{ game.scores[game.winnerTeam! === 0 ? 1 : 0] }}
        </p>
        <p class="ho-summary">{{ game.lastHandSummary }}</p>
      </div>
    </div>

    <footer v-if="showFooter" class="sp-footer">
      <button v-if="game.phase === 'trick_end'" v-ripple class="btn btn-spray btn-lg wide" @click="spades.nextTrick()">
        {{ tricksPlayed >= HAND_SIZE ? 'Score the hand →' : 'Next trick →' }}
      </button>
      <button v-else-if="game.phase === 'hand_over'" v-ripple class="btn btn-spray btn-lg wide" @click="spades.nextHand()">
        Deal hand {{ game.handNumber + 1 }} →
      </button>
      <button v-else-if="game.phase === 'game_over'" v-ripple class="btn btn-spray btn-lg wide" @click="finish">
        Done
      </button>
    </footer>

    <div v-if="showRules" class="overlay" @click.self="showRules = false">
      <div class="rules-card glass-panel">
        <h2 class="rules-title display">SPADES — HOUSE RULES</h2>
        <ul class="rules-list"><li v-for="(r, i) in RULES" :key="i">{{ r }}</li></ul>
        <div class="joker-row">
          <PlayingCard :card="{ kind: 'joker', joker: 'big' }" :width="52" />
          <PlayingCard :card="{ kind: 'joker', joker: 'little' }" :width="52" />
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
import PlayingCard from '../components/PlayingCard.vue'
import { useSpadesStore, teamOf } from '../stores/spades'
import { usePlayersStore } from '../stores/players'
import { HAND_SIZE, RULES, WINNING_SCORE, cardId, sortHand, type Card } from '../lib/spades'
import { recordGameResult } from '../api/gameResults'
import { playTurnResultSound, playStartChime, unlockAudio } from '../composables/useSounds'
import { goBack } from '../router/goBack'

const router = useRouter()
const spades = useSpadesStore()
const playersStore = usePlayersStore()
const game = computed(() => spades.game)
const showRules = ref(false)

const seated = computed(() => game.value!.players[game.value!.turnIndex]!)
const needsBid = computed(() => game.value?.bids.some(b => b === null) ?? false)
const sortedHand = computed(() => sortHand(game.value?.hands[game.value.turnIndex] ?? []))
const legalCount = computed(() => spades.legalForCurrent().length)
const tricksPlayed = computed(() => game.value?.tricksWon.reduce((a, b) => a + b, 0) ?? 0)
const showFooter = computed(() =>
  ['trick_end', 'hand_over', 'game_over'].includes(game.value?.phase ?? '')
)

// Thirteen cards have to fit a phone. The row scrolls, but starting narrow means most
// hands are visible without scrolling at all.
const cardWidth = computed(() => (sortedHand.value.length > 9 ? 50 : 62))

function isPhoto(url: string | null) { return !!url && (url.startsWith('data:') || url.startsWith('http')) }
function teamNames(t: 0 | 1) {
  const g = game.value
  if (!g) return ''
  return [0, 1, 2, 3].filter(s => teamOf(s) === t).map(s => g.players[s]?.name).join(' & ')
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
    const winningSeats = [0, 1, 2, 3].filter(s => teamOf(s) === g.winnerTeam)
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
        teams: [
          { players: [g.players[0]!.id, g.players[2]!.id], score: g.scores[0], bags: g.bags[0] },
          { players: [g.players[1]!.id, g.players[3]!.id], score: g.scores[1], bags: g.bags[1] },
        ],
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
  border-bottom: 1px solid rgba(255,255,255,0.08); background: rgba(0,0,0,0.6);
  backdrop-filter: blur(20px); -webkit-backdrop-filter: blur(20px); flex-shrink: 0;
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
  padding: 8px; border-radius: 10px; background: rgba(255,255,255,0.04); border-left: 4px solid;
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

.bids-row { display: flex; flex-wrap: wrap; gap: 6px; }
.bid-chip {
  flex: 1 1 auto; min-width: 72px; display: flex; flex-direction: column; align-items: center;
  padding: 6px 8px; border-radius: 8px; background: rgba(255,255,255,0.04);
  border: 2px solid transparent;
}
.bid-chip.turn { border-color: var(--gold); background: rgba(255,255,255,0.09); }
.bc-name { font-size: 10px; color: var(--text-muted); overflow-wrap: anywhere; }
.bc-val { font-size: 15px; font-weight: 800; }

.trick-area { display: flex; flex-direction: column; align-items: center; gap: 8px; min-height: 108px; justify-content: center; }
.trick-cards { display: flex; gap: 8px; flex-wrap: wrap; justify-content: center; }
.trick-card { display: flex; flex-direction: column; align-items: center; gap: 4px; }
.tc-name { font-size: 10px; color: var(--text-muted); overflow-wrap: anywhere; max-width: 56px; text-align: center; }
.trick-hint { font-size: 13px; color: var(--text-muted); margin: 0; text-align: center; }
.trick-won { font-size: 14px; font-weight: 800; color: var(--gold); margin: 0; }

.hand-over { flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 12px; text-align: center; }
.ho-title { font-size: 28px; margin: 0; color: var(--gold); }
.ho-winner { font-size: 17px; font-weight: 800; margin: 0; }
.ho-summary { font-size: 13px; color: var(--text-muted); margin: 0; line-height: 1.6; max-width: 420px; }

.sp-footer {
  flex-shrink: 0; display: flex; gap: 10px; padding: 12px 14px;
  padding-bottom: calc(12px + env(safe-area-inset-bottom));
  border-top: 1px solid rgba(255,255,255,0.08); background: rgba(0,0,0,0.6);
  backdrop-filter: blur(20px); -webkit-backdrop-filter: blur(20px);
}
.wide { width: 100%; min-height: 56px; }

.overlay {
  position: fixed; inset: 0; z-index: 50; display: flex; align-items: center;
  justify-content: center; padding: 24px; background: rgba(0,0,0,0.82);
  backdrop-filter: blur(6px); -webkit-backdrop-filter: blur(6px);
}
.rules-card {
  width: 100%; max-width: 420px; max-height: 82dvh; overflow-y: auto;
  display: flex; flex-direction: column; align-items: center; gap: 12px;
  padding: 26px 22px; border-radius: 16px; text-align: center;
}
.rules-title { font-size: 19px; margin: 0; color: var(--gold); }
.rules-list {
  margin: 0; padding-left: 18px; display: flex; flex-direction: column; gap: 8px;
  color: var(--text); font-size: 13.5px; line-height: 1.5; text-align: left;
}
.joker-row { display: flex; gap: 10px; }
.empty-state {
  height: 100dvh; display: flex; flex-direction: column; align-items: center;
  justify-content: center; gap: 16px; color: var(--text-muted);
}
</style>
