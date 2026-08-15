<template>
  <div class="cricket">

    <div class="cricket-board-scroll">
      <TransitionGroup tag="div" name="tile-vanish" class="cricket-board">
        <button
          v-for="target in effectiveTargets"
          :key="String(target)"
          v-show="closedTargetDisplay !== 'hide' || !myClosed(target)"
          v-ripple
          class="board-tile"
          :class="{
            closed: myClosed(target) && closedTargetDisplay === 'show',
            active: (roundHits[String(target)] ?? 0) > 0
          }"
          :disabled="myClosed(target)"
          @click="handleTileClick(target)"
        >
          <span class="target-label" :class="{ 'target-label-bull': target === 'bull' }" :style="{ color: targetColor, filter: `drop-shadow(0 0 6px ${targetColor}80)` }">{{ target === 'bull' ? '🎯' : target }}</span>

          <div class="pips-wrap" :class="pipStyle ? 'pip-' + pipStyle : null" :style="{ '--pip': pipColor || 'var(--pink)' }">
            <span
              v-for="n in mtc" :key="n"
              class="pip"
              :class="{ existing: pipIsExisting(target, n), round: pipIsRound(target, n) }"
              @click.stop="handlePipClick(target, n)"
            >{{ myClosed(target) ? '✕' : '' }}</span>
          </div>

          <span v-if="myClosed(target)" class="closed-badge">✓ CLOSED</span>
          <span v-else-if="(roundHits[String(target)] ?? 0) > 0" class="hit-badge">+{{ roundHits[String(target)] }}</span>
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
          {{ showPauseLocked ? 'LOCKED' : throwPaused ? 'PAUSED' : (throwTimeLeft ?? 0) + 's' }}
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
import { CRICKET_TARGETS, type PlayerScore, type PipStyle } from '../types/index'
import { resolveTargetColor } from '../lib/targetColor'
import { playShotgun, playThemedBuzzer, playThemedBullseye } from '../composables/useSounds'
import { speak, speakOhBaby } from '../composables/useSpeech'
import { useSettingsStore } from '../stores/settings'

const settingsStore = useSettingsStore()

const props = defineProps<{
  playerId: string
  scores: Record<string, PlayerScore>
  round: number
  closedTargetDisplay?: 'show' | 'hide'
  avatarUrl?: string | null
  playerColor?: string
  playerBackground?: string | null
  targetLabelColor?: string | null
  /** Colour of a filled pip. Falls back to the app pink, which is what they always were. */
  pipColor?: string | null
  /** Shape/finish of the marks. Undefined or null renders them exactly as the app always has. */
  pipStyle?: PipStyle | null
  marksToClose?: number
  throwTimeLeft?: number
  throwTimerDuration?: number
  throwPaused?: boolean
  /** Set for a moment when the timer is tapped while pausing is locked. */
  showPauseLocked?: boolean
  wildTargets?: number[]
  wildPlayerMarks?: Record<string, number>
}>()

const targetColor = computed(() =>
  resolveTargetColor(props.targetLabelColor, props.playerColor, props.playerBackground))

const emit = defineEmits<{
  submit: [hits: Record<string, number>]
  toggleThrowPause: []
}>()

type EffTarget = number | 'bull'
const roundHits = ref<Record<string, number>>({})
const submitted = ref(false)

const myScore = computed(() => {
  const s = props.scores[props.playerId]
  return s?.kind === 'cricket' ? s : null
})
const effectiveTargets = computed((): readonly EffTarget[] => {
  if (props.wildTargets) return [...props.wildTargets, 'bull']
  return CRICKET_TARGETS as readonly EffTarget[]
})
const existingMarks = computed((): Record<string, number> => {
  if (props.wildPlayerMarks) return props.wildPlayerMarks
  return myScore.value?.data.marks ?? { 20: 0, 19: 0, 18: 0, 17: 0, 16: 0, 15: 0, bull: 0 }
})
const totalHitsThisRound = computed(() =>
  Object.values(roundHits.value).reduce((a, b) => a + (b ?? 0), 0)
)

const mtc = computed(() => props.marksToClose ?? 3)
function myClosed(target: EffTarget) { return (existingMarks.value[String(target)] ?? 0) >= mtc.value }
function pipIsExisting(target: EffTarget, n: number) { return (existingMarks.value[String(target)] ?? 0) >= n }
function pipIsRound(target: EffTarget, n: number) {
  const existing = existingMarks.value[String(target)] ?? 0
  return existing < n && existing + (roundHits.value[String(target)] ?? 0) >= n
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

function handleTileClick(target: EffTarget) {
  if (myClosed(target)) return
  const key = String(target)
  const existing = existingMarks.value[key] ?? 0
  const max = mtc.value - existing
  const current = roundHits.value[key] ?? 0
  const next = current >= max ? 0 : current + 1
  roundHits.value = { ...roundHits.value, [key]: next }
  if (target === 'bull' && next > current) playBullSound()
}

// Tapping pip N directly sets the hit count so that pips 1..N are all lit.
// Tapping the already-selected pip resets to 0.
function handlePipClick(target: EffTarget, n: number) {
  if (myClosed(target)) return
  const key = String(target)
  const existing = existingMarks.value[key] ?? 0
  if (n <= existing) return // already a committed mark, can't change it
  const hitsNeeded = n - existing
  const current = roundHits.value[key] ?? 0
  const next = current === hitsNeeded ? 0 : hitsNeeded
  roundHits.value = { ...roundHits.value, [key]: next }
  if (target === 'bull' && next > current) playBullSound()
}
function submit() {
  if (submitted.value) return
  submitted.value = true
  const hits: Record<string, number> = {}
  for (const t of effectiveTargets.value) hits[String(t)] = roundHits.value[String(t)] ?? 0
  emit('submit', hits)
  roundHits.value = {}
}

defineExpose({ submit, submitted })
</script>

<style scoped>
.cricket { flex: 1; display: flex; flex-direction: column; overflow: hidden; min-height: 0; position: relative; }

.cricket-board-scroll { flex: 1; min-height: 0; overflow-y: auto; -webkit-overflow-scrolling: touch; overscroll-behavior: contain; position: relative; z-index: 1; }

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
  flex: 1; min-height: 48px; position: relative;
  background: rgba(0,0,0,0.72); border: 2px solid rgba(255,255,255,0.35); border-radius: 8px;
  cursor: pointer; transition: all 0.15s; -webkit-tap-highlight-color: transparent; text-align: left;
  position: relative; overflow: hidden;
}
.board-tile:not(:disabled):active { transform: scale(0.98); }
.board-tile.closed { cursor: default; }
.board-tile.closed .pip.existing { background: #cc0000; border-color: #cc0000; box-shadow: none; color: #000; }

.target-label { font-size: clamp(120px, 20dvh, 220px); font-family: var(--font-display); letter-spacing: 0.05em; width: clamp(150px, 20dvh, 240px); flex-shrink: 0; display: flex; align-items: center; overflow: hidden; }
.target-label-bull { font-size: clamp(150px, 26dvh, 280px); }
.pips-wrap { display: flex; align-items: stretch; gap: 20px; flex: 1; padding: 14px 0; margin-left: 24px; }
.pip { flex: 1; min-width: 0; border-radius: 10px; border: 3px solid rgba(255,255,255,0.35); background: rgba(255,255,255,0.08); display: flex; align-items: center; justify-content: center; transition: all 0.2s; font-size: clamp(28px, 5dvh, 60px); font-weight: 900; font-family: var(--font-display); color: rgba(0,0,0,0.6); line-height: 1; cursor: pointer; -webkit-tap-highlight-color: transparent; }
.pip.existing { background: var(--pip); border-color: var(--pip); box-shadow: 0 0 20px color-mix(in srgb, var(--pip) 85%, transparent), 0 0 40px color-mix(in srgb, var(--pip) 45%, transparent); }
.pip.round { background: var(--pip); border-color: var(--pip); box-shadow: 0 0 16px color-mix(in srgb, var(--pip) 60%, transparent); }

/* ── Per-player mark styles ───────────────────────────────────────────────
   No class at all is the default above, untouched. Each style below only
   restyles the pip; nothing here changes layout, hit area or the pip count,
   so a style is purely cosmetic and safe to switch mid-game.
   'slab' is the default look, named — so it needs no rules of its own.
   ─────────────────────────────────────────────────────────────────────── */

/* Chalk — matte, faintly askew, no glow at all. */
.pips-wrap.pip-chalk .pip { border-radius: 4px; border-width: 2px; border-color: rgba(255,255,255,0.28); }
.pips-wrap.pip-chalk .pip:nth-child(odd) { transform: rotate(-1.2deg); }
.pips-wrap.pip-chalk .pip:nth-child(even) { transform: rotate(0.9deg); }
.pips-wrap.pip-chalk .pip.existing,
.pips-wrap.pip-chalk .pip.round {
  background: color-mix(in srgb, var(--pip) 80%, #ffffff);
  border-color: color-mix(in srgb, var(--pip) 55%, #ffffff);
  box-shadow: inset 0 0 14px rgba(255,255,255,0.4);
  filter: saturate(0.78);
}

/* Spray — irregular blob, soft bloom, edges bleeding out. */
.pips-wrap.pip-spray .pip { border-radius: 46% 54% 51% 49% / 52% 47% 53% 48%; border-color: rgba(255,255,255,0.2); }
.pips-wrap.pip-spray .pip.existing,
.pips-wrap.pip-spray .pip.round {
  background: radial-gradient(circle at 44% 40%, color-mix(in srgb, var(--pip) 92%, #ffffff) 0%, var(--pip) 55%, color-mix(in srgb, var(--pip) 50%, transparent) 100%);
  border-color: transparent;
  box-shadow: 0 0 26px color-mix(in srgb, var(--pip) 50%, transparent);
  filter: blur(0.6px) saturate(1.15);
}

/* Neon — hollow tube, lit from the inside. */
.pips-wrap.pip-neon .pip { border-radius: 999px; border-width: 3px; background: transparent; }
.pips-wrap.pip-neon .pip.existing,
.pips-wrap.pip-neon .pip.round {
  background: color-mix(in srgb, var(--pip) 12%, transparent);
  border-color: color-mix(in srgb, var(--pip) 88%, #ffffff);
  box-shadow: 0 0 10px color-mix(in srgb, var(--pip) 88%, transparent),
              0 0 30px color-mix(in srgb, var(--pip) 55%, transparent),
              inset 0 0 12px color-mix(in srgb, var(--pip) 65%, transparent);
}

/* Steel — bevelled plate, hard corners, top-lit. */
.pips-wrap.pip-steel .pip {
  border-radius: 3px; border-width: 2px; border-color: rgba(255,255,255,0.3);
  background: linear-gradient(160deg, rgba(255,255,255,0.14) 0%, rgba(255,255,255,0.04) 50%, rgba(0,0,0,0.25) 100%);
}
.pips-wrap.pip-steel .pip.existing,
.pips-wrap.pip-steel .pip.round {
  background: linear-gradient(160deg,
    color-mix(in srgb, var(--pip) 68%, #ffffff) 0%,
    var(--pip) 42%,
    color-mix(in srgb, var(--pip) 68%, #000000) 100%);
  border-color: color-mix(in srgb, var(--pip) 55%, #ffffff);
  box-shadow: inset 0 1px 0 rgba(255,255,255,0.55),
              inset 0 -2px 4px rgba(0,0,0,0.4),
              0 0 14px color-mix(in srgb, var(--pip) 32%, transparent);
}

/* A closed target stays solid red in every style. This repeats the rule
   above deliberately: the style rules carry more class weight than the
   original .board-tile.closed .pip.existing, so it has to be restated
   after them or a closed number would keep the player's colour. */
.board-tile.closed .pips-wrap .pip.existing,
.board-tile.closed .pips-wrap .pip.round {
  background: #cc0000; border-color: #cc0000; box-shadow: none; color: #000;
  filter: none; transform: none;
}

.closed-badge { position: absolute; right: 20px; top: 50%; transform: translateY(-50%); font-size: 12px; font-weight: 800; letter-spacing: 0.1em; color: var(--pink); text-transform: uppercase; font-family: var(--font-display); opacity: 0.7; z-index: 2; }
.hit-badge { position: absolute; right: 20px; top: 50%; transform: translateY(-50%); font-size: 22px; font-weight: 900; font-family: var(--font-display); color: var(--pink); filter: drop-shadow(0 0 8px rgba(255,45,120,0.6)); z-index: 2; }
.hit-badge.invisible { opacity: 0; pointer-events: none; }

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
  padding: 8px 20px; padding-bottom: calc(8px + env(safe-area-inset-bottom));
  border-top: 1px solid rgba(255,255,255,0.08); background: rgba(255,255,255,0.03);
  backdrop-filter: blur(16px); -webkit-backdrop-filter: blur(16px); flex-shrink: 0; gap: 16px;
  position: relative; z-index: 1;
}
.hits-text { color: var(--pink); font-weight: 700; font-size: 15px; }
.muted { color: var(--text-muted); font-weight: 700; font-size: 15px; }
.round-label-text { font-weight: 900; font-size: 20px; letter-spacing: 0.06em; text-shadow: 0 0 12px currentColor; }
.submit-inline-btn {
  flex-shrink: 0;
  height: 54px;
  padding: 0 36px;
  font-size: clamp(42px, 6.2dvh, 62px); font-weight: 900; font-family: var(--font-display);
  letter-spacing: 0.08em; text-transform: uppercase; border-radius: 8px; cursor: pointer;
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
  position: relative; z-index: 1; font-size: clamp(46px, 7dvh, 80px); font-weight: 900;
  letter-spacing: 0.04em; text-transform: uppercase; color: #fff; font-family: var(--font-display);
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
  .hit-badge { font-size: 16px; }
  .closed-badge { font-size: 9px; }
  .submit-row { min-height: 64px; padding: 4px 16px; padding-bottom: calc(4px + env(safe-area-inset-bottom)); }
  .submit-inline-btn { height: 48px; padding: 0 20px; font-size: 26px; }
}

@media (max-width: 768px) {
  .cricket-board { padding: 5px 8px; gap: 5px; }
  .board-tile { padding: 6px 12px; min-height: 56px; }
  .target-label { font-size: clamp(70px, 13dvh, 120px); width: clamp(100px, 14dvh, 150px); }
  .target-label-bull { font-size: clamp(90px, 17dvh, 155px); }
  .pips-wrap { gap: 16px; margin-left: 16px; }
  .hit-badge { font-size: 16px; }
  .closed-badge { font-size: 9px; }
  .submit-row { min-height: 74px; padding: 8px 12px; padding-bottom: calc(8px + env(safe-area-inset-bottom)); }
  .submit-inline-btn { height: 58px; padding: 0 28px; font-size: 32px; }
}

@media (orientation: portrait) {
  .cricket-board-scroll { overflow: hidden; display: flex; flex-direction: column; }
  .cricket-board { flex: 1; height: 100%; min-height: 0; padding: 4px 8px; gap: 4px; }
  .board-tile { min-height: 0; padding: 4px 12px; }
  .target-label { font-size: clamp(52px, 10dvh, 108px); width: clamp(86px, 12dvh, 140px); }
  .target-label-bull { font-size: clamp(68px, 13dvh, 140px); }
  .pips-wrap { gap: 12px; padding: 6px 0; margin-left: 16px; }
}
</style>
