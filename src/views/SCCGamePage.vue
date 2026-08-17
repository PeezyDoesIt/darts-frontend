<template>
  <div v-if="game" class="game-page">
    <div class="drip-bar" />

    <header class="gp-header">
      <button v-ripple class="btn btn-outline btn-sm" @click="quit">← Quit</button>
      <div class="gp-title-wrap">
        <h1 class="gp-title display">SHIP CAPTAIN CREW</h1>
        <span class="gp-target">round {{ game.round }} · first to {{ game.target }}</span>
      </div>
      <button v-ripple class="btn btn-outline btn-sm" @click="showRules = true">Rules</button>
    </header>

    <div class="gp-body">
      <div class="scoreboard">
        <div
          v-for="(p, i) in game.players"
          :key="p.id"
          class="score-chip"
          :class="{ active: i === game.currentPlayerIndex && game.phase !== 'round_over' }"
          :style="{ borderColor: i === game.currentPlayerIndex ? p.color : 'transparent' }"
        >
          <span class="sc-name">{{ p.name }}</span>
          <span class="sc-score display" :style="{ color: p.color }">{{ p.roundWins }}</span>
          <span class="sc-cargo">{{ p.cargo === null ? '—' : `${p.cargo} cargo` }}</span>
        </div>
      </div>

      <template v-if="game.phase !== 'round_over'">
        <div class="turn-banner" :style="{ borderColor: currentPlayer.color }">
          <span class="tb-name" :style="{ color: currentPlayer.color }">{{ currentPlayer.name }}</span>
          <span class="tb-rolls">roll {{ Math.min(game.rollsUsed + 1, 3) }} of 3</span>
        </div>

        <!-- Ship / Captain / Crew progress -->
        <div class="claim-track">
          <div v-for="(c, i) in CLAIMS" :key="c.face" class="claim" :class="{ got: game.stage > i }">
            <DiceFace :face="c.face" :held="game.stage > i" />
            <span class="claim-label">{{ c.label }}</span>
          </div>
        </div>

        <div class="dice-area">
          <p v-if="game.rollsUsed === 0" class="dice-hint">
            Roll for your ship — you need a 6 before anything else counts.
          </p>
          <div v-else class="dice-row">
            <DiceFace v-for="(d, i) in game.dice" :key="i" :face="d" :roll="rollNonce" />
          </div>

          <p v-if="game.lastAction" class="last-action">{{ game.lastAction }}</p>

          <p v-if="needLabel(game.stage)" class="need-msg">
            Still need <strong>{{ needLabel(game.stage) }}</strong>
          </p>
          <p v-else class="cargo-msg">
            Cargo <strong>{{ cargo }}</strong>
          </p>
        </div>
      </template>

      <!-- Round summary -->
      <div v-else class="round-summary">
        <h2 class="rs-title display">ROUND {{ game.round }}</h2>
        <p class="rs-line">{{ game.lastAction }}</p>
        <div class="rs-list">
          <div
            v-for="p in [...game.players].sort((a, b) => (b.cargo ?? 0) - (a.cargo ?? 0))"
            :key="p.id"
            class="rs-row"
            :class="{ won: game.roundWinnerIds.includes(p.id) }"
          >
            <span class="rs-name" :style="{ color: p.color }">{{ p.name }}</span>
            <span class="rs-cargo">{{ p.cargo === null || p.cargo === 0 ? 'no crew' : `${p.cargo} cargo` }}</span>
          </div>
        </div>
      </div>
    </div>

    <footer class="gp-footer">
      <template v-if="game.phase === 'round_over'">
        <button v-ripple class="btn btn-spray btn-lg wide" @click="scc.nextRound()">Next round →</button>
      </template>
      <template v-else-if="game.phase === 'turn_done'">
        <button v-ripple class="btn btn-spray btn-lg wide" @click="scc.nextTurn()">
          {{ isLastPlayer ? 'Score the round →' : 'Next player →' }}
        </button>
      </template>
      <template v-else>
        <button v-ripple class="btn btn-spray btn-lg" @click="rollWithSound">
          Roll {{ 5 - game.stage }}
        </button>
        <button
          v-ripple
          class="btn btn-outline btn-lg"
          :disabled="game.phase !== 'rolled'"
          @click="scc.stand()"
        >Stand</button>
      </template>
    </footer>

    <div v-if="game.phase === 'game_over'" class="overlay">
      <div class="win-card glass-panel">
        <span class="win-label">WINNER</span>
        <h2 class="win-name display" :style="{ color: winner?.color }">{{ winner?.name }}</h2>
        <p class="win-score display">{{ winner?.roundWins }} rounds</p>
        <button v-ripple class="btn btn-spray btn-lg wide" @click="finish">Done</button>
      </div>
    </div>

    <div v-if="showRules" class="overlay" @click.self="showRules = false">
      <div class="rules-card glass-panel">
        <h2 class="rules-title display">SHIP CAPTAIN CREW</h2>
        <ul class="rules-list"><li v-for="(r, i) in RULES" :key="i">{{ r }}</li></ul>
        <button v-ripple class="btn btn-spray wide" @click="showRules = false">Got it</button>
      </div>
    </div>
  </div>

  <div v-else class="empty-state">
    <p>No game in progress.</p>
    <button v-ripple class="btn btn-spray btn-lg" @click="router.replace('/dice/scc/setup')">Set one up</button>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import DiceFace from '../components/DiceFace.vue'
import { useSCCStore } from '../stores/shipCaptainCrew'
import { usePlayersStore } from '../stores/players'
import { RULES, cargoScore, needLabel } from '../lib/shipCaptainCrew'
import { recordGameResult } from '../api/gameResults'
import { playTurnResultSound, playStartChime, unlockAudio } from '../composables/useSounds'
import { goBack } from '../router/goBack'

const router = useRouter()
const scc = useSCCStore()
const playersStore = usePlayersStore()
const game = computed(() => scc.game)
const showRules = ref(false)

const CLAIMS = [
  { face: 6, label: 'Ship' },
  { face: 5, label: 'Captain' },
  { face: 4, label: 'Crew' },
]

const currentPlayer = computed(() => game.value!.players[game.value!.currentPlayerIndex]!)
const winner = computed(() => game.value?.players.find(p => p.id === game.value?.winnerId))
const cargo = computed(() => (game.value ? cargoScore(game.value.stage, game.value.dice) : 0))
const isLastPlayer = computed(
  () => !!game.value && game.value.currentPlayerIndex === game.value.players.length - 1
)

/** Bumped on every roll so a die that lands on the number it was already showing still tumbles. */
const rollNonce = ref(0)

function rollWithSound() {
  unlockAudio()
  rollNonce.value++
  const before = game.value?.stage ?? 0
  scc.rollDice()
  // Claiming something is the good outcome; a roll that advances nothing is the bad one.
  playTurnResultSound((game.value?.stage ?? 0) === before)
}

function finish() {
  const g = game.value
  if (g && g.winnerId) {
    g.players.forEach(p => {
      const stored = playersStore.players.find(sp => sp.id === p.id)
      if (!stored) return
      playersStore.updatePlayer(p.id, {
        wins: stored.wins + (p.id === g.winnerId ? 1 : 0),
        gamesPlayed: stored.gamesPlayed + 1,
      })
    })
    void recordGameResult({
      clientGameId: g.id,
      gameType: 'shipCaptainCrew',
      winnerId: g.winnerId,
      playerIds: g.players.map(p => p.id),
      startedAt: g.startedAt ?? null,
      finishedAt: new Date().toISOString(),
      roundCount: g.round,
      finalScores: Object.fromEntries(g.players.map(p => [p.id, { roundWins: p.roundWins }])),
    })
  }
  scc.endGame()
  router.replace('/')
}

function quit() { scc.endGame(); goBack(router, '/') }

// Fanfare when the game is decided. `watch` rather than `watchEffect` so it fires on the
// transition into game_over and not once more on every unrelated re-render.
watch(() => game.value?.phase, phase => { if (phase === 'game_over') playStartChime() })
</script>

<style scoped>
.game-page { display: flex; flex-direction: column; width: 100vw; height: 100dvh; overflow: hidden; background: #0a0a0a; }
.gp-header {
  display: flex; align-items: center; justify-content: space-between; gap: 8px;
  padding: 12px 14px; padding-top: calc(12px + env(safe-area-inset-top));
  border-bottom: 2px solid rgba(255,255,255,0.08); background: rgba(0,0,0,0.6); flex-shrink: 0;
}
.gp-title-wrap { display: flex; flex-direction: column; align-items: center; min-width: 0; }
.gp-title {
  font-size: 17px; letter-spacing: 0.08em; margin: 0; white-space: nowrap;
  background: linear-gradient(135deg, var(--blue), var(--purple));
  -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text;
}
.gp-target { font-size: 10px; color: var(--text-muted); letter-spacing: 0.08em; }

.gp-body {
  flex: 1; min-height: 0; overflow-y: auto; -webkit-overflow-scrolling: touch;
  overscroll-behavior: contain; padding: 14px; display: flex; flex-direction: column; gap: 14px;
}
.scoreboard { display: flex; flex-wrap: wrap; gap: 8px; }
.score-chip {
  flex: 1 1 auto; min-width: 92px; display: flex; flex-direction: column; align-items: center;
  gap: 1px; padding: 8px 10px;  border: 2px solid transparent;
  background: #16161c;
}
.score-chip.active { background: #202027; }
.sc-name { font-size: 11px; font-weight: 600; color: var(--text-muted); overflow-wrap: anywhere; }
.sc-score { font-size: 20px; }
.sc-cargo { font-size: 10px; color: var(--text-muted); }

.turn-banner {
  display: flex; align-items: baseline; justify-content: space-between; gap: 10px;
  padding: 10px 14px;  border-left: 4px solid; background: #17171d;
}
.tb-name { font-size: 16px; font-weight: 800; overflow-wrap: anywhere; }
.tb-rolls { font-size: 13px; color: var(--text-muted); }

.claim-track { display: flex; justify-content: center; gap: 18px; }
.claim { display: flex; flex-direction: column; align-items: center; gap: 5px; opacity: 0.4; --die-size: 38px; }
.claim.got { opacity: 1; }
.claim-label { font-size: 10px; font-weight: 800; letter-spacing: 0.1em; text-transform: uppercase; color: var(--text-muted); }

.dice-area { display: flex; flex-direction: column; align-items: center; gap: 12px; padding: 8px 0; }
.dice-row { display: flex; flex-wrap: wrap; gap: 10px; justify-content: center; min-height: 52px; --die-size: 52px; }
.dice-hint { color: var(--text-muted); font-size: 14px; text-align: center; margin: 16px 0; max-width: 300px; }
.last-action { font-size: 14px; color: var(--gold); font-weight: 700; margin: 0; text-align: center; }
.need-msg, .cargo-msg { font-size: 13px; color: var(--text-muted); margin: 0; }
.need-msg strong, .cargo-msg strong { color: var(--gold); font-size: 16px; }

.round-summary { display: flex; flex-direction: column; align-items: center; gap: 12px; padding: 10px 0; }
.rs-title { font-size: 26px; margin: 0; color: var(--gold); }
.rs-line { font-size: 14px; color: var(--text); text-align: center; margin: 0; }
.rs-list { width: 100%; display: flex; flex-direction: column; gap: 6px; }
.rs-row {
  display: flex; justify-content: space-between; padding: 10px 14px; 
  background: #16161c; font-size: 14px;
}
.rs-row.won { background: #222229; box-shadow: inset 3px 0 0 var(--gold); }
.rs-name { font-weight: 700; overflow-wrap: anywhere; }
.rs-cargo { color: var(--text-muted); }

.gp-footer {
  flex-shrink: 0; display: flex; gap: 10px; padding: 12px 14px;
  padding-bottom: calc(12px + env(safe-area-inset-bottom));
  border-top: 2px solid rgba(255,255,255,0.08); background: rgba(0,0,0,0.6);
}
.gp-footer .btn { flex: 1; min-height: 56px; }
.gp-footer .btn:disabled { opacity: 0.4; }
.wide { width: 100%; }

.overlay {
  position: fixed; inset: 0; z-index: 50; display: flex; align-items: center;
  justify-content: center; padding: 24px; background: rgba(0,0,0,0.82);
  backdrop-filter: blur(6px); -webkit-backdrop-filter: blur(6px);
}
.win-card, .rules-card {
  width: 100%; max-width: 420px; max-height: 82dvh; overflow-y: auto;
  display: flex; flex-direction: column; align-items: center; gap: 12px;
  padding: 26px 22px;  text-align: center;
}
.win-label { font-size: 11px; letter-spacing: 0.2em; color: var(--text-muted); }
.win-name { font-size: 32px; margin: 0; overflow-wrap: anywhere; }
.win-score { font-size: 34px; color: var(--gold); margin: 0; }
.rules-title { font-size: 21px; margin: 0; color: var(--gold); }
.rules-list {
  margin: 0; padding-left: 18px; display: flex; flex-direction: column; gap: 8px;
  color: var(--text); font-size: 13.5px; line-height: 1.5; text-align: left;
}
.empty-state {
  height: 100dvh; display: flex; flex-direction: column; align-items: center;
  justify-content: center; gap: 16px; color: var(--text-muted);
}

/* ── iPad ─────────────────────────────────────────────────────────────
   This screen was built at one size and carried no responsive rules at all.
   Played off a stand a couple of metres away, the 10–13px labels were
   unreadable and a phone-width column ran the full 1194px. From the tablet
   band up everything steps up and the body keeps a centred measure. iPad
   portrait (834) and landscape (1194) both land here; phones are untouched.
   ─────────────────────────────────────────────────────────────────── */
@media (min-width: 768px) {
  .gp-header { padding: 18px 26px; padding-top: calc(18px + env(safe-area-inset-top)); }
  .gp-title { font-size: 32px; }
  .gp-target { font-size: 14px; }
  .gp-body { padding: 28px; gap: 22px; align-items: center; }
  .gp-body > * { width: 100%; max-width: 940px; }
  .scoreboard { gap: 12px; }
  .score-chip { min-width: 128px; padding: 14px 16px; gap: 4px; }
  .sc-name { font-size: 15px; }
  .sc-score { font-size: 30px; }
  .turn-banner { padding: 16px 22px; border-left-width: 6px; }
  .tb-name { font-size: 26px; }
  .gp-footer { padding: 16px 26px; padding-bottom: calc(16px + env(safe-area-inset-bottom)); }
  .gp-footer .btn { min-height: 70px; font-size: 20px; }
  .win-card, .rules-card { max-width: 620px; padding: 34px 30px; gap: 16px; }
  .win-label { font-size: 14px; }
  .win-name { font-size: 44px; }
  .rules-list { font-size: 17px; gap: 11px; }
  .gp-title { font-size: 26px; }
  .gp-target { font-size: 13px; }
  .tb-rolls { font-size: 17px; }
  .sc-cargo { font-size: 14px; }
  .claim-track { gap: 34px; }
  .claim { --die-size: 56px; }
  .claim-label { font-size: 14px; }
  .dice-area { gap: 18px; padding: 16px 0; }
  .dice-row { gap: 20px; min-height: 96px; --die-size: 80px; }
  .dice-hint { font-size: 18px; max-width: 460px; margin: 22px 0; }
  .last-action { font-size: 19px; }
  .need-msg, .cargo-msg { font-size: 17px; }
  .need-msg strong, .cargo-msg strong { font-size: 21px; }
  .round-summary { gap: 16px; }
  .rs-title { font-size: 34px; }
  .rs-line { font-size: 17px; }
  .rs-row { font-size: 18px; padding: 13px 18px; }
  .win-score { font-size: 48px; }
  .rules-title { font-size: 28px; }
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
</style>
