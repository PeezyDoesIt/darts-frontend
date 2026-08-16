<template>
  <div class="page">
    <div class="drip-bar" />
    <div class="page-header">
      <button v-ripple class="btn btn-outline btn-sm header-back" @click="goBack(router, '/')">← Back</button>
      <h2 class="page-title display">BLACKJACK</h2>
      <button
        v-ripple
        class="btn btn-spray btn-lg"
        :disabled="selectedPlayers.length === 0"
        @click="start"
      >
        {{ selectedPlayers.length === 0 ? 'Select players' : 'Deal In' }}
      </button>
    </div>

    <div class="setup-body">
      <section class="ng-section">
        <span class="label">SELECT PLAYERS</span>
        <PlayerPicker
          :roster="playersStore.players"
          :selected-ids="selectedPlayers.map(p => p.id)"
          @pick="togglePlayer"
        />
      </section>

      <section class="ng-section">
        <span class="label">STARTING CHIPS</span>
        <div class="chip-opts">
          <button
            v-for="n in CHIP_OPTIONS" :key="n"
            v-ripple
            class="chip-opt"
            :class="{ active: chips === n }"
            @click="chips = n"
          >{{ n }}</button>
        </div>
        <span class="ng-hint">Everyone starts with the same stack. The game ends when nobody can still bet.</span>
      </section>

      <section class="ng-section">
        <span class="label">HOW IT PLAYS</span>
        <ul class="rules">
          <li v-for="(r, i) in BLACKJACK_RULES" :key="i">{{ r }}</li>
        </ul>
      </section>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import PlayerPicker from '../components/PlayerPicker.vue'
import { usePlayersStore } from '../stores/players'
import { useBlackjackStore, BLACKJACK_RULES, STARTING_CHIPS } from '../stores/blackjack'
import { goBack } from '../router/goBack'
import type { Player } from '../types/index'

const router = useRouter()
const playersStore = usePlayersStore()
const store = useBlackjackStore()

const CHIP_OPTIONS = [50, 100, 250, 500]

const selectedPlayers = ref<Player[]>([])
const chips = ref<number>(STARTING_CHIPS)

function togglePlayer(p: Player) {
  const i = selectedPlayers.value.findIndex(x => x.id === p.id)
  if (i === -1) selectedPlayers.value.push(p)
  else selectedPlayers.value.splice(i, 1)
}

function start() {
  if (!selectedPlayers.value.length) return
  store.startGame(selectedPlayers.value, chips.value)
  router.push('/blackjack')
}
</script>

<style scoped>
.setup-body { display: flex; flex-direction: column; gap: 18px; padding: 0 16px 32px; }

.chip-opts { display: flex; gap: 8px; flex-wrap: wrap; }
.chip-opt {
  min-width: 68px; min-height: 48px;  cursor: pointer;
  background: rgba(255,255,255,0.05); border: 2px solid rgba(255,255,255,0.14);
  color: var(--text); font-family: var(--font-display); font-size: 18px; font-weight: 900;
}
.chip-opt.active { border-color: var(--gold); background: rgba(255,200,87,0.18); }

.rules { margin: 0; padding-left: 18px; display: flex; flex-direction: column; gap: 4px; }
.rules li { font-size: 13px; color: var(--text-muted); line-height: 1.45; }

.ng-hint { font-size: 12px; color: var(--text-muted); line-height: 1.4; }

/* ── iPad ─────────────────────────────────────────────────────────────
   No responsive rules at all before this: the rules list sat at 13px and the
   hint at 12px, both under the readable floor on a stand, and the form ran
   the full width of the screen.
   ─────────────────────────────────────────────────────────────────── */
@media (min-width: 768px) {
  .setup-body { width: 100%; max-width: 760px; margin: 0 auto; gap: 26px; padding: 0 24px 40px; }
  .chip-opts { gap: 12px; }
  .chip-opt { min-width: 92px; min-height: 60px; font-size: 24px; }
  .rules { gap: 8px; padding-left: 22px; }
  .rules li { font-size: 16px; line-height: 1.5; }
  .ng-hint { font-size: 15px; }
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
