<template>
  <div class="lrc-setup-page">
    <div class="drip-bar" />

    <!-- Header -->
    <div class="setup-header">
      <button v-ripple class="btn btn-outline header-back-btn" @click="goBack(router)">← Back</button>
      <h1 class="setup-title display">LEFT RIGHT CENTER</h1>
      <button
        v-ripple
        class="btn btn-spray header-start-btn"
        :disabled="selectedPlayers.length < 3"
        @click="handleStart"
      >
        START GAME
      </button>
    </div>

    <!-- Body -->
    <div class="setup-body">
      <!-- Left panel: Select Players -->
      <div class="panel panel-left">
        <div class="panel-label-row">
          <div class="panel-label">SELECT PLAYERS</div>
        </div>

        <PlayerPicker
          :roster="playersStore.players"
          :selected-ids="selectedPlayers.map(p => p.id)"
          :full="selectedPlayers.length >= 8"
          @pick="togglePlayer"
        />

        <!-- Add Guest -->
        <div class="guest-section">
          <div class="panel-label" style="margin-bottom: 10px;">ADD GUEST</div>
          <div class="guest-row">
            <button v-ripple class="emoji-cycler" @click="cycleEmoji">{{ guestEmoji }}</button>
            <input
              v-model="guestName"
              class="guest-input"
              placeholder="Guest name..."
              maxlength="20"
              @keydown.enter="addGuest"
            />
            <button v-ripple class="btn btn-outline guest-add-btn" @click="addGuest">Add</button>
          </div>
        </div>
      </div>

      <!-- Right panel: Player Order + Settings -->
      <div class="panel panel-right">
        <div class="panel-label">PLAYER ORDER ({{ selectedPlayers.length }}/8)</div>

        <div class="roster">
          <div v-if="selectedPlayers.length === 0" class="roster-empty">
            Select at least 3 players
          </div>
          <div
            v-for="(p, i) in selectedPlayers"
            :key="p.id"
            class="roster-row"
          >
            <span class="seat-num">{{ i + 1 }}</span>
            <div class="player-avatar sm" :style="{ background: isPhoto(p.avatarUrl) ? 'transparent' : p.color }">
              <img v-if="isPhoto(p.avatarUrl)" :src="p.avatarUrl!" class="avatar-img" />
              <span v-else class="avatar-emoji">{{ avatarGlyph(p) }}</span>
            </div>
            <span class="roster-name">{{ p.name }}</span>
            <div class="roster-actions">
              <button v-ripple class="order-btn" :disabled="i === 0" @click="moveUp(i)">▲</button>
              <button v-ripple class="order-btn" :disabled="i === selectedPlayers.length - 1" @click="moveDown(i)">▼</button>
              <button v-ripple class="remove-btn" @click="removeFromRoster(i)">✕</button>
            </div>
          </div>
        </div>

        <!-- Dice Style -->
        <div class="dice-style-section">
          <div class="panel-label" style="margin-bottom: 10px;">DICE STYLE</div>
          <div class="dice-style-grid">
            <button
              v-for="style in DICE_STYLES"
              :key="style"
              v-ripple
              class="dice-style-btn"
              :class="{ active: diceStyle === style }"
              @click="diceStyle = style"
            >
              <div class="die-preview" :class="`die-${style}`">L</div>
              <span class="style-name">{{ style }}</span>
            </button>
          </div>
        </div>

        <div class="chips-info">Each player starts with 3 chips</div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import PlayerPicker from '../components/PlayerPicker.vue'
import { avatarGlyph, isPhoto } from '../lib/playerDisplay'
import { useLRCStore, type LRCDiceStyle, type LRCPlayer } from '../stores/lrc'
import { usePlayersStore } from '../stores/players'
import { goBack } from '../router/goBack'
import type { Player } from '../types/index'

const router = useRouter()
const lrcStore = useLRCStore()
const playersStore = usePlayersStore()

const DICE_STYLES: LRCDiceStyle[] = ['neon', 'casino', 'retro', 'wood']
const GUEST_EMOJIS = ['😎','🤠','👻','🦊','🐺','🐻','🦁','🐯','🦅','💀','👾','🎭']
const GUEST_COLORS = ['#ff2d78','#00d4ff','#ffd700','#00cc44','#bf5fff','#ff6600']

const diceStyle = ref<LRCDiceStyle>('neon')
const selectedPlayers = ref<LRCPlayer[]>([])
const guestName = ref('')
const guestEmojiIdx = ref(0)
const guestEmoji = computed(() => GUEST_EMOJIS[guestEmojiIdx.value]!)

function isSelected(id: string): boolean {
  return selectedPlayers.value.some(p => p.id === id)
}

function togglePlayer(p: Player) {
  if (isSelected(p.id)) {
    selectedPlayers.value = selectedPlayers.value.filter(sp => sp.id !== p.id)
  } else {
    if (selectedPlayers.value.length >= 8) return
    selectedPlayers.value.push({
      id: p.id,
      name: p.name,
      avatarUrl: p.avatarUrl ?? null,
      color: p.color,
      chips: 3,
    })
  }
}

function moveUp(i: number) {
  if (i === 0) return
  const arr = [...selectedPlayers.value]
  ;[arr[i - 1], arr[i]] = [arr[i]!, arr[i - 1]!]
  selectedPlayers.value = arr
}

function moveDown(i: number) {
  if (i === selectedPlayers.value.length - 1) return
  const arr = [...selectedPlayers.value]
  ;[arr[i + 1], arr[i]] = [arr[i]!, arr[i + 1]!]
  selectedPlayers.value = arr
}

function removeFromRoster(i: number) {
  selectedPlayers.value.splice(i, 1)
}

function cycleEmoji() {
  guestEmojiIdx.value = (guestEmojiIdx.value + 1) % GUEST_EMOJIS.length
}

function addGuest() {
  const name = guestName.value.trim()
  if (!name) return
  if (selectedPlayers.value.length >= 8) return
  const color = GUEST_COLORS[Math.floor(Math.random() * GUEST_COLORS.length)]!
  selectedPlayers.value.push({
    id: 'guest-' + Date.now(),
    name,
    avatarUrl: guestEmoji.value,
    color,
    chips: 3,
    isGuest: true,
  })
  guestName.value = ''
  guestEmojiIdx.value = (guestEmojiIdx.value + 1) % GUEST_EMOJIS.length
}

function handleStart() {
  if (selectedPlayers.value.length < 3) return
  lrcStore.startGame(selectedPlayers.value, diceStyle.value)
  router.push('/lrc')
}
</script>

<style scoped>
.lrc-setup-page {
  width: 100vw;
  /* `height`, not `min-height` — see the note on .home in HomePage.vue. The app shell
     clips and never scrolls, so with min-height this grew to fit its content, overflow-y
     never engaged, and 423px of the page (dice styles, start button) was unreachable on
     a 568px-tall phone. */
  height: 100dvh;
  background: #0a0a12;
  display: flex;
  flex-direction: column;
  overflow-y: auto;
  -webkit-overflow-scrolling: touch;
  scrollbar-width: none;
}
.lrc-setup-page::-webkit-scrollbar { display: none; }

.drip-bar {
  width: 100%;
  height: 4px;
  background: linear-gradient(90deg, var(--pink) 0%, var(--purple) 50%, var(--blue) 100%);
  flex-shrink: 0;
}

/* Header */
.setup-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 20px;
  border-bottom: 1px solid rgba(255,255,255,0.08);
  gap: 12px;
  flex-shrink: 0;
}
.setup-title {
  font-family: var(--font-display);
  font-size: clamp(14px, 3vw, 24px);
  letter-spacing: 0.12em;
  color: #fff;
  margin: 0;
  text-align: center;
  flex: 1;
}
.header-back-btn {
  font-size: 14px;
  padding: 8px 14px;
  white-space: nowrap;
  flex-shrink: 0;
}
.header-start-btn {
  font-size: 14px;
  padding: 8px 18px;
  font-family: var(--font-display);
  letter-spacing: 0.08em;
  white-space: nowrap;
  flex-shrink: 0;
}
.header-start-btn:disabled {
  opacity: 0.35;
  cursor: not-allowed;
}

/* Body */
.setup-body {
  display: flex;
  flex: 1;
  gap: 0;
  overflow: hidden;
}

/* Panels */
.panel {
  display: flex;
  flex-direction: column;
  gap: 16px;
  padding: 20px;
  overflow-y: auto;
  scrollbar-width: none;
  flex: 1;
}
.panel::-webkit-scrollbar { display: none; }
.panel-left {
  border-right: 1px solid rgba(255,255,255,0.08);
  max-width: 380px;
  min-width: 220px;
}
.panel-right {
  flex: 1;
}
.panel-label {
  font-size: 11px;
  font-weight: 800;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  color: var(--text-muted, rgba(255,255,255,0.4));
  margin-bottom: 4px;
}
.panel-label-row .panel-label {
  margin-bottom: 0;
}

/* Panel label row */
.panel-label-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  margin-bottom: 4px;
}
.player-avatar {
  width: 38px;
  height: 38px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  overflow: hidden;
}
.player-avatar.sm {
  width: 30px;
  height: 30px;
}
.avatar-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}
.avatar-emoji {
  font-size: 18px;
  line-height: 1;
}
.player-avatar.sm .avatar-emoji {
  font-size: 14px;
}

/* Guest section */
.guest-section {
  border-top: 1px solid rgba(255,255,255,0.08);
  padding-top: 16px;
  margin-top: 4px;
}
.guest-row {
  display: flex;
  align-items: center;
  gap: 8px;
}
.emoji-cycler {
  width: 44px;
  height: 44px;
  border-radius: 10px;
  border: 1px solid rgba(255,255,255,0.15);
  background: rgba(255,255,255,0.06);
  font-size: 22px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  transition: background 0.15s;
  position: relative;
  overflow: hidden;
}
.emoji-cycler:hover { background: rgba(255,255,255,0.12); }
.guest-input {
  flex: 1;
  background: rgba(255,255,255,0.06);
  border: 1px solid rgba(255,255,255,0.15);
  border-radius: 8px;
  color: #fff;
  font-size: 14px;
  font-weight: 600;
  padding: 10px 12px;
  outline: none;
  font-family: inherit;
  min-width: 0;
}
.guest-input::placeholder { color: rgba(255,255,255,0.3); }
.guest-input:focus { border-color: rgba(255,255,255,0.35); }
.guest-add-btn {
  font-size: 13px;
  padding: 8px 14px;
  flex-shrink: 0;
  position: relative;
  overflow: hidden;
}

/* Roster */
.roster {
  display: flex;
  flex-direction: column;
  gap: 6px;
  min-height: 80px;
}
.roster-empty {
  font-size: 14px;
  color: rgba(255,255,255,0.3);
  padding: 20px 0;
  text-align: center;
}
.roster-row {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 12px;
  border-radius: 10px;
  border: 1px solid rgba(255,255,255,0.08);
  background: rgba(255,255,255,0.04);
}
.seat-num {
  font-size: 12px;
  font-weight: 900;
  font-family: var(--font-display);
  color: rgba(255,255,255,0.4);
  width: 18px;
  text-align: center;
  flex-shrink: 0;
}
.roster-name {
  flex: 1;
  font-size: 14px;
  font-weight: 700;
  color: #fff;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.roster-actions {
  display: flex;
  align-items: center;
  gap: 4px;
}
.order-btn {
  width: 28px;
  height: 28px;
  border-radius: 6px;
  border: 1px solid rgba(255,255,255,0.12);
  background: rgba(255,255,255,0.05);
  color: rgba(255,255,255,0.6);
  font-size: 11px;
  cursor: pointer;
  transition: all 0.12s;
  position: relative;
  overflow: hidden;
}
.order-btn:disabled { opacity: 0.2; cursor: default; }
.order-btn:not(:disabled):hover { background: rgba(255,255,255,0.12); color: #fff; }
.remove-btn {
  width: 28px;
  height: 28px;
  border-radius: 6px;
  border: 1px solid rgba(255,80,80,0.2);
  background: rgba(255,80,80,0.05);
  color: rgba(255,100,100,0.7);
  font-size: 12px;
  cursor: pointer;
  transition: all 0.12s;
  position: relative;
  overflow: hidden;
}
.remove-btn:hover { background: rgba(255,80,80,0.15); color: #ff5555; border-color: rgba(255,80,80,0.4); }

/* Dice style */
.dice-style-section {
  border-top: 1px solid rgba(255,255,255,0.08);
  padding-top: 16px;
  margin-top: 4px;
}
.dice-style-grid {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
}
.dice-style-btn {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  padding: 10px 14px;
  border-radius: 10px;
  border: 2px solid rgba(255,255,255,0.1);
  background: rgba(255,255,255,0.04);
  cursor: pointer;
  transition: all 0.15s;
  position: relative;
  overflow: hidden;
}
.dice-style-btn.active {
  border-color: var(--pink, #ff2d78);
  background: rgba(255,45,120,0.1);
}
.dice-style-btn:hover:not(.active) {
  border-color: rgba(255,255,255,0.25);
  background: rgba(255,255,255,0.08);
}
.style-name {
  font-size: 11px;
  font-weight: 800;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: rgba(255,255,255,0.7);
}
.dice-style-btn.active .style-name { color: #fff; }

/* Die previews */
.die-preview {
  width: 28px;
  height: 28px;
  border-radius: 5px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 13px;
  font-weight: 900;
  font-family: var(--font-display);
}
.die-neon {
  background: #0d0d2e;
  border: 1.5px solid rgba(255,255,255,0.2);
  color: #00d4ff;
  text-shadow: 0 0 8px #00d4ff, 0 0 16px #00d4ff;
}
.die-casino {
  background: #f8f4e8;
  border: 1.5px solid #333;
  color: #1a1a1a;
}
.die-retro {
  background: #d4b896;
  border: 1.5px solid #7a4e2d;
  color: #2c1810;
}
.die-wood {
  background: linear-gradient(135deg, #8b5e3c, #6b4226);
  border: 1.5px solid #3d1f0a;
  color: #ffe4b5;
}

.chips-info {
  font-size: 12px;
  color: rgba(255,255,255,0.35);
  font-weight: 600;
  text-align: center;
  padding: 8px 0 4px;
}

/* Mobile: stack panels */
@media (max-width: 640px) {
  .setup-body {
    flex-direction: column;
    overflow: visible;
  }
  .panel {
    max-width: 100% !important;
    overflow: visible;
  }
  .panel-left {
    border-right: none;
    border-bottom: 1px solid rgba(255,255,255,0.08);
  }
  .setup-header {
    padding: 12px 14px;
  }
  .setup-title {
    font-size: 13px;
  }
  .header-back-btn, .header-start-btn {
    font-size: 12px;
    padding: 7px 10px;
  }
}
</style>
