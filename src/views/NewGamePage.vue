<template>
  <div class="ng-page">
    <div class="drip-bar" />
    <div class="ng-header">
      <button v-ripple class="btn btn-outline btn-sm" @click="router.push('/')">← Back</button>
      <h2 class="ng-title display">NEW GAME</h2>
      <button v-ripple class="btn btn-spray btn-lg" :class="{ 'btn-blocked': selectedPlayers.length < 2 || !selectedGameType }" @click="startGame">
        {{ !selectedGameType ? 'Pick a Game Type' : selectedPlayers.length < 2 ? 'Need 2+ Players' : 'START GAME →' }}
      </button>
    </div>

    <div class="ng-body">
      <!-- LEFT: Game type + Timers -->
      <div class="ng-left">
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

          <section v-if="selectedGameType === 'cricket' || selectedGameType === 'cutThroat'" class="ng-section">
            <span class="label">Cricket Options</span>
            <span class="hint">Closed target display</span>
            <div class="closed-target-opts">
              <button v-for="opt in closedTargetOptions" :key="opt.value" v-ripple
                class="ct-opt-btn" :class="{ active: closedTargetDisplay === opt.value }"
                @click="closedTargetDisplay = opt.value">
                <span class="ct-opt-label">{{ opt.label }}</span>
                <span class="ct-opt-sub">{{ opt.sub }}</span>
              </button>
            </div>
          </section>

          <section class="ng-section">
            <span class="label">Timers</span>
            <div class="toggle-row" @click="disableTimers = !disableTimers">
              <div class="toggle-track" :class="{ active: disableTimers }">
                <div class="toggle-thumb" />
              </div>
              <div class="toggle-info">
                <span class="toggle-title">Disable All Timers</span>
                <span class="toggle-sub">Turns off walk-up and throw timers for this game</span>
              </div>
            </div>
          </section>

          <template v-if="!disableTimers">
            <section class="ng-section">
              <span class="label">Walk-up Timer</span>
              <p class="hint">Seconds the next player has to walk up before the alert fires. Off = manual tap to start each turn.</p>
              <div class="timer-options">
                <button v-ripple class="timer-btn" :class="{ active: timerDuration === 0 }" @click="timerDuration = 0">Off</button>
                <button v-for="t in timerOptions" :key="t" v-ripple class="timer-btn" :class="{ active: timerDuration === t }" @click="timerDuration = t">{{ t }}s</button>
              </div>
              <div v-if="timerDuration > 0" class="custom-timer-row">
                <span class="hint">Custom:</span>
                <q-input
                  v-model.number="timerDuration"
                  type="number" min="30" max="300"
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
          </template>

          <section class="ng-section">
            <span class="label">Scoring Screen Theme</span>
            <p class="hint">Shared background for all players during their throw. Overrides individual player themes.</p>
            <div class="bg-tabs">
              <button v-ripple class="tab" :class="{ active: gameThemeMode === 'theme' }" @click="gameThemeMode = 'theme'">Themes</button>
              <button v-ripple class="tab" :class="{ active: gameThemeMode === 'image' }" @click="gameThemeMode = 'image'">Upload Photo</button>
            </div>
            <div v-if="gameThemeMode === 'theme'" class="theme-swatch-grid">
              <button
                v-for="t in PLAYER_THEMES"
                :key="String(t.value)"
                class="theme-swatch"
                :class="{ active: gameTheme === t.value, none: !t.value }"
                :style="t.value ? { background: t.value } : {}"
                :title="t.label"
                @click="selectGameTheme(t.value as string | null)"
              >
                <span v-if="!t.value" class="swatch-none-icon">✕</span>
              </button>
            </div>
            <div v-else class="game-theme-photo-row">
              <div class="game-theme-preview" :style="gameThemePreviewStyle">
                <span v-if="!gameThemeImage" style="font-size:28px;opacity:0.4">🖼️</span>
              </div>
              <div style="display:flex;flex-direction:column;gap:8px">
                <label v-ripple class="btn btn-spray btn-lg" style="cursor:pointer;position:relative;overflow:hidden">
                  📁 Choose Photo
                  <input type="file" accept="image/*" style="display:none" @change="onGameThemeFileChange" />
                </label>
                <button v-if="gameThemeImage" v-ripple class="btn btn-outline btn-sm" @click="gameThemeImage = null; gameTheme = null">Clear</button>
              </div>
            </div>
            <span v-if="gameTheme && gameThemeMode === 'theme'" class="selected-theme-name">{{ PLAYER_THEMES.find(t => t.value === gameTheme)?.label }}</span>
            <span v-if="gameThemeImage && gameThemeMode === 'image'" class="selected-theme-name">Photo selected</span>
          </section>
        </div>
      </div>

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

          <div v-else class="player-scroll">
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
          </div>
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
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { usePlayersStore } from '../stores/players'
import { useGameStore } from '../stores/game'
import { GAME_TYPE_LABELS, PLAYER_THEMES, type GameType, type Player } from '../types/index'

const router = useRouter()
const playersStore = usePlayersStore()
const gameStore = useGameStore()

const selectedGameType = ref<GameType | null>(null)
const timerDuration = ref(30)
const timerOptions = [30, 45, 60]
const throwTimerDuration = ref(0)
const throwTimerOptions = [0, 30, 45, 60, 90, 120]
const closedTargetDisplay = ref<'show' | 'hide' | 'fade' | 'strike'>('show')
const closedTargetOptions = [
  { value: 'show'   as const, label: 'Normal',        sub: 'Closed targets stay visible' },
  { value: 'fade'   as const, label: 'Fade Out',       sub: 'Closed targets go transparent' },
  { value: 'strike' as const, label: 'Strikethrough',  sub: 'Closed targets get a line through them' },
  { value: 'hide'   as const, label: 'Hide',           sub: 'Closed targets disappear' },
]
const disableTimers = ref(false)
const gameTheme = ref<string | null>(null)
const gameThemeMode = ref<'theme' | 'image'>('theme')
const gameThemeImage = ref<string | null>(null)
const selectedPlayers = ref<Player[]>([])

function selectGameTheme(val: string | null) { gameTheme.value = val; gameThemeImage.value = null }

function onGameThemeFileChange(e: Event) {
  const file = (e.target as HTMLInputElement).files?.[0]
  if (!file) return
  const reader = new FileReader()
  reader.onload = ev => {
    const url = ev.target?.result as string
    gameThemeImage.value = url
    gameTheme.value = url
  }
  reader.readAsDataURL(file)
}

const gameThemePreviewStyle = computed(() =>
  gameThemeImage.value
    ? { backgroundImage: `url(${gameThemeImage.value})`, backgroundSize: 'cover', backgroundPosition: 'center' }
    : { background: 'rgba(255,255,255,0.05)' }
)

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
  const t = disableTimers.value ? 0 : timerDuration.value
  const tt = disableTimers.value ? 0 : throwTimerDuration.value
  gameStore.startGame(selectedGameType.value, t, tt, closedTargetDisplay.value, gameTheme.value, selectedPlayers.value)
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
.btn-blocked { opacity: 0.5; }

.ng-body { flex: 1; display: flex; overflow: hidden; min-height: 0; }

.ng-left { width: 360px; flex-shrink: 0; overflow-y: auto; border-right: 1px solid rgba(255,255,255,0.06); background: rgba(255,255,255,0.02); }
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

.player-scroll { flex: 1; min-height: 0; overflow-y: auto; }
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

.ng-section .label, .players-header .label, .order-section .label { color: #ffffff; }

.closed-target-opts { display: flex; flex-direction: column; gap: 6px; }
.ct-opt-btn {
  display: flex; flex-direction: column; align-items: flex-start; gap: 2px;
  padding: 10px 14px; border-radius: 8px; width: 100%; text-align: left;
  border: 1px solid rgba(255,255,255,0.1); background: rgba(255,255,255,0.04);
  cursor: pointer; transition: all 0.15s; position: relative; overflow: hidden;
  -webkit-tap-highlight-color: transparent;
}
.ct-opt-btn:hover { background: rgba(255,255,255,0.08); border-color: rgba(255,255,255,0.2); }
.ct-opt-btn.active { border-color: var(--pink); background: rgba(255,45,120,0.1); }
.ct-opt-label { font-size: 14px; font-weight: 700; color: var(--text); }
.ct-opt-btn.active .ct-opt-label { color: var(--pink); }
.ct-opt-sub { font-size: 11px; color: var(--text-muted); line-height: 1.3; }

.toggle-row {
  display: flex; align-items: center; gap: 14px; padding: 12px 14px; border-radius: 8px;
  cursor: pointer; background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.1);
  transition: background 0.15s; user-select: none;
}
.toggle-row:hover { background: rgba(255,255,255,0.08); }
.toggle-track {
  width: 44px; height: 24px; border-radius: 12px; flex-shrink: 0;
  background: rgba(255,255,255,0.15); border: 1px solid rgba(255,255,255,0.2);
  position: relative; transition: background 0.2s;
}
.toggle-track.active { background: var(--pink); border-color: var(--pink); }
.toggle-thumb {
  position: absolute; top: 3px; left: 3px; width: 16px; height: 16px;
  border-radius: 50%; background: #fff; transition: transform 0.2s;
  box-shadow: 0 1px 4px rgba(0,0,0,0.4);
}
.toggle-track.active .toggle-thumb { transform: translateX(20px); }
.toggle-info { display: flex; flex-direction: column; gap: 2px; }
.toggle-title { font-size: 14px; font-weight: 700; color: var(--text); }
.toggle-sub { font-size: 11px; color: var(--text-muted); line-height: 1.4; }

.order-section { flex-shrink: 0; border-top: 1px solid rgba(255,255,255,0.06); padding-top: 18px; }
.order-list { display: flex; flex-direction: column; gap: 8px; }
.order-row { display: flex; align-items: center; gap: 14px; padding: 12px 16px; background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.08); border-left: 3px solid rgba(255,255,255,0.1); border-radius: 4px; }
.order-num { font-size: 28px; font-family: var(--font-display); width: 28px; text-align: center; }
.order-name { flex: 1; font-size: 16px; font-weight: 900; font-family: var(--font-display); letter-spacing: 0.05em; }
.order-btns { display: flex; gap: 6px; }

.bg-tabs { display: flex; gap: 8px; }
.tab { padding: 8px 20px; border-radius: 6px; border: 1px solid rgba(255,255,255,0.1); background: rgba(255,255,255,0.04); color: var(--text-muted); font-size: 13px; font-weight: 700; cursor: pointer; transition: all 0.15s; position: relative; overflow: hidden; }
.tab.active { border-color: var(--pink); color: var(--pink); background: rgba(255,45,120,0.1); }

.game-theme-photo-row { display: flex; align-items: center; gap: 16px; flex-wrap: wrap; }
.game-theme-preview { width: 88px; height: 64px; border-radius: 8px; border: 1px solid rgba(255,255,255,0.12); display: flex; align-items: center; justify-content: center; flex-shrink: 0; overflow: hidden; }

.theme-swatch-grid {
  display: flex; flex-wrap: wrap; gap: 6px;
}
.theme-swatch {
  width: 38px; height: 38px; border-radius: 6px; border: 2px solid rgba(255,255,255,0.12);
  cursor: pointer; transition: all 0.15s; position: relative; overflow: hidden;
  flex-shrink: 0;
}
.theme-swatch.none { background: rgba(255,255,255,0.06); display: flex; align-items: center; justify-content: center; }
.theme-swatch:hover { border-color: rgba(255,255,255,0.4); transform: scale(1.08); }
.theme-swatch.active { border-color: var(--blue); box-shadow: 0 0 10px rgba(0,212,255,0.5); transform: scale(1.12); }
.swatch-none-icon { font-size: 14px; color: rgba(255,255,255,0.4); line-height: 1; }
.selected-theme-name { font-size: 12px; font-weight: 700; color: var(--blue); letter-spacing: 0.08em; text-transform: uppercase; }

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
