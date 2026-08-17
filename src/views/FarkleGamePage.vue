<template>
  <div v-if="game" class="game-page">
    <div class="drip-bar" />

    <header class="gp-header">
      <button v-ripple class="btn btn-outline btn-sm" @click="quit">← Quit</button>
      <div class="gp-title-wrap">
        <h1 class="gp-title display">FARKLE</h1>
        <span class="gp-target">to {{ game.target.toLocaleString() }}</span>
      </div>
      <button v-ripple class="btn btn-outline btn-sm" @click="showRules = true">Rules</button>
    </header>

    <div class="gp-body">
      <!-- Scoreboard -->
      <div class="scoreboard">
        <div
          v-for="(p, i) in game.players"
          :key="p.id"
          class="score-chip"
          :class="{ active: i === game.currentPlayerIndex }"
          :style="{ borderColor: i === game.currentPlayerIndex ? p.color : 'transparent' }"
        >
          <span class="sc-name">{{ p.name }}</span>
          <span class="sc-score display" :style="{ color: p.color }">{{ p.score.toLocaleString() }}</span>
        </div>
      </div>

      <div class="turn-banner" :style="{ borderColor: currentPlayer.color }">
        <span class="tb-name" :style="{ color: currentPlayer.color }">{{ currentPlayer.name }}</span>
        <span class="tb-turn">turn total <strong>{{ game.turnScore.toLocaleString() }}</strong></span>
      </div>

      <!-- Dice -->
      <div class="dice-area">
        <p v-if="game.dice.length === 0 && game.phase === 'idle'" class="dice-hint">
          {{ game.turnScore > 0 ? 'Hot dice — roll all six again' : 'Roll to start your turn' }}
        </p>
        <div v-else class="dice-row" :class="{ few: game.dice.length <= 4 }">
          <DiceFace
            v-for="(d, i) in game.dice"
            :key="i"
            :face="d"
            :roll="rollNonce"
            :selectable="game.phase === 'rolled'"
            :selected="!!game.selected[i]"
            @click="game.phase === 'rolled' && farkle.toggleDie(i)"
          />
        </div>

        <p v-if="game.phase === 'farkled'" class="farkle-msg display">FARKLE!</p>
        <p v-else-if="game.lastAction" class="last-action">{{ game.lastAction }}</p>

        <p v-if="game.phase === 'rolled'" class="selection-msg" :class="{ bad: selectionInvalid }">
          <template v-if="selectionCount === 0">Pick the dice you want to keep</template>
          <template v-else-if="selectionInvalid">That selection includes a die that scores nothing</template>
          <template v-else>Selection worth <strong>{{ selectionValue!.toLocaleString() }}</strong></template>
        </p>
      </div>
    </div>

    <!-- Actions -->
    <footer class="gp-footer">
      <template v-if="game.phase === 'farkled'">
        <button v-ripple class="btn btn-spray btn-lg wide" @click="farkle.endTurn()">
          Pass the dice →
        </button>
      </template>
      <template v-else-if="game.phase === 'rolled'">
        <button
          v-ripple
          class="btn btn-surface btn-lg"
          :disabled="selectionInvalid || selectionCount === 0"
          @click="farkle.setAside()"
        >Keep {{ selectionValue !== null ? selectionValue.toLocaleString() : '' }}</button>
        <button
          v-ripple
          class="btn btn-outline btn-lg"
          :disabled="game.turnScore === 0"
          @click="bank"
        >Bank {{ game.turnScore.toLocaleString() }}</button>
      </template>
      <template v-else>
        <button v-ripple class="btn btn-spray btn-lg" @click="rollWithSound">
          Roll {{ game.dice.length === 0 ? 6 : game.dice.length }}
        </button>
        <button
          v-ripple
          class="btn btn-outline btn-lg"
          :disabled="game.turnScore === 0"
          @click="bank"
        >Bank {{ game.turnScore.toLocaleString() }}</button>
      </template>
    </footer>

    <!-- Win overlay -->
    <div v-if="game.phase === 'game_over'" class="overlay">
      <div class="win-card glass-panel">
        <span class="win-label">WINNER</span>
        <h2 class="win-name display" :style="{ color: winner?.color }">{{ winner?.name }}</h2>
        <p class="win-score display">{{ winner?.score.toLocaleString() }}</p>
        <button v-ripple class="btn btn-spray btn-lg wide" @click="finish">Done</button>
      </div>
    </div>

    <!-- Rules -->
    <div v-if="showRules" class="overlay" @click.self="showRules = false">
      <div class="rules-card glass-panel">
        <h2 class="rules-title display">FARKLE</h2>
        <ul class="rules-list">
          <li v-for="(r, i) in RULES" :key="i">{{ r }}</li>
        </ul>
        <button v-ripple class="btn btn-spray wide" @click="showRules = false">Got it</button>
      </div>
    </div>
  </div>

  <div v-else class="empty-state">
    <p>No game in progress.</p>
    <button v-ripple class="btn btn-spray btn-lg" @click="router.replace('/dice/farkle/setup')">Set one up</button>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import DiceFace from '../components/DiceFace.vue'
import { useFarkleStore } from '../stores/farkle'
import { usePlayersStore } from '../stores/players'
import { RULES } from '../lib/farkle'
import { recordGameResult } from '../api/gameResults'
import { playTurnResultSound, playStartChime, unlockAudio } from '../composables/useSounds'
import { goBack } from '../router/goBack'

const router = useRouter()
const farkle = useFarkleStore()
const playersStore = usePlayersStore()
const game = computed(() => farkle.game)
const showRules = ref(false)

const currentPlayer = computed(() => game.value!.players[game.value!.currentPlayerIndex]!)
const winner = computed(() => game.value?.players.find(p => p.id === game.value?.winnerId))

const selectionCount = computed(() => game.value?.selected.filter(Boolean).length ?? 0)
const selectionValue = computed(() => farkle.selectionValue())
const selectionInvalid = computed(() => selectionCount.value > 0 && selectionValue.value === null)

/** Bumped on every roll so a die that lands on the number it was already showing still tumbles. */
const rollNonce = ref(0)

function rollWithSound() {
  unlockAudio()
  rollNonce.value++
  farkle.rollDice()
  // The store has already resolved the roll, so this reports what actually happened
  // rather than guessing ahead of it.
  playTurnResultSound(game.value?.phase === 'farkled')
}

function bank() {
  unlockAudio()
  const won = farkle.bank()
  if (won) playStartChime()
  else playTurnResultSound(false)
}

function finish() {
  const g = game.value
  if (g && g.winnerId) {
    // Local counters first, matching LRC. Guests have no player record so updatePlayer
    // skips them, but they still belong in the durable result below.
    g.players.forEach(p => {
      const stored = playersStore.players.find(sp => sp.id === p.id)
      if (!stored) return
      playersStore.updatePlayer(p.id, {
        wins: stored.wins + (p.id === g.winnerId ? 1 : 0),
        gamesPlayed: stored.gamesPlayed + 1,
      })
    })
    // Fire-and-forget: never blocks the UI and never throws.
    void recordGameResult({
      clientGameId: g.id,
      gameType: 'farkle',
      winnerId: g.winnerId,
      playerIds: g.players.map(p => p.id),
      startedAt: g.startedAt ?? null,
      finishedAt: new Date().toISOString(),
      finalScores: Object.fromEntries(g.players.map(p => [p.id, { score: p.score }])),
    })
  }
  farkle.endGame()
  router.replace('/')
}

function quit() {
  farkle.endGame()
  goBack(router, '/')
}
</script>

<style scoped>
.game-page { display: flex; flex-direction: column; width: 100vw; height: 100dvh; overflow: hidden; background: #0a0a0a; }
.gp-header {
  display: flex; align-items: center; justify-content: space-between; gap: 8px;
  padding: 12px 14px; padding-top: calc(12px + env(safe-area-inset-top));
  border-bottom: 2px solid rgba(255,255,255,0.08); background: rgba(0,0,0,0.6); flex-shrink: 0;
}
.gp-title-wrap { display: flex; flex-direction: column; align-items: center; }
.gp-title {
  font-size: 22px; letter-spacing: 0.12em; margin: 0;
  background: linear-gradient(135deg, var(--gold), var(--orange));
  -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text;
}
.gp-target { font-size: 10px; color: var(--text-muted); letter-spacing: 0.1em; }

.gp-body {
  flex: 1; min-height: 0; overflow-y: auto; -webkit-overflow-scrolling: touch;
  overscroll-behavior: contain; padding: 14px; display: flex; flex-direction: column; gap: 14px;
}

.scoreboard { display: flex; flex-wrap: wrap; gap: 8px; }
.score-chip {
  flex: 1 1 auto; min-width: 92px; display: flex; flex-direction: column; align-items: center;
  gap: 2px; padding: 8px 10px;  border: 2px solid transparent;
  background: #16161c;
}
.score-chip.active { background: #202027; }
.sc-name { font-size: 11px; font-weight: 600; color: var(--text-muted); overflow-wrap: anywhere; }
.sc-score { font-size: 20px; }

.turn-banner {
  display: flex; align-items: baseline; justify-content: space-between; gap: 10px;
  padding: 10px 14px;  border-left: 4px solid;
  background: #17171d;
}
.tb-name { font-size: 16px; font-weight: 800; overflow-wrap: anywhere; }
.tb-turn { font-size: 13px; color: var(--text-muted); }
.tb-turn strong { color: var(--gold); font-size: 17px; }

.dice-area { display: flex; flex-direction: column; align-items: center; gap: 12px; padding: 8px 0; }
/* Six dice have to fit a narrow phone without wrapping into an unreadable pile; four or
   fewer can afford to be bigger. Sized from CSS so the iPad block below can simply grow it. */
.dice-row { display: flex; flex-wrap: wrap; gap: 10px; justify-content: center; --die-size: 46px; }
.dice-row.few { --die-size: 58px; }
.dice-hint { color: var(--text-muted); font-size: 14px; text-align: center; margin: 20px 0; }
.farkle-msg { font-size: 34px; color: var(--pink); letter-spacing: 0.08em; margin: 4px 0; }
.last-action { font-size: 14px; color: var(--gold); font-weight: 700; margin: 0; }
.selection-msg { font-size: 13px; color: var(--text-muted); margin: 0; text-align: center; }
.selection-msg strong { color: var(--gold); font-size: 15px; }
.selection-msg.bad { color: var(--pink); }

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
.win-score { font-size: 44px; color: var(--gold); margin: 0; }
.rules-title { font-size: 24px; margin: 0; color: var(--gold); }
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
  .tb-turn { font-size: 17px; }
  .tb-turn strong { font-size: 26px; }
  .dice-area { gap: 18px; padding: 16px 0; }
  .dice-row { gap: 20px; --die-size: 86px; }
  .dice-row.few { --die-size: 104px; }
  .dice-hint { font-size: 18px; margin: 28px 0; }
  .farkle-msg { font-size: 50px; }
  .last-action { font-size: 19px; }
  .selection-msg { font-size: 17px; }
  .selection-msg strong { font-size: 21px; }
  .win-score { font-size: 62px; }
  .rules-title { font-size: 32px; }
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
