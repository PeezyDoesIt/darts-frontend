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
      <!-- LEFT: Game settings -->
      <div class="ng-left">
        <div class="ng-left-inner">
          <section class="ng-section">
            <span class="label">Game Type</span>
            <div class="game-type-grid">
              <button
                v-for="type in GAME_TYPE_ORDER" :key="type"
                v-ripple
                class="game-type-btn"
                :class="{ active: selectedGameType === type }"
                @click="selectedGameType = type"
              >{{ GAME_TYPE_LABELS[type] }}</button>
            </div>
          </section>

          <section v-if="selectedGameType === 'cricket' || selectedGameType === 'cutThroat' || selectedGameType === 'speedCricket'" class="ng-section">
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
            <div class="toggle-row" style="margin-top:12px" @click="cricketPlayToCompletion = !cricketPlayToCompletion">
              <div class="toggle-track" :class="{ active: cricketPlayToCompletion }">
                <div class="toggle-thumb" />
              </div>
              <div class="toggle-info">
                <span class="toggle-label">Play to Completion</span>
                <span class="toggle-sub">Game continues until all players have closed every target</span>
              </div>
            </div>
            <div class="toggle-row" @click="cricketHatTrickBonus = !cricketHatTrickBonus">
              <div class="toggle-track" :class="{ active: cricketHatTrickBonus }">
                <div class="toggle-thumb" />
              </div>
              <div class="toggle-info">
                <span class="toggle-label">Hat Trick Bonus</span>
                <span class="toggle-sub">Score 3+ marks in one turn to throw again</span>
              </div>
            </div>
          </section>

          <section v-if="['301','501','701','1001'].includes(selectedGameType ?? '')" class="ng-section">
            <span class="label">X01 Options</span>
            <div class="toggle-row" @click="bustEliminates = !bustEliminates">
              <div class="toggle-track" :class="{ active: bustEliminates }">
                <div class="toggle-thumb" />
              </div>
              <div class="toggle-info">
                <span class="toggle-title">Bust Eliminates Player</span>
                <span class="toggle-sub">Players are removed from the game when they bust</span>
              </div>
            </div>
          </section>

          <section class="ng-section">
            <span class="label">Timers</span>
            <div class="toggle-row" @click="skipWalkup = !skipWalkup">
              <div class="toggle-track" :class="{ active: skipWalkup }">
                <div class="toggle-thumb" />
              </div>
              <div class="toggle-info">
                <span class="toggle-label">Skip Walk-up Screen</span>
                <span class="toggle-sub">Go straight to throwing — no between-turns screen</span>
              </div>
            </div>
            <div class="timer-pair">
              <div class="timer-group">
                <span class="timer-group-label">Walk-up</span>
                <div class="timer-options">
                  <button v-ripple class="timer-btn" :class="{ active: timerDuration === 0 }" @click="setWalkUp(0)">Off</button>
                  <button v-for="t in timerOptions" :key="t" v-ripple class="timer-btn" :class="{ active: timerDuration === t }" @click="setWalkUp(t)">{{ t }}s</button>
                  <div class="custom-time-bubble" :class="{ active: timerDuration !== 0 && !timerOptions.includes(timerDuration) }">
                    <input type="number" class="custom-time-input" v-model="walkUpInput" min="1" max="600" placeholder="—" @change="onWalkUpInput(walkUpInput)" @focus="($event.target as HTMLInputElement).select()" />
                    <span class="custom-time-unit">s</span>
                  </div>
                </div>
              </div>
              <div class="timer-group">
                <span class="timer-group-label">Throw</span>
                <div class="timer-options">
                  <button v-for="t in throwTimerOptions" :key="t" v-ripple class="timer-btn" :class="{ active: throwTimerDuration === t }" @click="setThrow(t)">{{ t === 0 ? 'Off' : t + 's' }}</button>
                  <div class="custom-time-bubble" :class="{ active: throwTimerDuration !== 0 && !throwTimerOptions.includes(throwTimerDuration) }">
                    <input type="number" class="custom-time-input" v-model="throwInput" min="1" max="600" placeholder="—" @change="onThrowInput(throwInput)" @focus="($event.target as HTMLInputElement).select()" />
                    <span class="custom-time-unit">s</span>
                  </div>
                </div>
              </div>
            </div>
          </section>

          <section class="ng-section">
            <span class="label">Scoring Screen Theme</span>
            <div class="bg-tabs">
              <button v-ripple class="tab" :class="{ active: gameThemeMode === 'theme' }" @click="gameThemeMode = 'theme'">Colors</button>
              <button v-ripple class="tab" :class="{ active: gameThemeMode === 'image' }" @click="gameThemeMode = 'image'">Photo</button>
            </div>
            <div v-if="gameThemeMode === 'theme'" class="theme-swatch-grid">
              <button
                v-for="t in PLAYER_THEMES.filter(t => t.value)"
                :key="String(t.value)"
                class="theme-swatch"
                :class="{ active: gameTheme === t.value }"
                :style="{ background: t.value as string }"
                :title="t.label"
                @click="selectGameTheme(t.value as string)"
              />
            </div>
            <div v-else class="game-theme-photo-row">
              <div class="game-theme-preview" :style="gameThemePreviewStyle">
                <span v-if="!gameThemeImage" style="font-size:13px;opacity:0.4;letter-spacing:0.08em">PHOTO</span>
              </div>
              <div style="display:flex;flex-direction:column;gap:8px">
                <label v-ripple class="btn btn-spray btn-lg" style="cursor:pointer;position:relative;overflow:hidden">
                  Choose Photo
                  <input type="file" accept="image/*" style="display:none" @change="onGameThemeFileChange" />
                </label>
                <button v-if="gameThemeImage" v-ripple class="btn btn-outline btn-sm" @click="gameThemeImage = null; gameTheme = OBSIDIAN">Clear</button>
              </div>
            </div>
            <span v-if="gameTheme && gameThemeMode === 'theme'" class="selected-theme-name">{{ PLAYER_THEMES.find(t => t.value === gameTheme)?.label }}</span>
            <span v-if="gameThemeImage && gameThemeMode === 'image'" class="selected-theme-name">Photo selected</span>
          </section>

          <section class="ng-section">
            <span class="label">Sound Mode</span>
            <div class="timer-options">
              <button v-for="t in SOUND_THEMES" :key="t.value" v-ripple
                class="timer-btn" :class="{ active: settingsStore.soundTheme === t.value }"
                @click="settingsStore.setSoundTheme(t.value)">{{ t.label }}</button>
            </div>
          </section>
        </div>
      </div>

      <!-- RIGHT: Players + Order -->
      <div class="ng-right">
        <div class="ng-right-inner">
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

          <div v-else class="player-grid">
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

          <section v-if="selectedPlayers.length > 1" class="ng-section order-section">
            <span class="label">Play Order</span>
            <div class="order-list">
              <div v-for="(p, i) in selectedPlayers" :key="p.id" class="order-row" :style="{ borderLeftColor: p.color }">
                <span class="order-num display" :style="{ color: p.color }">{{ i + 1 }}</span>
                <div class="tile-avatar sm" :style="{ background: p.color }">
                  <img v-if="isPhoto(p.avatarUrl)" :src="p.avatarUrl!" alt="" />
                  <span v-else>{{ p.avatarUrl ?? '🎯' }}</span>
                </div>
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
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { usePlayersStore } from '../stores/players'
import { useGameStore } from '../stores/game'
import { useSettingsStore } from '../stores/settings'
import { GAME_TYPE_LABELS, GAME_TYPE_ORDER, PLAYER_THEMES, type GameType, type Player } from '../types/index'

const settingsStore = useSettingsStore()

const SOUND_THEMES = [
  { value: 'default', label: 'Default' },
  { value: 'space',   label: 'Space' },
  { value: 'arcade',  label: 'Arcade' },
  { value: 'western', label: 'Western' },
  { value: 'boxing',  label: 'Boxing' },
]

const router = useRouter()
const playersStore = usePlayersStore()
const gameStore = useGameStore()

const selectedGameType = ref<GameType | null>('cricket')
const timerDuration = ref(60)
const timerOptions = [60, 90, 120]
const walkUpInput = ref('60')
const throwTimerDuration = ref(90)
const throwTimerOptions = [0, 60, 90, 120]
const throwInput = ref('90')

function setWalkUp(t: number) {
  timerDuration.value = t
  walkUpInput.value = String(t)
}
function onWalkUpInput(val: string | number | null) {
  walkUpInput.value = String(val ?? '')
  const n = parseInt(String(val))
  if (!isNaN(n) && n > 0) timerDuration.value = n
}
function setThrow(t: number) {
  throwTimerDuration.value = t
  throwInput.value = String(t)
}
function onThrowInput(val: string | number | null) {
  throwInput.value = String(val ?? '')
  const n = parseInt(String(val))
  if (!isNaN(n) && n >= 0) throwTimerDuration.value = n
}
const closedTargetDisplay = ref<'show' | 'hide' | 'fade' | 'strike'>('show')
const bustEliminates = ref(false)
const cricketPlayToCompletion = ref(false)
const cricketHatTrickBonus = ref(false)
const skipWalkup = ref(false)
const closedTargetOptions = [
  { value: 'show'   as const, label: 'Normal',        sub: 'Closed targets stay visible' },
  { value: 'fade'   as const, label: 'Fade Out',       sub: 'Closed targets go transparent' },
  { value: 'strike' as const, label: 'Strikethrough',  sub: 'Closed targets get a line through them' },
  { value: 'hide'   as const, label: 'Hide',           sub: 'Closed targets disappear' },
]
const OBSIDIAN = 'linear-gradient(160deg, #050505 0%, #111111 40%, #222222 75%, #333344 100%)'
const gameTheme = ref<string | null>(OBSIDIAN)
const gameThemeMode = ref<'theme' | 'image'>('theme')
const gameThemeImage = ref<string | null>(null)
const selectedPlayers = ref<Player[]>([])

function selectGameTheme(val: string) { gameTheme.value = val; gameThemeImage.value = null }

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
  const t = timerDuration.value
  const tt = throwTimerDuration.value
  gameStore.startGame(selectedGameType.value, t, tt, closedTargetDisplay.value, bustEliminates.value, cricketPlayToCompletion.value, cricketHatTrickBonus.value, gameTheme.value, selectedPlayers.value, skipWalkup.value)
  router.push(skipWalkup.value ? '/game' : '/between')
}
</script>

<style scoped>
.ng-page { display: flex; flex-direction: column; width: 100vw; height: 100dvh; overflow: hidden; }

.btn-outline { color: #ffffff !important; font-weight: 700 !important; border: 2px solid #ffffff !important; }
.btn-outline:hover { color: var(--pink) !important; border-color: var(--pink) !important; }

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

/* LEFT: Game settings (wider) */
.ng-left { flex: 1; overflow-y: auto; }
.ng-left-inner { padding: 28px; display: flex; flex-direction: column; gap: 20px; }

/* RIGHT: Players + Order (25% width, scrollable) */
.ng-right { width: 25%; flex-shrink: 0; overflow-y: auto; border-left: 1px solid rgba(255,255,255,0.06); background: rgba(255,255,255,0.02); }
.ng-right-inner { padding: 28px; display: flex; flex-direction: column; gap: 20px; padding-bottom: calc(28px + env(safe-area-inset-bottom)); }

.ng-section { display: flex; flex-direction: column; gap: 10px; }

/* Players */
.players-header { display: flex; align-items: center; justify-content: space-between; }
.selected-count { color: var(--pink); font-weight: 800; }
.empty-players { color: var(--text-muted); font-size: 14px; display: flex; gap: 8px; align-items: center; }
.link-btn { background: none; border: none; color: var(--pink); cursor: pointer; font-size: 14px; font-weight: 700; }

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
.tile-avatar.sm { width: 30px; height: 30px; font-size: 15px; border-radius: 3px; border: none; flex-shrink: 0; }
.tile-avatar img { width: 100%; height: 100%; object-fit: cover; }
.tile-info { flex: 1; display: flex; flex-direction: column; gap: 3px; min-width: 0; }
.tile-name { font-size: 16px; font-weight: 900; font-family: var(--font-display); letter-spacing: 0.05em; }
.tile-stats { font-size: 11px; color: var(--text-muted); font-weight: 600; }
.tile-check { width: 28px; height: 28px; border-radius: 4px; display: flex; align-items: center; justify-content: center; font-size: 14px; font-weight: 900; color: #000; border: 2px solid rgba(255,255,255,0.1); transition: all 0.15s; font-family: var(--font-display); }

/* Play order */
.order-section { border-top: 1px solid rgba(255,255,255,0.06); padding-top: 20px; }
.order-list { display: flex; flex-direction: column; gap: 8px; }
.order-row { display: flex; align-items: center; gap: 14px; padding: 12px 16px; background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.08); border-left: 3px solid rgba(255,255,255,0.1); border-radius: 4px; }
.order-num { font-size: 28px; font-family: var(--font-display); width: 28px; text-align: center; }
.order-name { flex: 1; font-size: 16px; font-weight: 900; font-family: var(--font-display); letter-spacing: 0.05em; }
.order-btns { display: flex; gap: 6px; }

/* Labels */
.ng-section .label, .players-header .label, .order-section .label { color: #ffffff; }
.hint { font-size: 12px; color: var(--text-muted); line-height: 1.4; }

/* Game type */
.game-type-grid { display: flex; flex-wrap: wrap; gap: 8px; }
.game-type-btn {
  padding: 8px 16px; border-radius: 6px;
  border: 2px solid #ffffff; background: transparent;
  color: #ffffff; font-size: 13px; font-weight: 700; cursor: pointer; transition: all 0.15s;
  position: relative; overflow: hidden;
}
.game-type-btn:hover { border-color: var(--pink); color: var(--pink); }
.game-type-btn.active { border-color: var(--pink); color: var(--pink); background: rgba(255,45,120,0.1); }

/* Cricket options */
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

/* Toggles */
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
.toggle-label { font-size: 14px; font-weight: 700; color: var(--text); }

/* Timers — compact paired layout */
.timer-pair { display: flex; flex-direction: column; gap: 12px; }
.timer-group { display: flex; flex-direction: column; gap: 6px; }
.timer-group-label { font-size: 11px; font-weight: 700; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.1em; }
.timer-options { display: flex; gap: 6px; flex-wrap: wrap; }
.timer-btn {
  padding: 7px 13px; border-radius: 6px;
  border: 2px solid #ffffff; background: transparent;
  color: #ffffff; font-size: 13px; font-weight: 700; cursor: pointer;
  transition: all 0.15s; position: relative; overflow: hidden;
}
.timer-btn:hover { border-color: var(--pink); color: var(--pink); }
.timer-btn.active { border-color: var(--pink); color: var(--pink); background: rgba(255,45,120,0.1); }

.custom-time-bubble {
  display: flex; align-items: center; gap: 2px;
  padding: 7px 10px; border-radius: 6px;
  border: 2px solid rgba(255,255,255,0.45); background: transparent;
  transition: all 0.15s;
}
.custom-time-bubble:focus-within { border-color: rgba(255,255,255,0.85); }
.custom-time-bubble.active { border-color: var(--pink); background: rgba(255,45,120,0.1); }
.custom-time-input {
  width: 42px; background: transparent; border: none; outline: none;
  color: #fff; font-size: 13px; font-weight: 700;
  font-family: var(--font-display); text-align: center;
  -moz-appearance: textfield;
}
.custom-time-input::-webkit-outer-spin-button,
.custom-time-input::-webkit-inner-spin-button { -webkit-appearance: none; margin: 0; }
.custom-time-input::placeholder { color: rgba(255,255,255,0.3); font-weight: 400; }
.custom-time-bubble.active .custom-time-input { color: var(--pink); }
.custom-time-unit { font-size: 13px; font-weight: 700; color: rgba(255,255,255,0.5); line-height: 1; }
.custom-time-bubble.active .custom-time-unit { color: var(--pink); }

/* Theme */
.bg-tabs { display: flex; gap: 8px; }
.tab { padding: 7px 16px; border-radius: 6px; border: 2px solid #ffffff; background: transparent; color: #ffffff; font-size: 13px; font-weight: 700; cursor: pointer; transition: all 0.15s; position: relative; overflow: hidden; }
.tab:hover { border-color: var(--pink); color: var(--pink); }
.tab.active { border-color: var(--pink); color: var(--pink); background: rgba(255,45,120,0.1); }

.game-theme-photo-row { display: flex; align-items: center; gap: 16px; flex-wrap: wrap; }
.game-theme-preview { width: 88px; height: 64px; border-radius: 8px; border: 1px solid rgba(255,255,255,0.12); display: flex; align-items: center; justify-content: center; flex-shrink: 0; overflow: hidden; }
.theme-swatch-grid { display: grid; grid-template-columns: repeat(6, 1fr); gap: 6px; }
.theme-swatch {
  aspect-ratio: 1; border-radius: 6px; border: 2px solid rgba(255,255,255,0.12);
  cursor: pointer; transition: all 0.15s; position: relative; overflow: hidden;
}
.theme-swatch.none { background: rgba(255,255,255,0.06); display: flex; align-items: center; justify-content: center; }
.theme-swatch:hover { border-color: rgba(255,255,255,0.4); transform: scale(1.08); }
.theme-swatch.active { border-color: var(--blue); box-shadow: 0 0 10px rgba(0,212,255,0.5); transform: scale(1.12); }
.swatch-none-icon { font-size: 14px; color: rgba(255,255,255,0.4); line-height: 1; }
.selected-theme-name { font-size: 12px; font-weight: 700; color: var(--blue); letter-spacing: 0.08em; text-transform: uppercase; }

/* Player grid is always single-column in the narrow right panel */
.player-grid { grid-template-columns: 1fr; }

/* iPad */
@media (min-width: 769px) and (max-width: 1199px) {
  .ng-left-inner { padding: 20px; }
  .ng-right-inner { padding: 20px; }
}

/* Mobile: stack vertically, game settings first then players */
@media (max-width: 768px) {
  .ng-header { padding: 14px 20px; padding-top: calc(14px + env(safe-area-inset-top)); }
  .ng-body { flex-direction: column; overflow-y: auto; }
  .ng-left { overflow: visible; border-bottom: 1px solid rgba(255,255,255,0.06); }
  .ng-left-inner { padding: 20px; }
  .ng-right { width: 100%; overflow: visible; border-left: none; }
  .ng-right-inner { padding: 20px; padding-bottom: calc(20px + env(safe-area-inset-bottom)); }
  .player-grid { grid-template-columns: repeat(auto-fill, minmax(160px, 1fr)); }
}
</style>
