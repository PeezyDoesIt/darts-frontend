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

        <div v-if="playersStore.players.length === 0" class="empty-players">
          No players yet.
          <button v-ripple class="link-btn" @click="router.push('/player-setup')">Add one →</button>
        </div>

        <div v-else class="player-bubble-grid">
          <!-- Add new player bubble -->
          <div v-ripple class="player-bubble add-player-bubble" @click="router.push('/player-setup')">
            <div class="bubble-avatar add-bubble-avatar">
              <span>+</span>
            </div>
            <span class="bubble-name">New Player</span>
          </div>
          <div
            v-for="p in sortedPlayers.filter(p => !isSelected(p.id))"
            :key="p.id"
            v-ripple
            class="player-bubble"
            @click="togglePlayer(p)"
          >
            <div
              class="bubble-avatar"
              :style="{ background: p.color, boxShadow: `0 0 0 2px rgba(255,255,255,0.08)` }"
            >
              <img v-if="isPhoto(p.avatarUrl)" :src="p.avatarUrl!" alt="" />
              <span v-else>{{ p.avatarUrl ?? '🎯' }}</span>
            </div>
            <span class="bubble-name">{{ p.name }}</span>
            <span v-if="p.pinned" class="bubble-pin">📌</span>
          </div>
        </div>
      </section>

      <section v-if="selectedPlayers.length > 0" class="ng-section order-section">
        <span class="label">Play Order</span>
        <div class="order-list">
          <div v-for="(p, i) in selectedPlayers" :key="p.id" class="order-row" :style="{ borderLeftColor: p.color }">
            <span class="order-num display" :style="{ color: p.color }">{{ i + 1 }}</span>
            <div class="order-avatar" :style="{ background: p.color }">
              <img v-if="isPhoto(p.avatarUrl)" :src="p.avatarUrl!" alt="" />
              <span v-else>{{ p.avatarUrl ?? '🎯' }}</span>
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
        :disabled="selectedPlayers.length < 2"
        :class="{ 'btn-blocked': selectedPlayers.length < 2 }"
        @click="startGame"
      >
        {{ selectedPlayers.length < 2 ? 'Need 2+ Players' : 'START GAME →' }}
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { usePlayersStore } from '../stores/players'
import { useYahtzeeStore } from '../stores/yahtzee'
import type { Player } from '../types/index'

const router = useRouter()
const playersStore = usePlayersStore()
const yahtzeeStore = useYahtzeeStore()

const selectedPlayers = ref<Player[]>([])
const diceMode = ref<'electronic' | 'physical'>('electronic')

const sortedPlayers = computed(() =>
  [...playersStore.players].sort((a, b) => {
    if (a.pinned && !b.pinned) return -1
    if (!a.pinned && b.pinned) return 1
    return b.gamesPlayed - a.gamesPlayed
  })
)

function isSelected(id: string) { return selectedPlayers.value.some(p => p.id === id) }
function isPhoto(url: string | null) { return url?.startsWith('data:') || url?.startsWith('http') }

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
  if (selectedPlayers.value.length < 2) return
  yahtzeeStore.startGame(selectedPlayers.value, diceMode.value)
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

.empty-players { color: rgba(255,255,255,0.4); font-size: 14px; display: flex; gap: 8px; align-items: center; }
.link-btn { background: none; border: none; color: var(--pink); cursor: pointer; font-size: 14px; font-weight: 700; }

.player-bubble-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 20px 12px;
}
.player-bubble {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  position: relative;
  -webkit-tap-highlight-color: transparent;
  transition: transform 0.15s;
}
.player-bubble:hover { transform: scale(1.05); }
.bubble-avatar {
  width: 72px;
  height: 72px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 36px;
  overflow: hidden;
  flex-shrink: 0;
  transition: box-shadow 0.2s;
}
.bubble-avatar img { width: 100%; height: 100%; object-fit: cover; }
.bubble-name {
  font-size: 12px;
  font-weight: 800;
  font-family: var(--font-display);
  letter-spacing: 0.04em;
  text-align: center;
  color: rgba(255,255,255,0.55);
  max-width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.bubble-pin { position: absolute; top: -2px; right: 4px; font-size: 10px; }

.add-bubble-avatar {
  background: rgba(255,255,255,0.06) !important;
  border: 2px dashed rgba(255,255,255,0.2) !important;
  box-shadow: none !important;
  font-size: 28px !important;
  color: rgba(255,255,255,0.4);
}
.add-player-bubble .bubble-name { color: rgba(255,255,255,0.3); }
.add-player-bubble:hover .add-bubble-avatar { border-color: var(--pink) !important; color: var(--pink); }
.add-player-bubble:hover .bubble-name { color: var(--pink); }

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
.start-btn { width: 100%; height: 52px; font-size: 18px; font-weight: 900; font-family: var(--font-display); }
.btn-blocked { opacity: 0.5; }
.btn-outline { color: #ffffff !important; font-weight: 700 !important; border: 2px solid #ffffff !important; }
.btn-outline:hover { color: var(--pink) !important; border-color: var(--pink) !important; }

@media (max-width: 480px) {
  .player-bubble-grid { grid-template-columns: repeat(3, 1fr); gap: 16px 8px; }
  .bubble-avatar { width: 60px; height: 60px; font-size: 28px; }
}
</style>
