<template>
  <div class="setup-page">
    <div class="drip-bar" />

    <div class="setup-header">
      <button v-ripple class="btn btn-outline btn-sm header-back" @click="router.push('/')">← Back</button>
      <h1 class="setup-title display">YAHTZEE</h1>
      <div class="header-spacer" />
    </div>

    <div class="setup-body">
      <section class="ng-section players-section">
        <span class="label">SELECT PLAYERS</span>

        <PlayerPicker
          :roster="playersStore.players"
          :selected-ids="selectedPlayers.map(p => p.id)"
          @pick="togglePlayer"
        />
      </section>

      <section v-if="selectedPlayers.length > 0" class="ng-section order-section">
        <span class="label">Play Order</span>
        <div class="order-list">
          <div v-for="(p, i) in selectedPlayers" :key="p.id" class="order-row" :style="{ borderLeftColor: p.color }">
            <span class="order-num display" :style="{ color: p.color }">{{ i + 1 }}</span>
            <div class="order-avatar" :style="{ background: p.color }">
              <img v-if="isPhoto(p.avatarUrl)" :src="p.avatarUrl!" alt="" />
              <span v-else>{{ avatarGlyph(p) }}</span>
            </div>
            <span class="order-name">{{ p.name }}</span>
            <div class="order-btns">
              <button v-ripple :disabled="i === 0" @click="moveUp(i)" class="btn btn-sm btn-surface">↑</button>
              <button v-ripple :disabled="i === selectedPlayers.length - 1" @click="moveDown(i)" class="btn btn-sm btn-surface">↓</button>
              <button v-ripple @click="removePlayer(p.id)" class="btn btn-sm btn-surface remove-btn">✕</button>
            </div>
          </div>
        </div>
      </section>

      <section class="ng-section bots-section">
        <span class="label">COMPUTER PLAYERS</span>
        <p class="ng-hint">They roll and score themselves. Add up to three.</p>
        <div class="bot-row">
          <button v-ripple class="btn btn-outline bot-btn" :disabled="botCount === 0" @click="removeBot">−</button>
          <span class="bot-count display">{{ botCount }}</span>
          <button v-ripple class="btn btn-outline bot-btn" :disabled="botCount >= MAX_BOTS" @click="addBot">+</button>
        </div>
        <!--
          A computer seat cannot pick up real dice, so the two settings genuinely conflict.
          Said plainly here rather than silently switching the mode underneath you.
        -->
        <p v-if="botCount > 0 && diceMode === 'physical'" class="bot-warn">
          Computer players need the app to roll. Choosing them switches the dice to electronic.
        </p>
      </section>

      <section class="ng-section mode-section">
        <span class="label">DICE MODE</span>
        <div class="dice-mode-btns">
          <button
            v-ripple
            class="dice-mode-btn"
            :class="{ active: diceMode === 'electronic' }"
            @click="diceMode = 'electronic'"
          >
            <span class="dice-mode-icon">🎲</span>
            <span class="dice-mode-label">Electronic</span>
            <span class="dice-mode-sub">App rolls the dice</span>
          </button>
          <button
            v-ripple
            class="dice-mode-btn"
            :class="{ active: diceMode === 'physical' }"
            @click="diceMode = 'physical'"
          >
            <span class="dice-mode-icon">🎯</span>
            <span class="dice-mode-label">Physical</span>
            <span class="dice-mode-sub">Use real dice, enter values</span>
          </button>
        </div>
      </section>
    </div>

    <div class="setup-footer">
      <button
        v-ripple
        class="btn btn-spray btn-lg start-btn"
        :disabled="selectedPlayers.length < 1"
        :class="{ 'btn-blocked': selectedPlayers.length < 1 }"
        @click="startGame"
      >
        {{ selectedPlayers.length < 1 ? 'Select a Player' : 'START GAME →' }}
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import PlayerPicker from '../components/PlayerPicker.vue'
import { botName } from '../lib/spadesBot'
import { avatarGlyph, isPhoto } from '../lib/playerDisplay'
import { usePlayersStore } from '../stores/players'
import { useYahtzeeStore } from '../stores/yahtzee'
import type { Player } from '../types/index'

const router = useRouter()
const playersStore = usePlayersStore()
const yahtzeeStore = useYahtzeeStore()

const selectedPlayers = ref<Player[]>([])
const diceMode = ref<'electronic' | 'physical'>('electronic')

/** Three, so there is always a seat left for a person. */
const MAX_BOTS = 3
const BOT_COLORS = ['#9aa0b5', '#8f7bff', '#5fd0ff']
const botCount = ref(0)

function addBot() { if (botCount.value < MAX_BOTS) botCount.value++ }
function removeBot() { if (botCount.value > 0) botCount.value-- }

/** Synthetic roster entries. Never saved to the roster — they exist for one game. */
const botPlayers = computed<Player[]>(() =>
  Array.from({ length: botCount.value }, (_, i) => ({
    id: `bot-${i + 1}`,
    name: botName(i),
    avatarUrl: '🤖',
    avatarPath: null,
    color: BOT_COLORS[i % BOT_COLORS.length]!,
    playerBackground: null,
    playerBackgroundSize: null,
    playerBackgroundPosition: null,
    playerBackgroundFill: null,
    playerBackgroundZoom: null,
    throwBackground: null,
    walkupBackground: null,
    targetLabelColor: null,
    pipColor: null,
    pipStyle: null,
    cricketTargetDisplay: null,
    diceTheme: null,
    pinned: false,
    wins: 0,
    gamesPlayed: 0,
    createdAt: new Date(0).toISOString(),
    updatedAt: null,
  })),
)

function isSelected(id: string) { return selectedPlayers.value.some(p => p.id === id) }

function togglePlayer(p: Player) {
  if (!isSelected(p.id)) selectedPlayers.value.push(p)
}
function removePlayer(id: string) {
  selectedPlayers.value = selectedPlayers.value.filter(p => p.id !== id)
}
function moveUp(i: number) {
  const arr = [...selectedPlayers.value]
  ;[arr[i - 1], arr[i]] = [arr[i]!, arr[i - 1]!]
  selectedPlayers.value = arr
}
function moveDown(i: number) {
  const arr = [...selectedPlayers.value]
  ;[arr[i], arr[i + 1]] = [arr[i + 1]!, arr[i]!]
  selectedPlayers.value = arr
}
function startGame() {
  if (selectedPlayers.value.length < 1) return
  const bots = botPlayers.value
  // A computer seat cannot pick up real dice. The warning above says this will happen.
  const mode = bots.length > 0 ? 'electronic' : diceMode.value
  try {
    yahtzeeStore.startGame(
      [...selectedPlayers.value, ...bots],
      mode,
      bots.map(b => b.id),
    )
  } catch (e) {
    console.error('Yahtzee startGame error:', e)
  }
  router.push('/yahtzee')
}
</script>

<style scoped>
.setup-page {
  display: flex;
  flex-direction: column;
  width: 100vw;
  height: 100dvh;
  overflow: hidden;
  background: #0a0a0a;
}

.setup-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14px 20px;
  padding-top: calc(14px + env(safe-area-inset-top));
  border-bottom: 2px solid rgba(255,255,255,0.08);
  background: rgba(0,0,0,0.6);
  flex-shrink: 0;
}
.header-back { min-width: 72px; }
.header-spacer { min-width: 72px; }
.setup-title {
  font-size: 28px;
  letter-spacing: 0.15em;
  background: linear-gradient(135deg, var(--pink), var(--purple), var(--blue));
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  margin: 0;
}

.setup-body {
  flex: 1;
  overflow-y: auto;
  -webkit-overflow-scrolling: touch;
  overscroll-behavior: contain;
  padding: 24px 20px;
  display: flex;
  flex-direction: column;
  gap: 28px;
}

.ng-section { display: flex; flex-direction: column; gap: 12px; }
.label { font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.1em; color: rgba(255,255,255,0.5); }

.order-section { border-top: 2px solid rgba(255,255,255,0.06); padding-top: 4px; }
.order-list { display: flex; flex-direction: column; gap: 8px; }
.order-row {
  display: flex; align-items: center; gap: 14px;
  padding: 12px 16px;
  background: #16161c;
  border: 2px solid rgba(255,255,255,0.08);
  border-left: 3px solid rgba(255,255,255,0.1);
  
}
.order-avatar { width: 30px; height: 30px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 15px; flex-shrink: 0; overflow: hidden; }
.order-avatar img { width: 100%; height: 100%; object-fit: cover; }
.order-num { font-size: 28px; font-family: var(--font-display); width: 28px; text-align: center; }
.order-name { flex: 1; font-size: 16px; font-weight: 900; font-family: var(--font-display); letter-spacing: 0.05em; }
.order-btns { display: flex; gap: 6px; }
.remove-btn { color: rgba(255,80,80,0.8) !important; }

.dice-mode-btns {
  display: flex;
  gap: 12px;
}
.dice-mode-btn {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  padding: 20px 12px;
  
  border: 2px solid rgba(255,255,255,0.12);
  background: #16161c;
  cursor: pointer;
  transition: all 0.15s;
  position: relative;
  overflow: hidden;
  -webkit-tap-highlight-color: transparent;
}

.dice-mode-btn.active {
  border-color: var(--pink);
  background: rgba(255,45,120,0.12);
  box-shadow: 4px 4px 0 rgba(0,0,0,0.5);
}
.dice-mode-icon { font-size: 32px; }
.dice-mode-label {
  font-size: 15px;
  font-weight: 900;
  font-family: var(--font-display);
  letter-spacing: 0.05em;
  color: #fff;
}
.dice-mode-btn.active .dice-mode-label { color: var(--pink); }
.dice-mode-sub { font-size: 11px; color: rgba(255,255,255,0.45); text-align: center; }

.setup-footer {
  flex-shrink: 0;
  padding: 16px 20px;
  padding-bottom: calc(16px + env(safe-area-inset-bottom));
  border-top: 2px solid rgba(255,255,255,0.08);
  background: rgba(0,0,0,0.8);
}
.start-btn { width: 88%; height: 52px; font-size: 18px; font-weight: 900; font-family: var(--font-display); display: block; margin: 0 auto; }
.btn-blocked { opacity: 0.5; }
.btn-outline { color: #ffffff !important; font-weight: 700 !important; border: 2px solid #ffffff !important; }


@media (max-width: 480px) {
  .player-bubble-grid { grid-template-columns: repeat(3, 1fr); gap: 16px 8px; }
  .bubble-avatar { width: 60px; height: 60px; font-size: 28px; }
}

/* ── Computer players ── */
.bot-row { display: flex; align-items: center; gap: 18px; }
.bot-btn { min-width: 56px; min-height: 48px; font-size: 24px; font-weight: 800; }
.bot-count { font-size: 30px; min-width: 32px; text-align: center; }
.bot-warn {
  margin: 6px 0 0; font-size: 12.5px; line-height: 1.5; color: var(--gold);
}

/*
 * Desktop and iPad landscape put the four sections in two columns. Stacked, the setup runs
 * past the fold on a laptop while half the width sits empty — and setup is the one screen
 * where you want the whole thing in view before committing to a game.
 *
 * Placed explicitly rather than by auto-flow: Play Order only exists once a player is
 * picked, so anything positional reshuffles the moment you tap someone.
 */
@media (min-width: 1100px) {
  .setup-title { font-size: 52px; font-weight: 900; letter-spacing: 0.18em; }
  .setup-body {
    display: grid;
    grid-template-columns: 1.15fr 1fr;
    align-content: start;
    column-gap: 36px;
    row-gap: 22px;
    padding: 20px 28px;
  }
  .players-section { grid-column: 1; }
  .order-section   { grid-column: 1; }
  .bots-section    { grid-column: 2; }
  .mode-section    { grid-column: 2; }
  /* The 18% width was measured against the full page; in half of it the tiles collapse. */
  .dice-mode-btn { flex: 1; width: auto; padding: 16px 12px; }
  .start-btn { width: 66%; height: 64px; font-size: 32px; }
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
  .dice-mode-btn:hover { border-color: rgba(255,255,255,0.3); background: #1c1c22; }
  .btn-outline:hover { color: var(--pink) !important; border-color: var(--pink) !important; }
}
</style>
