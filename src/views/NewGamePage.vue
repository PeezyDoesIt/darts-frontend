<template>
  <div class="ng-page">
    <!-- HEADER -->
    <div class="ng-header">
      <button v-ripple class="btn btn-outline btn-sm header-back" @click="currentStep > 1 ? currentStep-- : router.push('/')">
        {{ currentStep > 1 ? '← Back' : '⌂' }}
      </button>
      <div class="step-dots">
        <button
          v-for="n in 3" :key="n"
          class="step-dot"
          :class="{ active: currentStep === n, done: currentStep > n }"
          :disabled="currentStep <= n"
          @click="currentStep > n ? currentStep = n : null"
        >
          <span v-if="currentStep > n" class="dot-check">✓</span>
        </button>
      </div>
      <div class="header-spacer" />
    </div>

    <!-- STEP 1: GAME TYPE -->
    <div v-if="currentStep === 1" class="step-pane">
      <h1 class="step-title display">PICK A GAME</h1>

      <div class="game-type-pills">
        <div class="game-type-row">
          <button
            v-for="type in GAME_TYPE_ROW1" :key="type"
            v-ripple
            class="game-type-pill"
            :class="{ active: selectedGameType === type }"
            @click="selectedGameType = type"
          >{{ GAME_TYPE_LABELS[type] }}</button>
        </div>
        <div class="game-type-row">
          <button
            v-for="type in GAME_TYPE_ROW2" :key="type"
            v-ripple
            class="game-type-pill"
            :class="{ active: selectedGameType === type }"
            @click="selectedGameType = type"
          >{{ GAME_TYPE_LABELS[type] }}</button>
        </div>
      </div>

      <p v-if="selectedGameType" class="game-type-caption">
        {{ GAME_TYPE_DESCRIPTIONS[selectedGameType] }}
      </p>

      <!-- Walk-up Timer -->
      <section class="ng-section">
        <span class="label">Walk-up Timer</span>
        <div class="large-timer-options">
          <button v-ripple class="large-timer-btn" :class="{ active: timerDuration === 0 }" @click="setWalkUp(0)">Off</button>
          <button v-for="t in timerOptions" :key="t" v-ripple class="large-timer-btn" :class="{ active: timerDuration === t }" @click="setWalkUp(t)">{{ t }}s</button>
          <div class="custom-time-bubble" :class="{ active: timerDuration !== 0 && !timerOptions.includes(timerDuration) }">
            <input type="number" class="custom-time-input" v-model="walkUpInput" min="1" max="600" placeholder="—" @change="onWalkUpInput(walkUpInput)" @focus="($event.target as HTMLInputElement).select()" />
            <span class="custom-time-unit">s</span>
          </div>
        </div>
      </section>

      <!-- Throw Timer -->
      <section class="ng-section">
        <span class="label">Throw Timer</span>
        <div class="large-timer-options">
          <button v-for="t in throwTimerOptions" :key="t" v-ripple class="large-timer-btn" :class="{ active: throwTimerDuration === t }" @click="setThrow(t)">{{ t === 0 ? 'Off' : t + 's' }}</button>
          <div class="custom-time-bubble" :class="{ active: throwTimerDuration !== 0 && !throwTimerOptions.includes(throwTimerDuration) }">
            <input type="number" class="custom-time-input" v-model="throwInput" min="1" max="600" placeholder="—" @change="onThrowInput(throwInput)" @focus="($event.target as HTMLInputElement).select()" />
            <span class="custom-time-unit">s</span>
          </div>
        </div>
      </section>

      <!-- Game Timer -->
      <section class="ng-section">
        <span class="label">Game Timer</span>
        <div class="large-timer-options">
          <button v-ripple class="large-timer-btn" :class="{ active: gameDuration === null }" @click="setGameDuration(null)">Off</button>
          <button v-for="t in gameDurationOptions" :key="t" v-ripple class="large-timer-btn" :class="{ active: gameDuration === t }" @click="setGameDuration(t)">{{ t }}m</button>
          <div class="custom-time-bubble" :class="{ active: gameDuration !== null && !gameDurationOptions.includes(gameDuration) }">
            <input type="number" class="custom-time-input" v-model="gameDurationInput" min="1" max="600" placeholder="—" @change="onGameDurationInput(gameDurationInput)" @focus="($event.target as HTMLInputElement).select()" />
            <span class="custom-time-unit">m</span>
          </div>
        </div>
        <span v-if="gameDuration !== null" class="ng-hint">Game ends after {{ gameDuration }} minutes. Announcements at 10 and 5 minutes remaining.</span>
      </section>

    </div>

    <!-- STEP 2: PLAYERS -->
    <div v-if="currentStep === 2" class="step-pane">
      <h1 class="step-title display" style="text-align:center;font-size:38px">ADD PLAYERS</h1>
      <button v-ripple class="btn btn-spray btn-lg add-player-btn" @click="router.push('/player-setup?from=new-game')">+ Add New Player</button>

      <div class="player-count-indicator">
        <span class="count-num" :class="{ 'count-ready': selectedPlayers.length >= 2 }">{{ selectedPlayers.length }}</span>
        <span class="count-label">of 8 selected</span>
      </div>

      <div v-if="playersStore.players.length === 0" class="empty-players">
        No players yet.
        <button v-ripple class="link-btn" @click="router.push('/player-setup')">Add one →</button>
      </div>

      <div v-else class="player-bubble-grid">
        <div
          v-for="p in sortedPlayers.filter(p => !isSelected(p.id))" :key="p.id"
          v-ripple
          class="player-bubble"
          @click="togglePlayer(p)"
        >
          <div
            class="bubble-avatar"
            :style="{
              background: p.color,
              boxShadow: isSelected(p.id)
                ? `0 0 0 3px ${p.color}, 0 0 20px ${p.color}80`
                : `0 0 0 2px rgba(255,255,255,0.08)`
            }"
          >
            <img v-if="isPhoto(p.avatarUrl)" :src="p.avatarUrl!" alt="" />
            <span v-else>{{ p.avatarUrl ?? '🎯' }}</span>
          </div>
          <span class="bubble-name" :style="isSelected(p.id) ? { color: p.color } : {}">{{ p.name }}</span>
          <span v-if="p.pinned" class="bubble-pin">📌</span>
        </div>
      </div>

      <section v-if="selectedPlayers.length > 0" class="order-section">
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
            </div>
          </div>
        </div>
      </section>

    </div>

    <!-- STEP 3: SETTINGS -->
    <div v-if="currentStep === 3" class="step-pane">
      <h1 class="step-title display">SETTINGS</h1>

      <!-- Skip Walk-up Toggle -->
      <section class="ng-section">
        <div class="toggle-row" @click="skipWalkup = !skipWalkup">
          <div class="toggle-track" :class="{ active: skipWalkup }">
            <div class="toggle-thumb" />
          </div>
          <div class="toggle-info">
            <span class="toggle-label">Skip Walk-up Screen</span>
            <span class="toggle-sub">Go straight to throwing — no between-turns screen</span>
          </div>
        </div>
      </section>

      <!-- Advanced Options Collapsible -->
      <button class="advanced-toggle-btn" @click="showAdvanced = !showAdvanced">
        {{ showAdvanced ? '▾' : '▸' }} Advanced Options
      </button>

      <template v-if="showAdvanced">
        <!-- Cricket Options -->
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

        <!-- Round Limit -->
        <section v-if="selectedGameType === 'cricket' || selectedGameType === 'cutThroat' || selectedGameType === 'speedCricket'" class="ng-section">
          <span class="label">Round Limit</span>
          <div class="round-limit-row">
            <div class="toggle-info">
              <span class="toggle-sub">Game ends after this many rounds — most targets closed wins. Tap the number to toggle on/off.</span>
            </div>
            <div class="round-limit-control">
              <button v-ripple class="round-limit-btn" :disabled="cricketRoundLimit === null || cricketRoundLimit <= 1" @click="cricketRoundLimit = Math.max(1, (cricketRoundLimit ?? 5) - 1)">−</button>
              <span class="round-limit-val" @click="cricketRoundLimit = cricketRoundLimit === null ? 7 : null">{{ cricketRoundLimit ?? 'OFF' }}</span>
              <button v-ripple class="round-limit-btn" @click="cricketRoundLimit = (cricketRoundLimit ?? 0) + 1">+</button>
            </div>
          </div>
        </section>

        <!-- X01 Options -->
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

        <!-- Sound Mode -->
        <section class="ng-section">
          <span class="label">Sound Mode</span>
          <div class="large-timer-options">
            <button v-for="t in SOUND_THEMES" :key="t.value" v-ripple
              class="large-timer-btn" :class="{ active: settingsStore.soundTheme === t.value }"
              @click="settingsStore.setSoundTheme(t.value)">{{ t.label }}</button>
          </div>
        </section>

        <!-- Scoring Screen Theme -->
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
          <div v-if="gameThemeImage" class="bg-fit-controls">
            <div class="bg-fit-row">
              <span class="bg-fit-label">Size</span>
              <div class="bg-fit-btns">
                <button v-ripple class="bg-fit-btn" :class="{ active: gameThemeSize === 'cover' || gameThemeSize === null }" @click="gameThemeSize = 'cover'">Cover</button>
                <button v-ripple class="bg-fit-btn" :class="{ active: gameThemeSize === 'contain' }" @click="gameThemeSize = 'contain'">Contain</button>
              </div>
            </div>
            <div v-if="gameThemeSize === 'contain'" class="bg-fit-row">
              <span class="bg-fit-label">Fill</span>
              <div class="bg-fit-btns">
                <button v-ripple class="bg-fit-btn" :class="{ active: gameThemeFill === 'black' || gameThemeFill === null }" @click="gameThemeFill = 'black'">Black</button>
                <button v-ripple class="bg-fit-btn" :class="{ active: gameThemeFill === 'blur' }" @click="gameThemeFill = 'blur'">Blur</button>
              </div>
            </div>
            <div class="bg-fit-row">
              <span class="bg-fit-label">Position</span>
              <div class="bg-fit-btns">
                <button v-ripple class="bg-fit-btn" :class="{ active: gameThemePosition === 'center' || gameThemePosition === null }" @click="gameThemePosition = 'center'">Center</button>
              </div>
            </div>
          </div>
        </section>
      </template>
    </div>

    <!-- FOOTER -->
    <div class="ng-footer">
      <div class="footer-avatars">
        <div
          v-for="p in selectedPlayers.slice(0, 6)" :key="p.id"
          class="footer-avatar"
          :style="{ background: p.color, boxShadow: `0 0 8px ${p.color}80` }"
        >
          <img v-if="isPhoto(p.avatarUrl)" :src="p.avatarUrl!" alt="" />
          <span v-else style="font-size:14px">{{ p.avatarUrl ?? '🎯' }}</span>
        </div>
        <span v-if="selectedPlayers.length > 6" class="footer-avatar-overflow">+{{ selectedPlayers.length - 6 }}</span>
      </div>

      <button
        v-if="currentStep === 1"
        v-ripple
        class="btn btn-spray start-btn"
        :class="{ 'btn-blocked': !selectedGameType }"
        :disabled="!selectedGameType"
        @click="selectedGameType ? currentStep = 2 : null"
      >NEXT →</button>

      <button
        v-else-if="currentStep === 2"
        v-ripple
        class="btn btn-spray start-btn"
        :class="{ 'btn-blocked': selectedPlayers.length < 2 }"
        :disabled="selectedPlayers.length < 2"
        @click="selectedPlayers.length >= 2 ? currentStep = 3 : null"
      >NEXT →</button>

      <button
        v-else
        v-ripple
        class="btn btn-spray start-btn"
        :class="{ 'btn-blocked': selectedPlayers.length < 2 || !selectedGameType }"
        @click="startGame"
      >
        {{ !selectedGameType ? 'Pick a Game' : selectedPlayers.length < 2 ? 'Need 2+ Players' : 'START GAME →' }}
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { usePlayersStore } from '../stores/players'
import { useGameStore } from '../stores/game'
import { useSettingsStore } from '../stores/settings'
import { GAME_TYPE_LABELS, GAME_TYPE_ORDER, PLAYER_THEMES, type GameType, type Player } from '../types/index'

const GAME_TYPE_ROW1: GameType[] = ['cricket', 'speedCricket', 'aroundTheClock', 'killer', 'horse']
const GAME_TYPE_ROW2: GameType[] = ['301', '501', '701', '1001']

const settingsStore = useSettingsStore()

const SOUND_THEMES = [
  { value: 'default', label: 'Default' },
  { value: 'space',   label: 'Space' },
  { value: 'arcade',  label: 'Arcade' },
  { value: 'western', label: 'Western' },
  { value: 'boxing',  label: 'Boxing' },
]

const GAME_TYPE_DESCRIPTIONS: Record<string, string> = {
  cricket: "Close 15–20 and the bull. Score points on closed numbers your opponents haven't closed.",
  speedCricket: 'Cricket with a shot clock — take too long and lose your turn.',
  aroundTheClock: 'Hit every number 1–20 in sequence. First to finish wins.',
  killer: 'Earn your number, become a Killer, then knock out other players.',
  horse: "Match each player's shot or pick up a letter. Spell HORSE and you're out.",
  '301': 'Start at 301 and count down to zero. First to zero wins.',
  '501': 'Start at 501 and count down to zero. First to zero wins.',
  '701': 'Start at 701 and count down to zero. First to zero wins.',
  '1001': 'Start at 1001 and count down to zero. First to zero wins.',
}

const router = useRouter()
const route = useRoute()
const playersStore = usePlayersStore()
const gameStore = useGameStore()

// Wizard step — read from ?step= query param so returning from player setup lands on step 2
const currentStep = ref(route.query.step ? Number(route.query.step) : 1)
const showAdvanced = ref(false)

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
const gameDuration = ref<number | null>(null)
const gameDurationOptions = [30, 45, 60, 90]
const gameDurationInput = ref('')
function setGameDuration(val: number | null) {
  gameDuration.value = val
  gameDurationInput.value = val !== null ? String(val) : ''
}
function onGameDurationInput(val: string | number | null) {
  gameDurationInput.value = String(val ?? '')
  const n = parseInt(String(val))
  if (!isNaN(n) && n > 0) gameDuration.value = n
}

const closedTargetDisplay = ref<'show' | 'hide'>('show')
const bustEliminates = ref(false)
const cricketPlayToCompletion = ref(false)
const cricketHatTrickBonus = ref(false)
const cricketRoundLimit = ref<number | null>(null)
const skipWalkup = ref(false)
const closedTargetOptions = [
  { value: 'show'   as const, label: 'Normal',        sub: 'Closed targets stay visible' },
  { value: 'hide'   as const, label: 'Hide',           sub: 'Closed targets disappear' },
]
const OBSIDIAN = 'linear-gradient(160deg, #050505 0%, #111111 40%, #222222 75%, #333344 100%)'
const gameTheme = ref<string | null>(OBSIDIAN)
const gameThemeMode = ref<'theme' | 'image'>('theme')
const gameThemeImage = ref<string | null>(null)
const gameThemeSize = ref<'cover' | 'contain' | null>(null)
const gameThemePosition = ref<'top' | 'center' | 'bottom' | null>(null)
const gameThemeFill = ref<'black' | 'blur' | null>(null)
const selectedPlayers = ref<Player[]>([])

const sortedPlayers = computed(() =>
  [...playersStore.players].sort((a, b) => {
    if (a.pinned && !b.pinned) return -1
    if (!a.pinned && b.pinned) return 1
    return b.gamesPlayed - a.gamesPlayed
  })
)

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

const gameThemePreviewStyle = computed(() => {
  if (gameThemeImage.value) {
    const isBlur = gameThemeFill.value === 'blur' && gameThemeSize.value === 'contain'
    return { backgroundImage: `url(${gameThemeImage.value})`, backgroundSize: gameThemeSize.value ?? 'cover', backgroundPosition: gameThemePosition.value ?? 'center', backgroundRepeat: 'no-repeat', backgroundColor: isBlur ? 'transparent' : '#000' }
  }
  return { background: 'rgba(255,255,255,0.05)' }
})

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
  gameStore.startGame(selectedGameType.value, t, tt, closedTargetDisplay.value, bustEliminates.value, cricketPlayToCompletion.value, cricketHatTrickBonus.value, cricketRoundLimit.value, gameTheme.value, gameThemeSize.value, gameThemePosition.value, gameThemeFill.value, selectedPlayers.value, skipWalkup.value, gameDuration.value)
  router.push(skipWalkup.value ? '/game' : '/between')
}
</script>

<style scoped>
/* ===== PAGE SHELL ===== */
.ng-page {
  display: flex;
  flex-direction: column;
  height: 100dvh;
  overflow: hidden;
}

/* ===== HEADER ===== */
.ng-header {
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

/* Step dots */
.step-dots {
  display: flex;
  align-items: center;
  gap: 10px;
}
.step-dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  border: none;
  background: rgba(255,255,255,0.2);
  cursor: default;
  transition: all 0.2s;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0;
  position: relative;
}
.step-dot.active {
  background: var(--pink);
  width: 12px;
  height: 12px;
  box-shadow: 0 0 10px var(--pink);
}
.step-dot.done {
  background: #22c55e;
  cursor: pointer;
  width: 10px;
  height: 10px;
}
.dot-check {
  position: absolute;
  font-size: 7px;
  color: #000;
  font-weight: 900;
  line-height: 1;
}

/* ===== STEP PANE ===== */
.step-pane {
  flex: 1;
  overflow-y: auto;
  -webkit-overflow-scrolling: touch;
  overscroll-behavior: contain;
  scrollbar-width: none;
  padding: 24px 20px;
  display: flex;
  flex-direction: column;
  gap: 20px;
  max-width: 88vw;
  margin: 0 auto 0 16px;
  width: 100%;
}
.step-pane::-webkit-scrollbar { display: none; }

.step-title {
  font-size: 32px;
  font-family: var(--font-display);
  letter-spacing: 0.1em;
  background: linear-gradient(135deg, var(--pink), var(--purple));
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  margin: 0;
}

/* ===== STEP 1: GAME TYPE ===== */
.game-type-pills { display: flex; flex-direction: column; gap: 8px; }
.game-type-row { display: flex; gap: 8px; }
.game-type-pill {
  flex: 1;
  padding: 10px 6px;
  border-radius: 24px;
  border: 2px solid rgba(255,255,255,0.15);
  background: rgba(255,255,255,0.04);
  color: #fff;
  font-size: 13px;
  font-weight: 800;
  font-family: var(--font-display);
  cursor: pointer;
  transition: all 0.15s;
  text-align: center;
  letter-spacing: 0.03em;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.game-type-pill:hover {
  border-color: rgba(255,255,255,0.35);
  background: rgba(255,255,255,0.08);
}
.game-type-pill.active {
  border-color: var(--pink);
  color: var(--pink);
  background: rgba(255,45,120,0.12);
  box-shadow: 0 0 12px rgba(255,45,120,0.2);
}

.game-type-caption {
  font-size: 13px;
  color: rgba(255,255,255,0.55);
  line-height: 1.5;
  text-align: center;
  padding: 0 8px;
  margin: 0;
}

/* ===== STEP 2: PLAYERS ===== */
.add-player-btn { width: 100%; }

.player-count-indicator {
  display: flex;
  align-items: baseline;
  gap: 8px;
}
.count-num {
  font-size: 36px;
  font-weight: 900;
  font-family: var(--font-display);
  color: rgba(255,255,255,0.3);
  transition: color 0.2s;
  line-height: 1;
}
.count-num.count-ready { color: var(--pink); }
.count-label {
  font-size: 14px;
  color: rgba(255,255,255,0.4);
  font-weight: 600;
}

.empty-players { color: var(--text-muted); font-size: 14px; display: flex; gap: 8px; align-items: center; }
.link-btn { background: none; border: none; color: var(--pink); cursor: pointer; font-size: 14px; font-weight: 700; }

/* ===== PLAYER BUBBLES ===== */
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
.player-bubble.selected { transform: scale(1.08); }
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
  transition: color 0.2s;
  max-width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.player-bubble.selected .bubble-name { color: inherit; }
.bubble-pin { position: absolute; top: -2px; right: 4px; font-size: 10px; }

/* Play order */
.order-section { display: flex; flex-direction: column; gap: 10px; border-top: 1px solid rgba(255,255,255,0.06); padding-top: 20px; }
.order-list { display: flex; flex-direction: column; gap: 8px; }
.order-row { display: flex; align-items: center; gap: 14px; padding: 12px 16px; background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.08); border-left: 3px solid rgba(255,255,255,0.1); border-radius: 8px; }
.order-avatar { width: 30px; height: 30px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 15px; flex-shrink: 0; overflow: hidden; }
.order-avatar img { width: 100%; height: 100%; object-fit: cover; }
.order-num { font-size: 28px; font-family: var(--font-display); width: 28px; text-align: center; }
.order-name { flex: 1; font-size: 16px; font-weight: 900; font-family: var(--font-display); letter-spacing: 0.05em; }
.order-btns { display: flex; gap: 6px; }

/* ===== STEP 3: SETTINGS ===== */
.ng-section { display: flex; flex-direction: column; gap: 10px; }

.large-timer-options {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}
.large-timer-btn {
  min-height: 52px;
  padding: 0 20px;
  font-size: 16px;
  font-weight: 800;
  border-radius: 8px;
  border: 2px solid rgba(255,255,255,0.2);
  background: rgba(255,255,255,0.04);
  color: #ffffff;
  cursor: pointer;
  transition: all 0.15s;
  position: relative;
  overflow: hidden;
  flex: 1;
  font-family: var(--font-display);
}
.large-timer-btn:hover { border-color: rgba(255,255,255,0.4); background: rgba(255,255,255,0.08); }
.large-timer-btn.active { border-color: var(--pink); color: var(--pink); background: rgba(255,45,120,0.12); }

.custom-time-bubble {
  display: flex;
  align-items: center;
  gap: 2px;
  padding: 0 12px;
  min-height: 52px;
  border-radius: 8px;
  border: 2px solid rgba(255,255,255,0.2);
  background: rgba(255,255,255,0.04);
  transition: all 0.15s;
  flex: 1;
}
.custom-time-bubble:focus-within { border-color: rgba(255,255,255,0.6); }
.custom-time-bubble.active { border-color: var(--pink); background: rgba(255,45,120,0.12); }
.custom-time-input {
  width: 48px;
  background: transparent;
  border: none;
  outline: none;
  color: #fff;
  font-size: 16px;
  font-weight: 800;
  font-family: var(--font-display);
  text-align: center;
  -moz-appearance: textfield;
}
.custom-time-input::-webkit-outer-spin-button,
.custom-time-input::-webkit-inner-spin-button { -webkit-appearance: none; margin: 0; }
.custom-time-input::placeholder { color: rgba(255,255,255,0.3); font-weight: 400; }
.custom-time-bubble.active .custom-time-input { color: var(--pink); }
.custom-time-unit { font-size: 14px; font-weight: 700; color: rgba(255,255,255,0.5); line-height: 1; }
.custom-time-bubble.active .custom-time-unit { color: var(--pink); }

/* Advanced toggle */
.advanced-toggle-btn {
  background: none;
  border: 1px solid rgba(255,255,255,0.15);
  border-radius: 8px;
  padding: 12px 16px;
  color: rgba(255,255,255,0.6);
  font-size: 14px;
  font-weight: 700;
  cursor: pointer;
  text-align: left;
  width: 100%;
  transition: all 0.15s;
}
.advanced-toggle-btn:hover {
  border-color: rgba(255,255,255,0.3);
  color: rgba(255,255,255,0.85);
  background: rgba(255,255,255,0.04);
}

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

/* Round limit */
.round-limit-row { display: flex; align-items: center; justify-content: space-between; gap: 12px; padding: 10px 0; border-top: 1px solid rgba(255,255,255,0.06); margin-top: 4px; }
.round-limit-control { display: flex; align-items: center; gap: 8px; flex-shrink: 0; }
.round-limit-btn { width: 36px; height: 36px; border-radius: 8px; border: 1px solid rgba(255,255,255,0.2); background: rgba(255,255,255,0.06); color: var(--text); font-size: 20px; font-weight: 700; cursor: pointer; display: flex; align-items: center; justify-content: center; transition: background 0.15s; position: relative; overflow: hidden; }
.round-limit-btn:hover:not(:disabled) { background: rgba(255,255,255,0.12); }
.round-limit-btn:disabled { opacity: 0.3; cursor: default; }
.round-limit-val { min-width: 52px; text-align: center; font-size: 20px; font-weight: 900; font-family: var(--font-display); color: var(--gold); cursor: pointer; letter-spacing: 0.05em; }

/* Theme */
.bg-tabs { display: flex; gap: 8px; }
.tab { padding: 7px 16px; border-radius: 6px; border: 2px solid #ffffff; background: transparent; color: #ffffff; font-size: 13px; font-weight: 700; cursor: pointer; transition: all 0.15s; position: relative; overflow: hidden; }
.tab:hover { border-color: var(--pink); color: var(--pink); }
.tab.active { border-color: var(--pink); color: var(--pink); background: rgba(255,45,120,0.1); }

.game-theme-photo-row { display: flex; align-items: center; gap: 16px; flex-wrap: wrap; }
.game-theme-preview { width: 88px; height: 64px; border-radius: 8px; border: 1px solid rgba(255,255,255,0.12); display: flex; align-items: center; justify-content: center; flex-shrink: 0; overflow: hidden; }
.theme-swatch-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(20px, 1fr)); gap: 4px; }
.theme-swatch {
  width: 20px; height: 20px; border-radius: 4px; border: 2px solid rgba(255,255,255,0.12);
  cursor: pointer; transition: all 0.15s; position: relative; overflow: hidden; flex-shrink: 0;
}
.theme-swatch:hover { border-color: rgba(255,255,255,0.4); transform: scale(1.08); }
.theme-swatch.active { border-color: var(--blue); box-shadow: 0 0 10px rgba(0,212,255,0.5); transform: scale(1.12); }
.selected-theme-name { font-size: 12px; font-weight: 700; color: var(--blue); letter-spacing: 0.08em; text-transform: uppercase; }
.bg-fit-controls { display: flex; flex-direction: column; gap: 8px; padding-top: 8px; border-top: 1px solid rgba(255,255,255,0.08); margin-top: 4px; }
.bg-fit-row { display: flex; align-items: center; gap: 10px; }
.bg-fit-label { font-size: 11px; font-weight: 700; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.1em; min-width: 56px; }
.bg-fit-btns { display: flex; gap: 6px; }
.bg-fit-btn { padding: 5px 14px; border-radius: 6px; border: 1px solid rgba(255,255,255,0.15); background: rgba(255,255,255,0.05); color: var(--text-muted); font-size: 12px; font-weight: 700; cursor: pointer; transition: all 0.15s; position: relative; overflow: hidden; }
.bg-fit-btn:hover { background: rgba(255,255,255,0.1); color: var(--text); }
.bg-fit-btn.active { border-color: var(--pink); background: rgba(255,45,120,0.15); color: var(--pink); }

/* Labels & hints */
.label { font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.1em; color: rgba(255,255,255,0.5); }
.hint { font-size: 12px; color: var(--text-muted); line-height: 1.4; }
.ng-hint { font-size: 11px; color: rgba(255,255,255,0.4); line-height: 1.4; margin-top: 6px; }

.btn-blocked { opacity: 0.5; }
.btn-outline { color: #ffffff !important; font-weight: 700 !important; border: 2px solid #ffffff !important; }
.btn-outline:hover { color: var(--pink) !important; border-color: var(--pink) !important; }

/* ===== FOOTER ===== */
.ng-footer {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 20px;
  padding-bottom: calc(12px + env(safe-area-inset-bottom));
  border-top: 1px solid rgba(255,255,255,0.08);
  background: rgba(0,0,0,0.8);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  gap: 16px;
}

.footer-avatars {
  display: flex;
  align-items: center;
  gap: 6px;
  min-width: 0;
}
.footer-avatar {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  overflow: hidden;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 2px solid rgba(255,255,255,0.2);
}
.footer-avatar img { width: 100%; height: 100%; object-fit: cover; }
.footer-avatar-overflow {
  font-size: 11px;
  font-weight: 800;
  color: rgba(255,255,255,0.5);
  padding-left: 2px;
  white-space: nowrap;
}

.start-btn {
  padding: 0 32px;
  height: 52px;
  font-size: 18px;
  font-weight: 900;
  font-family: var(--font-display);
  flex-shrink: 0;
  white-space: nowrap;
}

@media (max-width: 480px) {
  .player-bubble-grid { grid-template-columns: repeat(3, 1fr); gap: 16px 8px; }
  .bubble-avatar { width: 60px; height: 60px; font-size: 28px; }
}
</style>
