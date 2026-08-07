<template>
  <div class="setup-page">
    <div class="drip-bar" />

    <div class="setup-header">
      <button v-ripple class="btn btn-outline btn-sm header-back" @click="router.push('/')">← Back</button>
      <h1 class="setup-title display">YAHTZEE</h1>
      <div class="header-spacer" />
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

      <section class="ng-section">
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
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import PlayerPicker from '../components/PlayerPicker.vue'
import { avatarGlyph, isPhoto } from '../lib/playerDisplay'
import { usePlayersStore } from '../stores/players'
import { useYahtzeeStore } from '../stores/yahtzee'
import type { Player } from '../types/index'

const router = useRouter()
const playersStore = usePlayersStore()
const yahtzeeStore = useYahtzeeStore()

const selectedPlayers = ref<Player[]>([])
const diceMode = ref<'electronic' | 'physical'>('electronic')

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
  try {
    yahtzeeStore.startGame([...selectedPlayers.value], diceMode.value)
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
  border-bottom: 1px solid rgba(255,255,255,0.08);
  background: rgba(0,0,0,0.6);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
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

.order-section { border-top: 1px solid rgba(255,255,255,0.06); padding-top: 4px; }
.order-list { display: flex; flex-direction: column; gap: 8px; }
.order-row {
  display: flex; align-items: center; gap: 14px;
  padding: 12px 16px;
  background: rgba(255,255,255,0.04);
  border: 1px solid rgba(255,255,255,0.08);
  border-left: 3px solid rgba(255,255,255,0.1);
  border-radius: 8px;
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
  border-radius: 12px;
  border: 2px solid rgba(255,255,255,0.12);
  background: rgba(255,255,255,0.04);
  cursor: pointer;
  transition: all 0.15s;
  position: relative;
  overflow: hidden;
  -webkit-tap-highlight-color: transparent;
}
.dice-mode-btn:hover { border-color: rgba(255,255,255,0.3); background: rgba(255,255,255,0.07); }
.dice-mode-btn.active {
  border-color: var(--pink);
  background: rgba(255,45,120,0.12);
  box-shadow: 0 0 16px rgba(255,45,120,0.2);
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
  border-top: 1px solid rgba(255,255,255,0.08);
  background: rgba(0,0,0,0.8);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
}
.start-btn { width: 88%; height: 52px; font-size: 18px; font-weight: 900; font-family: var(--font-display); display: block; margin: 0 auto; }
.btn-blocked { opacity: 0.5; }
.btn-outline { color: #ffffff !important; font-weight: 700 !important; border: 2px solid #ffffff !important; }
.btn-outline:hover { color: var(--pink) !important; border-color: var(--pink) !important; }

@media (max-width: 480px) {
  .player-bubble-grid { grid-template-columns: repeat(3, 1fr); gap: 16px 8px; }
  .bubble-avatar { width: 60px; height: 60px; font-size: 28px; }
}

@media (min-width: 1101px) {
  .setup-title { font-size: 52px; font-weight: 900; letter-spacing: 0.18em; }
  .dice-mode-btns { justify-content: center; }
  .dice-mode-btn { flex: none; width: 18%; }
  .start-btn { width: 66%; height: 64px; font-size: 32px; }
}
</style>
