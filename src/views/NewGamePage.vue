<template>
  <div class="ng-page">
    <div class="drip-bar" />
    <div class="ng-header">
      <button v-ripple class="btn btn-outline btn-sm" @click="router.push('/')">← Back</button>
      <h2 class="ng-title display">NEW GAME</h2>
      <button v-ripple class="btn btn-spray btn-lg" :disabled="selectedPlayers.length < 2 || !selectedGameType" @click="startGame">
        START GAME →
      </button>
    </div>

    <div class="ng-body">
      <!-- LEFT: Game type + Timers -->
      <q-scroll-area class="ng-left">
        <div class="ng-left-inner">
          <section class="ng-section">
            <span class="label">Game Type</span>
            <div class="game-type-grid">
              <button
                v-for="(label, type) in GAME_TYPE_LABELS" :key="type"
                v-ripple
                class="game-type-btn"
                :class="{ active: selectedGameType === type }"
                @click="selectedGameType = (type as GameType)"
              >{{ label }}</button>
            </div>
          </section>

          <section class="ng-section">
            <span class="label">Walk-up Timer</span>
            <p class="hint">Seconds the next player has to walk up before the alert fires</p>
            <div class="timer-options">
              <button v-for="t in timerOptions" :key="t" v-ripple class="timer-btn" :class="{ active: timerDuration === t }" @click="timerDuration = t">{{ t }}s</button>
            </div>
            <div class="custom-timer-row">
              <span class="hint">Custom:</span>
              <q-input
                v-model.number="timerDuration"
                type="number" min="10" max="300"
                dense dark outlined
                style="width:90px"
                input-class="text-center"
              />
              <span class="hint">seconds</span>
            </div>
          </section>

          <section class="ng-section">
            <span class="label">Throw Timer</span>
            <p class="hint">Auto-skip turn if player doesn't submit in time. Off = no limit.</p>
            <div class="timer-options">
              <button v-for="t in throwTimerOptions" :key="t" v-ripple class="timer-btn" :class="{ active: throwTimerDuration === t }" @click="throwTimerDuration = t">{{ t === 0 ? 'Off' : t + 's' }}</button>
            </div>
            <div class="custom-timer-row">
              <span class="hint">Custom:</span>
              <q-input
                v-model.number="throwTimerDuration"
                type="number" min="0" max="300"
                dense dark outlined
                style="width:90px"
                input-class="text-center"
              />
              <span class="hint">seconds (0 = off)</span>
            </div>
          </section>
        </div>
      </q-scroll-area>

      <!-- RIGHT: Players -->
      <div class="ng-right">
        <section class="ng-section" style="flex:1;overflow:hidden;display:flex;flex-direction:column;gap:12px">
          <div class="players-header">
            <span class="label" style="margin:0">
              Players
              <span v-if="selectedPlayers.length > 0" class="selected-count">({{ selectedPlayers.length }} selected)</span>
            </span>
            <button v-ripple class="btn btn-outline btn-sm" @click="router.push('/player-setup')">+ New Player</button>
          </div>

          <div v-if="playersStore.players.length === 0" class="empty-players">
            No players yet.
            <button v-ripple class="link-btn" @click="router.push('/player-setup')">Add one →</button>
          </div>

          <q-scroll-area v-else class="player-scroll">
            <div class="player-grid">
              <div
                v-for="p in playersStore.players" :key="p.id"
                v-ripple
                class="player-tile"
                :class="{ selected: isSelected(p.id) }"
                :style="{ '--tile-color': p.color }"
                @click="togglePlayer(p)"
              >
                <div class="tile-avatar" :style="{ background: p.color, boxShadow: isSelected(p.id) ? `0 0 18px ${p.color}` : `0 0 0px transparent` }">
                  <img v-if="isPhoto(p.avatarUrl)" :src="p.avatarUrl!" alt="" />
                  <span v-else>{{ p.avatarUrl ?? '🎯' }}</span>
                </div>
                <div class="tile-info">
                  <span class="tile-name">{{ p.name }}</span>
                  <span class="tile-stats">{{ p.wins }}W · {{ p.gamesPlayed }}G</span>
                </div>
                <div class="tile-check" :style="isSelected(p.id) ? { background: p.color, borderColor: p.color, boxShadow: `0 0 10px ${p.color}80` } : {}">
                  <span v-if="isSelected(p.id)" style="color:#000">✓</span>
                </div>
              </div>
            </div>
          </q-scroll-area>
        </section>

        <section v-if="selectedPlayers.length > 1" class="ng-section order-section">
          <span class="label">Play Order</span>
          <div class="order-list">
            <div v-for="(p, i) in selectedPlayers" :key="p.id" class="order-row" :style="{ borderLeftColor: p.color }">
              <span class="order-num display" :style="{ color: p.color }">{{ i + 1 }}</span>
              <div class="tile-avatar sm" :style="{ background: p.color }">{{ p.avatarUrl ?? '🎯' }}</div>
              <span class="order-name">{{ p.name }}</span>
              <div class="order-btns">
                <button v-ripple :disabled="i === 0" @click="moveUp(i)" class="btn btn-sm btn-surface">↑</button>
                <button v-ripple :disabled="i === selectedPlayers.length - 1" @click="moveDown(i)" class="btn btn-sm btn-surface">↓</button>
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { usePlayersStore } from '../stores/players'
import { useGameStore } from '../stores/game'
import { GAME_TYPE_LABELS, type GameType, type Player } from '../types/index'

const router = useRouter()
const playersStore = usePlayersStore()
const gameStore = useGameStore()

const selectedGameType = ref<GameType | null>(null)
const timerDuration = ref(30)
const timerOptions = [15, 20, 30, 45, 60]
const throwTimerDuration = ref(0)
const throwTimerOptions = [0, 30, 45, 60, 90, 120]
const selectedPlayers = ref<Player[]>([...playersStore.players])

function isSelected(id: string) { return selectedPlayers.value.some(p => p.id === id) }
function isPhoto(url: string | null) { return url?.startsWith('data:') || url?.startsWith('http') }
function togglePlayer(p: Player) {
  if (isSelected(p.id)) selectedPlayers.value = selectedPlayers.value.filter(x => x.id !== p.id)
  else selectedPlayers.value.push(p)
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
  if (selectedPlayers.value.length < 2 || !selectedGameType.value) return
  gameStore.startGame(selectedGameType.value, timerDuration.value, throwTimerDuration.value, selectedPlayers.value)
  router.push('/game')
}
</script>

<style scoped>
.ng-page { display: flex; flex-direction: column; width: 100vw; height: 100dvh; overflow: hidden; }

.ng-header {
  display: flex; align-items: center; justify-content: space-between;
  padding: 18px 40px;
  padding-top: calc(18px + env(safe-area-inset-top));
  border-bottom: 1px solid rgba(255,255,255,0.08);
  background: rgba(255,255,255,0.03); backdrop-filter: blur(20px); -webkit-backdrop-filter: blur(20px);
  flex-shrink: 0;
}
.ng-title { font-size: 28px; letter-spacing: 0.1em; background: linear-gradient(135deg, var(--pink), var(--purple)); -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text; }

.ng-body { flex: 1; display: flex; overflow: hidden; min-height: 0; }

.ng-left { width: 360px; flex-shrink: 0; border-right: 1px solid rgba(255,255,255,0.06); background: rgba(255,255,255,0.02); }
.ng-left-inner { padding: 28px; display: flex; flex-direction: column; gap: 28px; }

.ng-right { flex: 1; padding: 28px; display: flex; flex-direction: column; gap: 20px; overflow: hidden; }
.ng-section { display: flex; flex-direction: column; gap: 10px; }

.game-type-grid { display: flex; flex-wrap: wrap; gap: 8px; }
.game-type-btn {
  padding: 8px 16px; border-radius: 6px;
  border: 1px solid rgba(255,255,255,0.1); background: rgba(255,255,255,0.04);
  color: var(--text-muted); font-size: 13px; font-weight: 700; cursor: pointer; transition: all 0.15s;
  position: relative; overflow: hidden;
}
.game-type-btn:hover { border-color: rgba(255,255,255,0.2); color: var(--text); }
.game-type-btn.active { border-color: var(--pink); color: var(--pink); background: rgba(255,45,120,0.1); }

.hint { font-size: 12px; color: var(--text-muted); line-height: 1.4; }
.timer-options { display: flex; gap: 8px; flex-wrap: wrap; }
.timer-btn {
  padding: 9px 16px; border-radius: 6px;
  border: 1px solid rgba(255,255,255,0.1); background: rgba(255,255,255,0.04);
  color: var(--text-muted); font-size: 14px; font-weight: 700; cursor: pointer;
  transition: all 0.15s; position: relative; overflow: hidden;
}
.timer-btn.active { border-color: var(--blue); color: var(--blue); background: rgba(0,212,255,0.1); }
.custom-timer-row { display: flex; align-items: center; gap: 10px; }

.players-header { display: flex; align-items: center; justify-content: space-between; }
.selected-count { color: var(--pink); font-weight: 800; }
.empty-players { color: var(--text-muted); font-size: 14px; display: flex; gap: 8px; align-items: center; }
.link-btn { background: none; border: none; color: var(--pink); cursor: pointer; font-size: 14px; font-weight: 700; }

.player-scroll { flex: 1; }
.player-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(240px, 1fr)); gap: 10px; }

.player-tile {
  display: flex; align-items: center; gap: 14px; padding: 14px 16px;
  background: rgba(255,255,255,0.03); border: 2px solid rgba(255,255,255,0.06); border-radius: 4px;
  cursor: pointer; transition: all 0.2s; position: relative; overflow: hidden;
}
.player-tile::before { content: ''; position: absolute; left: 0; top: 0; bottom: 0; width: 3px; background: rgba(255,255,255,0.1); transition: background 0.2s; }
.player-tile:hover { background: rgba(255,255,255,0.06); border-color: rgba(255,255,255,0.15); }
.player-tile.selected::before { background: var(--tile-color, var(--pink)); }
.player-tile.selected { border-color: var(--tile-color, var(--pink)); background: rgba(255,255,255,0.05); }

.tile-avatar { width: 52px; height: 52px; border-radius: 4px; display: flex; align-items: center; justify-content: center; font-size: 26px; flex-shrink: 0; overflow: hidden; transition: box-shadow 0.2s; border: 2px solid rgba(255,255,255,0.15); }
.tile-avatar.sm { width: 30px; height: 30px; font-size: 15px; border-radius: 3px; border: none; }
.tile-avatar img { width: 100%; height: 100%; object-fit: cover; }
.tile-info { flex: 1; display: flex; flex-direction: column; gap: 3px; min-width: 0; }
.tile-name { font-size: 16px; font-weight: 900; font-family: var(--font-display); letter-spacing: 0.05em; }
.tile-stats { font-size: 11px; color: var(--text-muted); font-weight: 600; }
.tile-check { width: 28px; height: 28px; border-radius: 4px; display: flex; align-items: center; justify-content: center; font-size: 14px; font-weight: 900; color: #000; border: 2px solid rgba(255,255,255,0.1); transition: all 0.15s; font-family: var(--font-display); }

.order-section { flex-shrink: 0; border-top: 1px solid rgba(255,255,255,0.06); padding-top: 18px; }
.order-list { display: flex; flex-direction: column; gap: 8px; }
.order-row { display: flex; align-items: center; gap: 14px; padding: 12px 16px; background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.08); border-left: 3px solid rgba(255,255,255,0.1); border-radius: 4px; }
.order-num { font-size: 28px; font-family: var(--font-display); width: 28px; text-align: center; }
.order-name { flex: 1; font-size: 16px; font-weight: 900; font-family: var(--font-display); letter-spacing: 0.05em; }
.order-btns { display: flex; gap: 6px; }

@media (max-width: 768px) {
  .ng-header { padding: 14px 20px; padding-top: calc(14px + env(safe-area-inset-top)); }
  .ng-body { flex-direction: column; overflow-y: auto; }
  .ng-left { width: 100%; height: auto; border-right: none; border-bottom: 1px solid rgba(255,255,255,0.06); }
  .ng-left-inner { padding: 20px; gap: 20px; }
  .ng-right { padding: 20px; padding-bottom: calc(20px + env(safe-area-inset-bottom)); overflow: visible; }
  .player-scroll { flex: none; height: auto; }
  .player-grid { grid-template-columns: repeat(auto-fill, minmax(180px, 1fr)); }
}
</style>
