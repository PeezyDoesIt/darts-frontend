<template>
  <div class="atc-wrap">

    <!-- Arcade focus banner: AIM FOR [N] -->
    <div class="atc-focus-banner" :style="{ '--pcolor': playerColor }">
      <div class="atc-focus-left">
        <span class="atc-focus-label">{{ anyOrder ? 'COMPLETED' : 'AIM FOR' }}</span>
        <span
          class="atc-focus-number display"
          :style="{ color: playerColor, filter: `drop-shadow(0 0 20px ${playerColor}90) drop-shadow(0 0 6px ${playerColor}60)` }"
        >{{ totalCompleted >= 20 ? '✓' : (anyOrder ? totalCompleted : currentTarget) }}</span>
      </div>
      <div class="atc-focus-right">
        <div class="atc-progress-bar-wrap">
          <div class="atc-progress-bar" :style="{ width: `${(totalCompleted / 20) * 100}%`, background: playerColor }" />
        </div>
        <span class="atc-prog-count">{{ totalCompleted }}/20</span>
        <!-- Mode toggle as slim pills -->
        <div class="atc-mode-row">
          <button class="atc-mode-btn" :class="{ active: displayMode === 'color' }" @click="displayMode = 'color'">Color In</button>
          <button class="atc-mode-btn" :class="{ active: displayMode === 'fade' }" @click="displayMode = 'fade'">Fade Out</button>
        </div>
      </div>
    </div>

    <!-- Main row: dartboard + optional numbers list -->
    <div class="atc-main-row">

      <!-- Dartboard -->
      <div class="atc-board-wrap">
        <svg viewBox="0 0 400 400" class="atc-board" xmlns="http://www.w3.org/2000/svg">
          <circle cx="200" cy="200" r="192" fill="#111" stroke="rgba(255,255,255,0.08)" stroke-width="1.5" />

          <path
            v-for="(num, idx) in BOARD_ORDER"
            :key="num"
            :d="wedgePath(idx)"
            :fill="sectionFill(num, idx)"
            :opacity="sectionOpacity(num)"
            :class="['atc-section', { 'atc-tappable': canTap(num), 'atc-current-target': !anyOrder && isNextTarget(num) }]"
            @click="onTap(num)"
          />

          <line
            v-for="idx in 20" :key="'div'+idx"
            :x1="200" :y1="200"
            :x2="lineEnd(idx - 1).x" :y2="lineEnd(idx - 1).y"
            stroke="rgba(0,0,0,0.6)" stroke-width="1"
          />

          <text
            v-for="(num, idx) in BOARD_ORDER"
            :key="'lbl'+num"
            :x="labelX(idx)"
            :y="labelY(idx)"
            class="atc-num-label"
            :fill="labelColor(num)"
            text-anchor="middle"
            dominant-baseline="central"
            :font-size="labelFontSize(num)"
            :font-weight="!anyOrder && isNextTarget(num) ? '900' : '700'"
          >{{ num }}</text>

          <path
            v-if="!anyOrder && currentTarget <= 20"
            :d="wedgePath(BOARD_ORDER.indexOf(currentTarget))"
            fill="none"
            :stroke="playerColor"
            stroke-width="3"
            opacity="0.9"
            class="atc-target-ring"
          />

          <circle cx="200" cy="200" r="24" fill="#1a1a1a" stroke="rgba(255,255,255,0.2)" stroke-width="2" />
          <circle cx="200" cy="200" r="10" fill="#c0392b" />
        </svg>
      </div>

      <!-- Numbers list panel (hidden by default) -->
      <div v-if="showNumList" class="atc-num-list">
        <div class="atc-list-label">1–20</div>
        <div class="atc-list-grid">
          <button
            v-for="n in 20" :key="n"
            class="atc-list-num"
            :class="{
              'atc-list-done': isCompleted(n),
              'atc-list-this-turn': isThisTurn(n),
              'atc-list-target': !anyOrder && isNextTarget(n),
              'atc-list-tappable': anyOrder && canTap(n)
            }"
            :style="isCompleted(n) ? { background: playerColor + '2a', borderColor: playerColor + '99' } : {}"
            @click="anyOrder ? onTap(n) : undefined"
          >
            <span :style="isThisTurn(n) ? { color: playerColor } : isCompleted(n) ? { color: playerColor + 'cc' } : {}">{{ n }}</span>
          </button>
        </div>
      </div>

    </div>

    <!-- Footer: timer left, NEXT right -->
    <div class="atc-footer">
      <div v-if="throwTimerDuration" class="atc-timer" @click="emit('toggleThrowPause')">
        <div class="submit-timer-fill"
          :class="{ warning: (throwTimeLeft ?? 0) <= 30, urgent: (throwTimeLeft ?? 0) <= 10, paused: throwPaused }"
          :style="{ width: `${((throwTimeLeft ?? 0) / throwTimerDuration) * 100}%`, transition: throwPaused ? 'none' : 'width 1s linear' }" />
        <span class="submit-timer-text" :class="{ urgent: (throwTimeLeft ?? 0) <= 10 }">
          {{ throwPaused ? 'PAUSED' : (throwTimeLeft ?? 0) + 's' }}
        </span>
      </div>
      <button v-ripple class="btn btn-gold atc-next-btn" @click="submit">NEXT</button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'

const props = defineProps<{
  completedCount: number
  playerColor: string
  anyOrder?: boolean
  completedNums?: number[]
  showNumList?: boolean
  throwTimeLeft?: number
  throwTimerDuration?: number
  throwPaused?: boolean
}>()

const emit = defineEmits<{
  submit: [delta: number, completedNums?: number[]]
  toggleThrowPause: []
}>()

const BOARD_ORDER = [20, 1, 18, 4, 13, 6, 10, 15, 2, 17, 3, 19, 7, 16, 8, 11, 14, 9, 12, 5]
const turnProgress = ref(0)          // sequential mode: count done this turn
const turnNewNums = ref<number[]>([]) // any-order mode: numbers marked this turn
const displayMode = ref<'color' | 'fade'>('color')

const prevCompletedSet = computed((): Set<number> => new Set(props.completedNums ?? []))

const totalCompleted = computed((): number => {
  if (props.anyOrder) {
    return Math.min(20, (props.completedNums?.length ?? 0) + turnNewNums.value.length)
  }
  return Math.min(20, props.completedCount + turnProgress.value)
})
const currentTarget = computed(() => totalCompleted.value + 1)

const CX = 200, CY = 200, R = 178, LABEL_R = 133

function toXY(cx: number, cy: number, r: number, deg: number) {
  const rad = (deg * Math.PI) / 180
  return { x: +(cx + r * Math.sin(rad)).toFixed(2), y: +(cy - r * Math.cos(rad)).toFixed(2) }
}
function wedgePath(idx: number): string {
  const startDeg = idx * 18 - 9
  const endDeg   = idx * 18 + 9
  const s = toXY(CX, CY, R, startDeg)
  const e = toXY(CX, CY, R, endDeg)
  return `M${CX},${CY} L${s.x},${s.y} A${R},${R} 0 0 1 ${e.x},${e.y} Z`
}
function labelX(idx: number) { return toXY(CX, CY, LABEL_R, idx * 18).x }
function labelY(idx: number) { return toXY(CX, CY, LABEL_R, idx * 18).y }
function lineEnd(idx: number) { return toXY(CX, CY, R, idx * 18 - 9) }
function labelFontSize(num: number) { return (!props.anyOrder && isNextTarget(num)) ? 20 : (num >= 10 ? 15 : 16) }

const DARK1 = '#181818', DARK2 = '#242424'

function isCompleted(num: number): boolean {
  if (props.anyOrder) {
    return prevCompletedSet.value.has(num) || turnNewNums.value.includes(num)
  }
  return num <= totalCompleted.value
}
function isThisTurn(num: number): boolean {
  if (props.anyOrder) return turnNewNums.value.includes(num)
  return num > props.completedCount && num <= totalCompleted.value
}
function isNextTarget(num: number): boolean {
  return num === currentTarget.value && currentTarget.value <= 20
}
function canTap(num: number): boolean {
  if (props.anyOrder) {
    // Can tap any uncompleted num, or undo a this-turn completion
    return !prevCompletedSet.value.has(num)
  }
  return isNextTarget(num) || (isThisTurn(num) && num === totalCompleted.value)
}

function sectionFill(num: number, idx: number): string {
  if (!props.anyOrder && isNextTarget(num)) return '#ffd700'
  if (displayMode.value === 'color') {
    if (isThisTurn(num)) return props.playerColor
    if (isCompleted(num)) return props.playerColor
  }
  return idx % 2 === 0 ? DARK1 : DARK2
}
function sectionOpacity(num: number): number {
  if (!props.anyOrder && isNextTarget(num)) return 1
  if (displayMode.value === 'color') {
    if (isThisTurn(num)) return 1
    if (isCompleted(num)) return 0.55
    return 1
  } else {
    if (isCompleted(num)) return 0.12
    return 1
  }
}
function labelColor(num: number): string {
  if (!props.anyOrder && isNextTarget(num)) return '#000'
  if (displayMode.value === 'color' && isCompleted(num)) return 'rgba(255,255,255,0.9)'
  if (displayMode.value === 'fade' && isCompleted(num)) return 'rgba(255,255,255,0.25)'
  return 'rgba(255,255,255,0.75)'
}

function onTap(num: number) {
  if (props.anyOrder) {
    if (prevCompletedSet.value.has(num)) return  // can't undo previous turns
    if (turnNewNums.value.includes(num)) {
      turnNewNums.value = turnNewNums.value.filter(n => n !== num)
    } else if (totalCompleted.value < 20) {
      turnNewNums.value = [...turnNewNums.value, num]
    }
    return
  }
  if (totalCompleted.value >= 20) return
  if (isNextTarget(num)) {
    turnProgress.value++
  } else if (isThisTurn(num) && num === totalCompleted.value) {
    turnProgress.value = Math.max(0, turnProgress.value - 1)
  }
}

function submit() {
  if (props.anyOrder) {
    const newNums = [...turnNewNums.value]
    const allNums = [...(props.completedNums ?? []), ...newNums]
    turnNewNums.value = []
    emit('submit', newNums.length, allNums)
  } else {
    const newlyCompleted = turnProgress.value
    turnProgress.value = 0
    emit('submit', newlyCompleted)
  }
}
</script>

<style scoped>
.atc-wrap {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  padding: 0;
  gap: 0;
}

/* ── Arcade focus banner ── */
.atc-focus-banner {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 10px 20px 12px;
  background: rgba(0,0,0,0.45);
  border-bottom: 1px solid rgba(255,255,255,0.07);
}
.atc-focus-left {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0;
  flex-shrink: 0;
  min-width: 72px;
}
.atc-focus-label {
  font-size: 9px;
  font-weight: 900;
  letter-spacing: 0.22em;
  text-transform: uppercase;
  color: rgba(255,255,255,0.3);
  line-height: 1;
}
.atc-focus-number {
  font-size: clamp(44px, 8dvh, 80px);
  font-weight: 900;
  line-height: 1;
  letter-spacing: -0.02em;
}
.atc-focus-right {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 6px;
  min-width: 0;
}

/* Progress bar */
.atc-progress-bar-wrap {
  width: 100%;
  height: 5px;
  background: rgba(255,255,255,0.08);
  border-radius: 3px;
  overflow: hidden;
}
.atc-progress-bar {
  height: 100%;
  border-radius: 3px;
  transition: width 0.3s ease;
}
.atc-prog-count {
  font-size: 11px;
  font-weight: 700;
  font-family: var(--font-display);
  color: rgba(255,255,255,0.35);
  letter-spacing: 0.06em;
}

/* Mode toggle: slim pills */
.atc-mode-row {
  display: flex;
  gap: 6px;
}
.atc-mode-btn {
  padding: 3px 10px;
  border-radius: 20px;
  border: 1px solid rgba(255,255,255,0.15);
  background: rgba(255,255,255,0.04);
  color: rgba(255,255,255,0.35);
  font-size: 11px;
  font-weight: 700;
  font-family: var(--font-display);
  letter-spacing: 0.04em;
  cursor: pointer;
  transition: all 0.15s;
}
.atc-mode-btn.active {
  border-color: var(--pink);
  color: var(--pink);
  background: rgba(255,45,120,0.1);
}

/* ── Main row: board + list ── */
.atc-main-row {
  flex: 1;
  display: flex;
  flex-direction: row;
  min-height: 0;
  overflow: hidden;
}

/* ── Dartboard ── */
.atc-board-wrap {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 0;
  min-width: 0;
  padding: 6px;
}
.atc-board {
  width: 100%;
  height: 100%;
  max-width: min(80vw, 62vh);
  max-height: min(80vw, 62vh);
  display: block;
  filter: drop-shadow(0 4px 24px rgba(0,0,0,0.7));
}

.atc-section { cursor: default; transition: opacity 0.25s, fill 0.2s; }
.atc-tappable { cursor: pointer; }
.atc-tappable:active { opacity: 0.75 !important; }

.atc-target-ring {
  animation: atc-target-pulse 0.8s ease-in-out infinite alternate;
  pointer-events: none;
}
@keyframes atc-target-pulse {
  from { opacity: 0.5; stroke-width: 2; }
  to   { opacity: 1;   stroke-width: 4; }
}

.atc-num-label {
  pointer-events: none;
  user-select: none;
  font-family: var(--font-display);
  letter-spacing: 0;
}

/* ── Numbers list panel ── */
.atc-num-list {
  flex-shrink: 0;
  width: 68px;
  display: flex;
  flex-direction: column;
  padding: 8px 6px;
  background: rgba(0,0,0,0.35);
  border-left: 1px solid rgba(255,255,255,0.07);
  gap: 4px;
  overflow-y: auto;
}
.atc-list-label {
  font-size: 9px;
  font-weight: 900;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  color: rgba(255,255,255,0.25);
  text-align: center;
  flex-shrink: 0;
}
.atc-list-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 3px;
  flex: 1;
  align-content: start;
}
.atc-list-num {
  aspect-ratio: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 6px;
  border: 1px solid rgba(255,255,255,0.08);
  background: rgba(255,255,255,0.03);
  font-size: 11px;
  font-weight: 700;
  font-family: var(--font-display);
  color: rgba(255,255,255,0.3);
  cursor: default;
  transition: all 0.2s;
  padding: 0;
}
.atc-list-num.atc-list-tappable {
  cursor: pointer;
}
.atc-list-num.atc-list-tappable:active {
  opacity: 0.7;
}
.atc-list-num.atc-list-done {
  color: rgba(255,255,255,0.7);
}
.atc-list-num.atc-list-this-turn {
  color: #fff;
  border-width: 2px;
}
.atc-list-num.atc-list-target {
  border-color: #ffd700;
  background: rgba(255,215,0,0.12);
  color: #ffd700;
}

/* ── Footer: small NEXT + big timer ── */
.atc-footer {
  flex-shrink: 0;
  display: flex;
  align-items: stretch;
  gap: 10px;
  padding: 10px 16px;
  padding-bottom: calc(10px + env(safe-area-inset-bottom));
  border-top: 1px solid rgba(255,255,255,0.07);
  background: rgba(0,0,0,0.3);
}

/* Small NEXT button — always on the right */
.atc-next-btn {
  flex: 0 0 80px;
  height: clamp(48px, 7dvh, 72px);
  font-size: clamp(14px, 2dvh, 20px);
  font-weight: 900;
  letter-spacing: 0.08em;
  border-radius: 10px;
  margin-left: auto;
}

/* Big timer */
.atc-timer {
  flex: 1;
  position: relative;
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 12px;
  background: rgba(255,255,255,0.04);
  border: 1px solid rgba(255,255,255,0.07);
  cursor: pointer;
  min-height: clamp(48px, 7dvh, 72px);
}

.submit-timer-fill {
  position: absolute; left: 0; top: 0; bottom: 0; pointer-events: none;
  background: #ff0000; transition: width 1s linear, background 0.3s; z-index: 0;
}
.submit-timer-fill.warning { background: #ff0000; }
.submit-timer-fill.urgent  { background: #ff3333; }
.submit-timer-fill.paused  { background: rgba(120,120,120,0.6); }
.submit-timer-text {
  position: relative; z-index: 1;
  font-size: clamp(28px, 5dvh, 56px);
  font-weight: 900; letter-spacing: 0.04em; color: #fff;
  font-family: var(--font-display);
}

/* ── Tablet ── */
@media (min-width: 768px) {
  .atc-focus-banner { padding: 12px 28px 14px; gap: 24px; }
  .atc-focus-number { font-size: clamp(56px, 9dvh, 96px); }
  .atc-board { max-width: min(72vw, 60vh); max-height: min(72vw, 60vh); }
  .atc-footer { padding: 12px 28px; padding-bottom: calc(12px + env(safe-area-inset-bottom)); }
  .atc-next-btn { flex: 0 0 100px; font-size: 18px; }
  .atc-num-list { width: 80px; }
}

/* ── Landscape / short ── */
@media (max-height: 500px) {
  .atc-focus-banner { padding: 6px 16px 8px; gap: 12px; }
  .atc-focus-number { font-size: clamp(36px, 7dvh, 52px); }
  .atc-footer { padding: 6px 12px; padding-bottom: calc(6px + env(safe-area-inset-bottom)); }
}
</style>
