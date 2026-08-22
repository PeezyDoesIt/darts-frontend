<template>
  <div v-if="game" class="game-page">
    <div class="drip-bar" />

    <header class="gp-header">
      <button v-ripple class="btn btn-outline btn-sm" @click="quit">← Quit</button>
      <div class="gp-title-wrap">
        <h1 class="gp-title display">THREE MAN</h1>
        <span class="gp-target">{{ game.rounds }} {{ game.rounds === 1 ? 'round' : 'rounds' }}</span>
      </div>
      <button v-ripple class="btn btn-outline btn-sm" @click="showRules = true">Rules</button>
    </header>

    <div class="gp-body">
      <div class="scoreboard">
        <div
          v-for="(p, i) in game.players"
          :key="p.id"
          class="score-chip"
          :class="{ active: i === game.currentPlayerIndex, threeman: p.id === game.threeManId }"
          :style="{ borderColor: i === game.currentPlayerIndex ? p.color : 'transparent' }"
        >
          <span v-if="p.id === game.threeManId" class="sc-badge">3</span>
          <span class="sc-name">{{ p.name }}</span>
          <span class="sc-score display" :style="{ color: p.color }">{{ p.sips }}</span>
        </div>
      </div>

      <div class="turn-banner" :style="{ borderColor: currentPlayer.color }">
        <span class="tb-name" :style="{ color: currentPlayer.color }">{{ currentPlayer.name }}</span>
        <span class="tb-turn">
          <template v-if="game.phase === 'seeking'">roll a 3 to start</template>
          <template v-else-if="game.phase === 'assigning'">
            hand out <strong>{{ game.pendingAssignment }}</strong>
          </template>
          <template v-else>{{ unitLabel }} so far <strong>{{ currentPlayer.sips }}</strong></template>
        </span>
      </div>

      <div class="dice-area">
        <div class="dice-row">
          <template v-if="dice">
            <DiceFace :face="dice[0]" :roll="rollNonce" />
            <DiceFace :face="dice[1]" :roll="rollNonce" />
          </template>
          <template v-else>
            <div class="die-placeholder">🎲</div>
            <div class="die-placeholder">🎲</div>
          </template>
        </div>

        <p v-if="diceTotal !== null" class="roll-total display">{{ diceTotal }}</p>

        <!--
          The outcome list is the point of the screen. Three Man is normally played by whoever
          shouts the rule fastest, and the argument that follows is the game's one bad habit —
          so every line says who takes what and why, and stays up until the dice are passed.
        -->
        <ul v-if="scoredOutcomes.length" class="outcomes">
          <li v-for="(o, i) in scoredOutcomes" :key="i" class="outcome">
            <span class="oc-who" :style="{ color: colorOf(o.playerId) }">{{ nameOf(o.playerId) }}</span>
            <span class="oc-amt">{{ o.amount }}</span>
            <span class="oc-why">{{ o.reason }}</span>
          </li>
        </ul>

        <p v-for="(n, i) in noteOutcomes" :key="`n${i}`" class="note-msg display">{{ n.reason }}</p>

        <p v-if="game.phase === 'seeking'" class="risk-hint">
          Nobody is the Three Man yet. First 3 takes the job.
        </p>
      </div>

      <!--
        Doubles are handed out one at a time rather than in a lump, because splitting them up
        is how the roll actually gets played at a table.
      -->
      <div v-if="game.phase === 'assigning'" class="assign-panel">
        <p class="assign-title">
          {{ currentPlayer.name }} hands out {{ game.pendingAssignment }}
        </p>
        <div class="assign-grid">
          <button
            v-for="p in game.players"
            :key="p.id"
            v-ripple
            class="assign-btn"
            :style="{ borderColor: p.color }"
            @click="threeMan.assignTo(p.id)"
          >
            <span class="ab-name">{{ p.name }}</span>
            <span class="ab-count display" :style="{ color: p.color }">{{ p.sips }}</span>
          </button>
        </div>
      </div>
    </div>

    <footer class="gp-footer">
      <template v-if="game.phase === 'assigning'">
        <p class="footer-hint">Pick who takes them.</p>
      </template>
      <template v-else>
        <button v-ripple class="btn btn-spray btn-lg" :disabled="!canRoll" @click="rollWithSound">
          {{ canRoll ? 'Roll' : 'Rolled' }}
        </button>
        <button v-ripple class="btn btn-outline btn-lg" :disabled="!dice" @click="threeMan.pass()">
          Pass →
        </button>
      </template>
    </footer>

    <div v-if="game.phase === 'over'" class="overlay">
      <div class="win-card glass-panel">
        <span class="win-label">{{ unitLabel.toUpperCase() }} — {{ game.rounds }} ROUNDS</span>
        <ul class="tally">
          <li v-for="p in tally" :key="p.id" class="tally-row">
            <span class="ty-name" :style="{ color: p.color }">{{ p.name }}</span>
            <span class="ty-count display">{{ p.sips }}</span>
          </li>
        </ul>
        <button v-ripple class="btn btn-spray btn-lg wide" @click="finish">Done</button>
      </div>
    </div>

    <div v-if="showRules" class="overlay" @click.self="showRules = false">
      <div class="rules-card glass-panel">
        <h2 class="rules-title display">THREE MAN</h2>
        <ul class="rules-list"><li v-for="(r, i) in THREE_MAN_RULES" :key="i">{{ r }}</li></ul>
        <p class="house-note">
          This table: 7 goes {{ game.house.sevenGoes }}, 11 the other way.
          <template v-if="game.house.nineIsSocial"> 9 is a social.</template>
          <template v-if="game.house.doublesRollAgain"> Doubles roll again.</template>
        </p>
        <button v-ripple class="btn btn-spray wide" @click="showRules = false">Got it</button>
      </div>
    </div>
  </div>

  <div v-else class="empty-state">
    <p>No game in progress.</p>
    <button v-ripple class="btn btn-spray btn-lg" @click="router.replace('/dice/threeman/setup')">
      Set one up
    </button>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import DiceFace from '../components/DiceFace.vue'
import { useThreeManStore, THREE_MAN_RULES } from '../stores/threeMan'
import { playTurnResultSound, unlockAudio } from '../composables/useSounds'
import { goBack } from '../router/goBack'

const router = useRouter()
const threeMan = useThreeManStore()
const game = computed(() => threeMan.game)
const showRules = ref(false)

const currentPlayer = computed(() => game.value!.players[game.value!.currentPlayerIndex]!)

/*
 * Pulled out rather than read as `game.dice[0]` in the template. A v-if on a nested property
 * does not narrow it for vue-tsc the way it reads to a person, and this file has three places
 * that would each have to be trusted to narrow — a computed is checked once, here.
 */
const dice = computed(() => game.value?.dice ?? null)
/*
 * Read from the store rather than recomputed here. A second copy of "may I roll?" in the
 * template is how a button ends up offering a throw the store then refuses — the disabled
 * state and the guard have to be the same rule, not two rules that agree today.
 */
const canRoll = computed(() => threeMan.canRoll())
const diceTotal = computed(() => (dice.value ? dice.value[0] + dice.value[1] : null))
const unitLabel = computed(() => (game.value?.unit === 'points' ? 'points' : 'sips'))

/** Lines that move a tally, and lines that only announce something, read differently. */
const scoredOutcomes = computed(() => game.value?.outcomes.filter(o => o.playerId && o.amount > 0) ?? [])
const noteOutcomes = computed(() => game.value?.outcomes.filter(o => !o.playerId) ?? [])

const tally = computed(() => [...(game.value?.players ?? [])].sort((a, b) => b.sips - a.sips))

function nameOf(id: string | null) { return game.value?.players.find(p => p.id === id)?.name ?? '' }
function colorOf(id: string | null) { return game.value?.players.find(p => p.id === id)?.color ?? '#fff' }

/** Bumped on every roll so a die landing on the number it already showed still tumbles. */
const rollNonce = ref(0)

function rollWithSound() {
  unlockAudio()
  rollNonce.value++
  threeMan.rollDice()
  // Anything landing on the roller is the closest this game has to a bad result.
  const onMe = game.value?.outcomes.some(o => o.playerId === currentPlayer.value.id) ?? false
  playTurnResultSound(onMe)
}

/*
 * No history record. `recordGameResult` is built around a winner, and this game does not have
 * one — writing a row with a fabricated winner would put nonsense in the leaderboard rather
 * than leave a gap in it. The tally on the end card is the result.
 */
function finish() { threeMan.clearGame(); router.replace('/') }

function quit() { threeMan.endGame(); goBack(router, '/') }
</script>

<style scoped>
.game-page { display: flex; flex-direction: column; width: 100vw; height: 100dvh; overflow: hidden; background: #0a0a0a; }
.gp-header {
  display: flex; align-items: center; justify-content: space-between; gap: 8px;
  padding: 12px 14px; padding-top: calc(12px + env(safe-area-inset-top));
  border-bottom: 1px solid rgba(255,255,255,0.08); background: rgba(0,0,0,0.6);
  backdrop-filter: blur(20px); -webkit-backdrop-filter: blur(20px); flex-shrink: 0;
}
.gp-title-wrap { display: flex; flex-direction: column; align-items: center; min-width: 0; }
.gp-title {
  font-size: 22px; letter-spacing: 0.12em; margin: 0; white-space: nowrap;
  background: linear-gradient(135deg, var(--lime), var(--blue));
  -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text;
}
.gp-target { font-size: 10px; color: var(--text-muted); letter-spacing: 0.1em; }

.gp-body {
  flex: 1; min-height: 0; overflow-y: auto; -webkit-overflow-scrolling: touch;
  overscroll-behavior: contain; padding: 14px; display: flex; flex-direction: column; gap: 14px;
}
.scoreboard { display: flex; flex-wrap: wrap; gap: 8px; }
.score-chip {
  position: relative; flex: 1 1 auto; min-width: 92px; display: flex; flex-direction: column;
  align-items: center; gap: 2px; padding: 8px 10px; border-radius: 10px;
  border: 2px solid transparent; background: rgba(255,255,255,0.04);
}
.score-chip.active { background: rgba(255,255,255,0.09); }
/* The Three Man is the one fact the table forgets, so it is marked on the chip itself. */
.score-chip.threeman { box-shadow: inset 0 0 0 1px var(--gold); }
.sc-badge {
  position: absolute; top: -8px; left: 50%; transform: translateX(-50%);
  width: 20px; height: 20px; border-radius: 50%; background: var(--gold); color: #101014;
  font-size: 12px; font-weight: 900; display: flex; align-items: center; justify-content: center;
}
.sc-name { font-size: 11px; font-weight: 600; color: var(--text-muted); overflow-wrap: anywhere; }
.sc-score { font-size: 20px; }

.turn-banner {
  display: flex; align-items: baseline; justify-content: space-between; gap: 10px;
  padding: 10px 14px; border-radius: 10px; border-left: 4px solid; background: rgba(255,255,255,0.05);
}
.tb-name { font-size: 16px; font-weight: 800; overflow-wrap: anywhere; }
.tb-turn { font-size: 13px; color: var(--text-muted); text-align: right; }
.tb-turn strong { color: var(--gold); font-size: 17px; }

.dice-area { --die-size: 84px; display: flex; flex-direction: column; align-items: center; gap: 12px; padding: 12px 0; }
@media (min-width: 768px) { .dice-area { --die-size: 130px; } }
.dice-row { display: flex; gap: 20px; align-items: center; }
.die-placeholder { font-size: 66px; opacity: 0.25; line-height: 1; }
.roll-total { font-size: 30px; color: var(--gold); margin: 0; letter-spacing: 0.06em; }

.outcomes { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 6px; width: 100%; max-width: 420px; }
.outcome {
  display: grid; grid-template-columns: 1fr auto auto; align-items: baseline; gap: 10px;
  padding: 8px 12px; border-radius: 8px; background: rgba(255,255,255,0.05);
}
.oc-who { font-size: 15px; font-weight: 800; overflow-wrap: anywhere; }
.oc-amt { font-size: 19px; font-weight: 900; color: var(--gold); }
.oc-why { font-size: 11px; color: var(--text-muted); letter-spacing: 0.04em; }
.note-msg { font-size: 19px; color: var(--lime); margin: 0; text-align: center; }
.risk-hint { font-size: 13px; color: var(--text-muted); margin: 0; text-align: center; }

.assign-panel { display: flex; flex-direction: column; gap: 10px; }
.assign-title { font-size: 13px; color: var(--text-muted); margin: 0; text-align: center; }
.assign-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(110px, 1fr)); gap: 8px; }
.assign-btn {
  display: flex; flex-direction: column; align-items: center; gap: 2px; padding: 12px 8px;
  min-height: 62px; border: 2px solid; border-radius: 10px; background: rgba(255,255,255,0.05);
  color: var(--text); font-family: inherit; cursor: pointer; position: relative; overflow: hidden;
  -webkit-tap-highlight-color: transparent;
}
.ab-name { font-size: 12px; font-weight: 700; overflow-wrap: anywhere; }
.ab-count { font-size: 18px; }

.gp-footer {
  flex-shrink: 0; display: flex; gap: 10px; padding: 12px 14px;
  padding-bottom: calc(12px + env(safe-area-inset-bottom));
  border-top: 1px solid rgba(255,255,255,0.08); background: rgba(0,0,0,0.6);
  backdrop-filter: blur(20px); -webkit-backdrop-filter: blur(20px);
}
.gp-footer .btn { flex: 1; min-height: 56px; }
.gp-footer .btn:disabled { opacity: 0.4; }
.footer-hint { flex: 1; margin: 0; text-align: center; align-self: center; font-size: 14px; color: var(--text-muted); }
.wide { width: 100%; }

.overlay {
  position: fixed; inset: 0; z-index: 50; display: flex; align-items: center;
  justify-content: center; padding: 24px; background: rgba(0,0,0,0.82);
  backdrop-filter: blur(6px); -webkit-backdrop-filter: blur(6px);
}
.win-card, .rules-card {
  width: 100%; max-width: 420px; max-height: 82dvh; overflow-y: auto;
  display: flex; flex-direction: column; align-items: center; gap: 12px;
  padding: 26px 22px; border-radius: 16px; text-align: center;
}
.win-label { font-size: 11px; letter-spacing: 0.2em; color: var(--text-muted); }
.tally { list-style: none; margin: 0; padding: 0; width: 100%; display: flex; flex-direction: column; gap: 6px; }
.tally-row { display: flex; align-items: baseline; justify-content: space-between; gap: 12px; padding: 8px 12px; border-radius: 8px; background: rgba(255,255,255,0.05); }
.ty-name { font-size: 16px; font-weight: 800; overflow-wrap: anywhere; }
.ty-count { font-size: 22px; color: var(--gold); }
.rules-title { font-size: 24px; margin: 0; color: var(--gold); }
.rules-list {
  margin: 0; padding-left: 18px; display: flex; flex-direction: column; gap: 8px;
  color: var(--text); font-size: 13.5px; line-height: 1.5; text-align: left;
}
.house-note { font-size: 12px; color: var(--text-muted); margin: 0; line-height: 1.5; }
.empty-state {
  height: 100dvh; display: flex; flex-direction: column; align-items: center;
  justify-content: center; gap: 16px; color: var(--text-muted);
}
</style>
