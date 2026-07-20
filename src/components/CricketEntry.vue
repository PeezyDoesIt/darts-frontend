<template>
  <div class="cricket">

    <div class="cricket-board-scroll">
      <TransitionGroup tag="div" name="tile-vanish" class="cricket-board">
        <button
          v-for="target in CRICKET_TARGETS"
          :key="target"
          v-show="closedTargetDisplay !== 'hide' || !myClosed(target)"
          v-ripple
          class="board-tile"
          :class="{
            closed: myClosed(target) && closedTargetDisplay === 'show',
            'closed-fade': myClosed(target) && closedTargetDisplay === 'fade',
            'closed-strike': myClosed(target) && closedTargetDisplay === 'strike',
            active: (roundHits[target] ?? 0) > 0
          }"
          :disabled="myClosed(target)"
          @click="handleTileClick(target)"
        >
          <span class="target-label" :class="{ 'target-label-bull': target === 'bull' }" :style="{ color: targetColor, filter: `drop-shadow(0 0 12px ${targetColor})` }">{{ target === 'bull' ? '🎯' : target }}</span>

          <div class="pips-wrap">
            <span
              v-for="n in mtc" :key="n"
              class="pip"
              :class="{ existing: pipIsExisting(target, n), round: pipIsRound(target, n) }"
              @click.stop="handlePipClick(target, n)"
            >{{ myClosed(target) && closedTargetDisplay !== 'strike' ? '✕' : '' }}</span>
          </div>

          <span v-if="myClosed(target)" class="closed-badge">✓ CLOSED</span>
          <span v-else-if="(roundHits[target] ?? 0) > 0" class="hit-badge">+{{ roundHits[target] }}</span>
          <span v-else class="hit-badge invisible">+0</span>
        </button>
      </TransitionGroup>
    </div>

<div class="submit-row">
      <!-- Left area: timer fill is constrained here, never reaches the button -->
      <div class="submit-left" @click="throwTimerDuration ? emit('toggleThrowPause') : null">
        <div v-if="throwTimerDuration" class="submit-timer-fill"
          :class="{ warning: (throwTimeLeft ?? 0) <= 30, urgent: (throwTimeLeft ?? 0) <= 10, paused: throwPaused }"
          :style="{ width: `${((throwTimeLeft ?? 0) / throwTimerDuration) * 100}%`, transition: throwPaused ? 'none' : 'width 1s linear' }" />
        <span v-if="throwTimerDuration" class="submit-timer-text" :class="{ urgent: (throwTimeLeft ?? 0) <= 10 }">
          {{ throwPaused ? 'PAUSED' : (throwTimeLeft ?? 0) + 's' }}
        </span>
        <span v-else-if="totalHitsThisRound > 0" class="hits-text">
          {{ totalHitsThisRound }} hit{{ totalHitsThisRound !== 1 ? 's' : '' }} this round
        </span>
        <span v-else class="round-label-text" :style="{ color: targetColor }">Round {{ round }}</span>
      </div>
      <button v-ripple class="btn btn-gold submit-inline-btn" :disabled="submitted" @click="submit">
        NEXT
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { CRICKET_TARGETS, PLAYER_THEMES, type CricketTarget, type PlayerScore } from '../types/index'
import { playShotgun, playThemedBuzzer, playThemedBullseye } from '../composables/useSounds'
import { speak, speakOhBaby } from '../composables/useSpeech'
import { useSettingsStore } from '../stores/settings'

const settingsStore = useSettingsStore()

const props = defineProps<{
  playerId: string
  scores: Record<string, PlayerScore>
  isCutThroat: boolean
  round: number
  closedTargetDisplay?: 'show' | 'hide' | 'fade' | 'strike'
  avatarUrl?: string | null
  playerColor?: string
  playerBackground?: string | null
  targetLabelColor?: string | null
  marksToClose?: number
  throwTimeLeft?: number
  throwTimerDuration?: number
  throwPaused?: boolean
}>()

const WHITE_LABEL_THEMES = new Set<string | null>(
  PLAYER_THEMES
    .filter(t => ['Magma', 'Steel', 'Obsidian', 'Blood', 'Oil Slick', 'Midnight'].includes(t.label))
    .map(t => t.value as string | null)
)

function complementaryColor(hex: string): string {
  if (!hex.startsWith('#') || hex.length < 7) return hex
  const r = parseInt(hex.slice(1,3), 16) / 255
  const g = parseInt(hex.slice(3,5), 16) / 255
  const b = parseInt(hex.slice(5,7), 16) / 255
  const max = Math.max(r,g,b), min = Math.min(r,g,b)
  let h = 0, s = 0
  const l = (max + min) / 2
  if (max !== min) {
    const d = max - min
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min)
    if (max === r) h = ((g - b) / d + (g < b ? 6 : 0)) / 6
    else if (max === g) h = ((b - r) / d + 2) / 6
    else h = ((r - g) / d + 4) / 6
  }
  h = (h + 0.5) % 1
  return `hsl(${Math.round(h * 360)}, ${Math.round(s * 100)}%, ${Math.round(l * 100)}%)`
}

const targetColor = computed(() => {
  if (props.targetLabelColor) return props.targetLabelColor
  if (props.playerBackground && WHITE_LABEL_THEMES.has(props.playerBackground)) return '#ffffff'
  return props.playerColor ? complementaryColor(props.playerColor) : 'var(--pink)'
})

const emit = defineEmits<{
  submit: [hits: Record<CricketTarget, number>]
  toggleThrowPause: []
}>()

const roundHits = ref<Partial<Record<CricketTarget, number>>>({})
const submitted = ref(false)

const myScore = computed(() => {
  const s = props.scores[props.playerId]
  return s?.kind === 'cricket' ? s : null
})
const existingMarks = computed((): Record<CricketTarget, number> =>
  myScore.value?.data.marks ?? { 20: 0, 19: 0, 18: 0, 17: 0, 16: 0, 15: 0, bull: 0 }
)
const totalHitsThisRound = computed(() =>
  Object.values(roundHits.value).reduce((a, b) => a + (b ?? 0), 0)
)

const mtc = computed(() => props.marksToClose ?? 3)
function myClosed(target: CricketTarget) { return (existingMarks.value[target] ?? 0) >= mtc.value }
function pipIsExisting(target: CricketTarget, n: number) { return (existingMarks.value[target] ?? 0) >= n }
function pipIsRound(target: CricketTarget, n: number) {
  const existing = existingMarks.value[target] ?? 0
  return existing < n && existing + (roundHits.value[target] ?? 0) >= n
}
function playBullSound() {
  const s = settingsStore.bullseyeSound
  // TTS options always take priority
  if (s === 'tts-bullseye') { speak('Bullseye!'); return }
  if (s === 'tts-oh-baby') { speakOhBaby(); return }
  if (s === 'tts-oh-yeah') { speak('Oh yeah, right in the bull motherfucker'); return }
  // Non-default theme: play themed bullseye regardless of bullseyeSound setting
  const theme = settingsStore.soundTheme
  if (theme !== 'default') { playThemedBullseye(theme); return }
  // Default theme: respect bullseyeSound setting
  if (s === 'buzzer') { playThemedBuzzer('default'); return }
  playShotgun()
}

function handleTileClick(target: CricketTarget) {
  if (myClosed(target)) return
  const existing = existingMarks.value[target] ?? 0
  const max = mtc.value - existing
  const current = roundHits.value[target] ?? 0
  const next = current >= max ? 0 : current + 1
  roundHits.value = { ...roundHits.value, [target]: next }
  if (target === 'bull' && next > current) playBullSound()
}

// Tapping pip N directly sets the hit count so that pips 1..N are all lit.
// Tapping the already-selected pip resets to 0.
function handlePipClick(target: CricketTarget, n: number) {
  if (myClosed(target)) return
  const existing = existingMarks.value[target] ?? 0
  if (n <= existing) return // already a committed mark, can't change it
  const hitsNeeded = n - existing
  const current = roundHits.value[target] ?? 0
  const next = current === hitsNeeded ? 0 : hitsNeeded
  roundHits.value = { ...roundHits.value, [target]: next }
  if (target === 'bull' && next > current) playBullSound()
}
function submit() {
  if (submitted.value) return
  submitted.value = true
  const hits: Record<CricketTarget, number> = {} as Record<CricketTarget, number>
  for (const t of CRICKET_TARGETS) hits[t] = roundHits.value[t] ?? 0
  emit('submit', hits)
  roundHits.value = {}
}

defineExpose({ submit, submitted })
</script>

<style scoped>
.cricket { flex: 1; display: flex; flex-direction: column; overflow: hidden; min-height: 0; position: relative; }

.cricket-board-scroll { flex: 1; min-height: 0; overflow-y: auto; position: relative; z-index: 1; }

.cricket-board {
  display: flex;
  flex-direction: column;
  padding: 6px 16px;
  gap: 10px;
  min-height: 100%;
}

/* Hide-closed-targets animation */
.tile-vanish-leave-active {
  transition: opacity 0.4s ease, transform 0.4s ease, flex 0.4s ease, min-height 0.4s ease, padding 0.4s ease, margin 0.4s ease;
  overflow: hidden;
}
.tile-vanish-leave-to {
  opacity: 0;
  transform: scale(0.7);
  flex: 0 !important;
  min-height: 0 !important;
  padding-top: 0 !important;
  padding-bottom: 0 !important;
  margin: 0 !important;
}

.board-tile {
  display: flex; align-items: stretch; width: 100%; padding: 8px 24px; gap: 0;
  flex: 1; min-height: 48px;
  background: rgba(0,0,0,0.72); border: 2px solid rgba(255,255,255,0.35); border-radius: 8px;
  cursor: pointer; transition: all 0.15s; -webkit-tap-highlight-color: transparent; text-align: left;
  position: relative; overflow: hidden;
}
.board-tile:not(:disabled):active { transform: scale(0.98); }
.board-tile.closed { cursor: default; }
.board-tile.closed .pip.existing { background: #cc0000; border-color: #cc0000; box-shadow: none; color: #000; }
.board-tile.closed-fade { opacity: 0.35; cursor: default; }
.board-tile.closed-strike { opacity: 0.45; filter: grayscale(0.7); cursor: default; }
.board-tile.closed-strike::after {
  content: ''; position: absolute; inset: 0; pointer-events: none; z-index: 2;
  background: linear-gradient(transparent 46%, rgba(255,255,255,0.45) 46%, rgba(255,255,255,0.45) 54%, transparent 54%);
}

.target-label { font-size: clamp(100px, 17dvh, 190px); font-family: var(--font-display); letter-spacing: 0.05em; width: clamp(130px, 18dvh, 210px); flex-shrink: 0; display: flex; align-items: center; overflow: hidden; }
.target-label-bull { font-size: clamp(130px, 22dvh, 240px); }
.pips-wrap { display: flex; align-items: stretch; gap: 20px; flex: 1; padding: 14px 0; margin-left: 24px; }
.pip { flex: 1; min-width: 0; border-radius: 10px; border: 3px solid rgba(255,255,255,0.35); background: rgba(255,255,255,0.08); display: flex; align-items: center; justify-content: center; transition: all 0.2s; font-size: clamp(28px, 5dvh, 60px); font-weight: 900; font-family: var(--font-display); color: rgba(0,0,0,0.6); line-height: 1; cursor: pointer; -webkit-tap-highlight-color: transparent; }
.pip.existing { background: var(--pink); border-color: var(--pink); box-shadow: 0 0 20px rgba(255,45,120,1), 0 0 40px rgba(255,45,120,0.5); }
.pip.round { background: var(--pink); border-color: var(--pink); box-shadow: 0 0 16px rgba(255,45,120,0.6); }

.closed-badge { font-size: 12px; font-weight: 800; letter-spacing: 0.1em; color: var(--pink); text-transform: uppercase; font-family: var(--font-display); opacity: 0.7; width: 80px; text-align: right; flex-shrink: 0; align-self: center; }
.hit-badge { font-size: 22px; font-weight: 900; font-family: var(--font-display); color: var(--pink); width: 80px; text-align: right; flex-shrink: 0; filter: drop-shadow(0 0 8px rgba(255,45,120,0.6)); align-self: center; }
.hit-badge.invisible { opacity: 0; }

.board-avatar-bg {
  position: absolute; inset: 0; display: flex; align-items: center; justify-content: center;
  pointer-events: none; overflow: hidden; z-index: 0;
}
.board-avatar-bg img { width: 90%; height: 95%; object-fit: contain; object-position: center; opacity: 0.7; }
.board-avatar-bg span { font-size: 65dvh; line-height: 1; opacity: 0.7; filter: drop-shadow(0 0 24px rgba(0,0,0,0.4)); }

.corner-avatar {
  position: absolute; bottom: 80px; right: 16px; z-index: 2;
  font-size: clamp(56px, 9dvh, 90px); line-height: 1;
  opacity: 0.85; pointer-events: none;
}
.corner-avatar img { width: clamp(56px, 9dvh, 90px); height: clamp(56px, 9dvh, 90px); object-fit: cover; border-radius: 8px; }

.submit-row {
  display: flex; align-items: center; justify-content: space-between;
  min-height: 72px;
  padding: 12px 20px; padding-bottom: calc(12px + env(safe-area-inset-bottom));
  border-top: 1px solid rgba(255,255,255,0.08); background: rgba(255,255,255,0.03);
  backdrop-filter: blur(16px); -webkit-backdrop-filter: blur(16px); flex-shrink: 0; gap: 16px;
  position: relative; z-index: 1;
}
.hits-text { color: var(--pink); font-weight: 700; font-size: 15px; }
.muted { color: var(--text-muted); font-weight: 700; font-size: 15px; }
.round-label-text { font-weight: 900; font-size: 20px; letter-spacing: 0.06em; text-shadow: 0 0 12px currentColor; }
.submit-inline-btn {
  flex-shrink: 0;
  height: 48px;
  padding: 0 28px;
  font-size: clamp(26px, 4dvh, 38px); font-weight: 900; font-family: var(--font-display); text-shadow: 0 0 18px rgba(255,255,255,0.7), 0 1px 0 rgba(0,0,0,0.4);
  letter-spacing: 0.22em; text-transform: uppercase; border-radius: 8px; cursor: pointer;
  position: relative; overflow: hidden;
  background: #dc2626 !important; color: #fff !important; border: none !important;
  box-shadow: 0 2px 12px rgba(220,38,38,0.4);
}
.submit-inline-btn:disabled { opacity: 0.4; }
.submit-left { flex: 1; position: relative; overflow: hidden; display: flex; align-items: center; padding: 0 4px; min-height: 100%; cursor: pointer; }
.submit-timer-fill {
  position: absolute; left: 0; top: 0; bottom: 0; pointer-events: none;
  background: #ff0000; transition: width 1s linear, background 0.3s; z-index: 0;
}
.submit-timer-fill.warning { background: #ff0000; }
.submit-timer-fill.urgent { background: #ff3333; }
.submit-timer-fill.paused { background: rgba(120,120,120,0.6); }
.submit-timer-text {
  position: relative; z-index: 1; font-size: clamp(18px, 2.8dvh, 26px); font-weight: 900;
  letter-spacing: 0.15em; text-transform: uppercase; color: rgba(255,255,255,0.9); font-family: var(--font-display);
}
.submit-timer-text.urgent { color: #fff; }

@media (orientation: landscape) and (max-height: 900px) {
  .cricket-board-scroll { overflow: hidden; display: flex; flex-direction: column; }
  .cricket-board { flex: 1; height: 100%; min-height: 0; padding: 3px 12px; gap: 3px; }
  .board-tile { min-height: 0; padding: 2px 14px; }
  .target-label { font-size: clamp(28px, 6dvh, 60px); width: clamp(70px, 10dvh, 120px); }
  .target-label-bull { font-size: clamp(36px, 8dvh, 78px); }
  .pips-wrap { gap: 8px; padding: 6px 0; margin-left: 10px; }
  .pip { border-radius: 6px; border-width: 2px; }
  .hit-badge { font-size: 16px; width: 52px; }
  .closed-badge { width: 52px; font-size: 9px; }
  .submit-row { min-height: 52px; padding: 6px 16px; padding-bottom: calc(6px + env(safe-area-inset-bottom)); }
  .submit-inline-btn { height: 36px; padding: 0 16px; font-size: 18px; }
}

@media (max-width: 768px) {
  .cricket-board { padding: 5px 8px; gap: 5px; }
  .board-tile { padding: 6px 12px; min-height: 56px; }
  .target-label { font-size: clamp(60px, 11dvh, 100px); width: clamp(90px, 12dvh, 130px); }
  .target-label-bull { font-size: clamp(78px, 14dvh, 130px); }
  .pips-wrap { gap: 16px; margin-left: 16px; }
  .hit-badge { font-size: 16px; width: 52px; }
  .closed-badge { width: 52px; font-size: 9px; }
  .submit-row { min-height: 64px; padding: 10px 12px; padding-bottom: calc(10px + env(safe-area-inset-bottom)); }
  .submit-inline-btn { height: 44px; padding: 0 20px; font-size: 22px; }
}

@media (orientation: portrait) {
  .cricket-board-scroll { overflow: hidden; display: flex; flex-direction: column; }
  .cricket-board { flex: 1; height: 100%; min-height: 0; padding: 4px 8px; gap: 4px; }
  .board-tile { min-height: 0; padding: 4px 12px; }
  .target-label { font-size: clamp(44px, 8.5dvh, 90px); width: clamp(76px, 11dvh, 125px); }
  .target-label-bull { font-size: clamp(57px, 11dvh, 117px); }
  .pips-wrap { gap: 12px; padding: 6px 0; margin-left: 16px; }
}
</style>
