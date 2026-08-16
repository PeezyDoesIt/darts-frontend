<template>
  <div class="numpad-wrap">

    <div class="remaining-display">
      <span class="remaining-label">Remaining</span>
      <span class="remaining-val" :class="{ bust: isBust }">{{ isBust ? remaining : remaining - dartTotal }}</span>
    </div>

    <!-- Three dart slots -->
    <div class="dart-slots">
      <div
        v-for="i in 3" :key="i"
        class="dart-slot"
        :class="{ active: activeDart === i - 1, filled: darts[i - 1] !== '' }"
        @click="activeDart = i - 1"
      >
        <span class="dart-slot-label">Dart {{ i }}</span>
        <div class="dart-slot-val-wrap">
          <span class="dart-slot-val">{{ dartValues[i - 1] !== 0 ? dartValues[i - 1] : (darts[i - 1] !== '' ? dartValues[i-1] : '—') }}</span>
          <span v-if="multipliers[i - 1] !== 1 && darts[i - 1] !== ''" class="mult-badge">×{{ multipliers[i - 1] }}</span>
        </div>
      </div>
    </div>

    <!-- Running total -->
    <div class="total-row">
      <span class="total-label">Total this turn</span>
      <span class="total-val" :class="{ bust: isBust }">{{ dartTotal }}</span>
      <span v-if="isBust" class="bust-tag">BUST</span>
    </div>

    <div class="numpad">
      <button v-for="n in [1,2,3,4,5,6,7,8,9]" :key="n" v-ripple class="key" @click="press(n)">{{ n }}</button>
      <button v-ripple class="key" @click="press(0)">0</button>
      <button v-ripple class="key double" @click="backspace">⌫</button>
    </div>

    <!-- Multiplier row -->
    <div class="mult-row">
      <button
        v-ripple class="mult-btn"
        :class="{ active: multipliers[activeDart] === 2, disabled: !canMultiply(2) }"
        :disabled="!canMultiply(2) && multipliers[activeDart] !== 2"
        @click="applyMultiplier(2)"
      >DOUBLE</button>
      <button
        v-ripple class="mult-btn"
        :class="{ active: multipliers[activeDart] === 3, disabled: !canMultiply(3) }"
        :disabled="!canMultiply(3) && multipliers[activeDart] !== 3"
        @click="applyMultiplier(3)"
      >TRIPLE</button>
    </div>

    <div class="numpad-footer">
      <ThrowTimer
        :timeLeft="throwTimeLeft" :duration="throwTimerDuration"
        :paused="throwPaused" :locked="showPauseLocked"
        @toggle="emit('toggleThrowPause')"
      />
      <button v-ripple class="btn btn-gold btn-xl submit-btn" :disabled="false" @click="submit">NEXT</button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import ThrowTimer from './ThrowTimer.vue'

const props = defineProps<{
  remaining: number
  throwTimeLeft?: number
  throwTimerDuration?: number
  throwPaused?: boolean
  /** Set for a moment when the timer is tapped while pausing is locked. */
  showPauseLocked?: boolean
}>()
const emit = defineEmits<{ submit: [score: number]; toggleThrowPause: [] }>()

const darts = ref<string[]>(['', '', ''])
const multipliers = ref<number[]>([1, 1, 1])
const activeDart = ref(0)

const dartValues = computed(() =>
  darts.value.map((d, i) => (parseInt(d) || 0) * multipliers.value[i]!)
)

const dartTotal = computed(() =>
  dartValues.value.reduce((sum, v) => sum + v, 0)
)
const isBust = computed(() => dartTotal.value > props.remaining)

function canMultiply(mult: number): boolean {
  const base = parseInt(darts.value[activeDart.value]!) || 0
  return base > 0 && base * mult <= 60
}

function applyMultiplier(mult: number) {
  const base = parseInt(darts.value[activeDart.value]!) || 0
  if (base === 0) return
  // Toggle off if already active
  const current = multipliers.value[activeDart.value]
  const newMult = current === mult ? 1 : mult
  if (newMult !== 1 && base * newMult > 60) return
  multipliers.value = multipliers.value.map((m, i) => i === activeDart.value ? newMult : m)
  // Auto-advance after applying multiplier
  if (newMult !== 1 && activeDart.value < 2) activeDart.value++
}

function press(n: number) {
  const current = darts.value[activeDart.value]!
  if (current.length >= 2) return
  const next = current + String(n)
  const val = parseInt(next)
  if (val > 60) return
  darts.value = darts.value.map((d, i) => i === activeDart.value ? next : d)
  // Reset multiplier for this dart when re-entering a number
  multipliers.value = multipliers.value.map((m, i) => i === activeDart.value ? 1 : m)
  const twoDigits = next.length === 2
  const cantExtend = parseInt(next + '0') > 60
  if ((twoDigits || cantExtend) && activeDart.value < 2) activeDart.value++
}

function backspace() {
  const current = darts.value[activeDart.value]!
  if (current === '' && activeDart.value > 0) {
    activeDart.value--
    return
  }
  darts.value = darts.value.map((d, i) => i === activeDart.value ? d.slice(0, -1) : d)
  multipliers.value = multipliers.value.map((m, i) => i === activeDart.value ? 1 : m)
}

function submit() {
  if (isBust.value || dartTotal.value === 0) return
  emit('submit', dartTotal.value)
  darts.value = ['', '', '']
  multipliers.value = [1, 1, 1]
  activeDart.value = 0
}
</script>

<style scoped>
.numpad-wrap {
  flex: 1; display: flex; flex-direction: column; align-items: stretch;
  padding: 16px 20px; padding-bottom: calc(16px + env(safe-area-inset-bottom));
  gap: 14px; overflow: hidden; justify-content: space-between;
}

/* Remaining */
.remaining-display { display: flex; flex-direction: column; align-items: center; flex-shrink: 0; }
.remaining-label { font-size: 10px; font-weight: 700; letter-spacing: 0.2em; color: #fff; text-transform: uppercase; }
.remaining-val { font-size: 72px; font-family: var(--font-display); color: #fff; line-height: 1; transition: color 0.2s; background: rgba(0,0,0,0.72);  padding: 4px 20px; }
.remaining-val.bust { color: #ef4444; }

/* Dart slots */
.dart-slots { display: flex; gap: 12px; width: 100%; flex-shrink: 0; }
.dart-slot {
  flex: 1; display: flex; flex-direction: column; align-items: center; gap: 4px;
  padding: 10px 8px;  cursor: pointer;
  border: 2px solid rgba(255,255,255,0.15); background: #000;
  transition: all 0.15s; -webkit-tap-highlight-color: transparent;
}
.dart-slot.active { border-color: var(--blue); background: rgba(0,212,255,0.08); box-shadow: 0 0 16px rgba(0,212,255,0.2); }
.dart-slot.filled { border-color: rgba(255,255,255,0.25); }
.dart-slot.active.filled { border-color: var(--blue); }
.dart-slot-label { font-size: 10px; font-weight: 700; letter-spacing: 0.15em; text-transform: uppercase; color: #fff; }
.dart-slot-val-wrap { display: flex; align-items: flex-end; gap: 4px; line-height: 1; }
.dart-slot-val { font-size: 36px; font-weight: 900; font-family: var(--font-display); color: var(--text); line-height: 1; }
.dart-slot.active .dart-slot-val { color: var(--blue); }
.dart-slot.filled:not(.active) .dart-slot-val { color: #fff; }
.mult-badge { font-size: 14px; font-weight: 900; font-family: var(--font-display); color: #f59e0b; margin-bottom: 4px; }

/* Total */
.total-row { display: flex; align-items: center; gap: 10px; flex-shrink: 0; background: #000;  padding: 6px 12px; }
.total-label { font-size: 12px; font-weight: 700; letter-spacing: 0.12em; text-transform: uppercase; color: #fff; }
.total-val { font-size: 32px; font-weight: 900; font-family: var(--font-display); color: #fff; line-height: 1; }
.total-val.bust { color: #ef4444; }
.bust-tag { font-size: 11px; font-weight: 900; letter-spacing: 0.12em; color: #ef4444; background: rgba(239,68,68,0.15); border: 2px solid rgba(239,68,68,0.4);  padding: 2px 6px; }

/* Numpad */
/*
 * Four explicit rows that divide the box, instead of rows sized by the keys inside them.
 *
 * The keys used to carry `min-height: clamp(70px, 10dvh, 120px)`, and the grid honoured that
 * even when flex had handed the numpad less room than it needed. On a landscape iPad that was
 * 223px of box holding 426px of keys: the bottom two rows painted straight over DOUBLE /
 * TRIPLE and the NEXT bar. `minmax(0, 1fr)` rows can always shrink to the space available, so
 * the grid can no longer overflow its siblings whatever the viewport.
 *
 * `container-type: size` exists so the keys can size their text against the grid — see below.
 */
.numpad {
  display: grid; grid-template-columns: repeat(3, 1fr);
  grid-template-rows: repeat(4, minmax(0, 1fr));
  gap: 8px; width: 100%; flex: 1; min-height: 0;
  container-type: size;
}
.key {
  height: auto; min-height: 0; 
  border: 2px solid rgba(255,255,255,0.15); background: #000;
  /* Capped against the grid's own height so a squeezed row cannot clip its digit: one row of
     four is 25cqh, so 16cqh leaves the number comfortably inside it. */
  color: #fff; font-size: min(clamp(44px, 6.5dvh, 72px), 16cqh); font-weight: 700; cursor: pointer;
  transition: all 0.1s; display: flex; align-items: center; justify-content: center;
  font-family: var(--font-display); -webkit-tap-highlight-color: transparent;
  position: relative; overflow: hidden;
}

.key:active { transform: scale(0.91); }
.key.double { grid-column: span 2; }

/* Multiplier row */
.mult-row { display: flex; gap: 10px; width: 100%; flex-shrink: 0; }
.mult-btn {
  flex: 1; padding: 10px 0; 
  border: 2px solid rgba(255,255,255,0.15); background: #000;
  color: #fff; font-size: clamp(26px, 4dvh, 38px);
  font-weight: 900; font-family: var(--font-display); letter-spacing: 0.05em;
  cursor: pointer; transition: all 0.15s; position: relative; overflow: hidden;
  -webkit-tap-highlight-color: transparent;
}

.mult-btn.active { border-color: #f59e0b; color: #f59e0b; background: rgba(245,158,11,0.15); box-shadow: 0 0 16px rgba(245,158,11,0.3); }
.mult-btn.disabled { opacity: 0.3; cursor: default; }
.mult-btn:active:not(.disabled) { transform: scale(0.95); }

.numpad-footer { width: 100%; flex-shrink: 0; display: flex; align-items: stretch; gap: 10px; padding: 8px 12px; padding-bottom: calc(8px + env(safe-area-inset-bottom)); }
.submit-btn { flex: 1; position: relative; overflow: hidden; height: clamp(58px, 7.5dvh, 88px); font-size: clamp(50px, 7.2dvh, 78px); font-weight: 900; letter-spacing: 0.08em; text-transform: uppercase; font-family: var(--font-display); }

/* Tablet / iPad */
/*
 * Tablet and desktop.
 *
 * Everything here is sized against the viewport height, because height is the scarce
 * dimension on a landscape tablet — the panel is well over 1000px wide and under 900 tall.
 * The previous values were tuned for width alone (a 12dvh "remaining", 14px slot padding, an
 * 88px NEXT bar) and between them the fixed blocks took 645px of an 868px panel, leaving the
 * keypad 223px: four rows of 42px under a 115px score. Trimming them gives the keypad roughly
 * 45% of the panel, which is what makes it look like a keypad rather than a strip.
 */
@media (min-width: 768px) {
  /* Capped and centred: stretched across a 1600px panel the keypad read as three columns of
     bars rather than keys, and the eye had to travel the full width to find DOUBLE. */
  .numpad-wrap {
    padding: 16px 40px; padding-bottom: calc(16px + env(safe-area-inset-bottom));
    gap: clamp(8px, 1.5dvh, 18px);
    width: 100%; max-width: 860px; margin-inline: auto;
  }
  .remaining-val { font-size: clamp(56px, 8.5dvh, 120px); }
  .dart-slots { gap: 16px; }
  .dart-slot { padding: clamp(6px, 1dvh, 14px) 12px;  }
  .dart-slot-label { font-size: 11px; }
  .dart-slot-val { font-size: clamp(32px, 4.6dvh, 60px); }
  .total-row { padding: clamp(4px, 0.7dvh, 8px) 12px; }
  .total-val { font-size: clamp(28px, 3.8dvh, 48px); }
  .numpad { gap: clamp(10px, 1.5dvh, 18px); }
  .mult-btn { padding: clamp(6px, 1dvh, 12px) 0; font-size: clamp(22px, 3dvh, 34px); }
  /* No side padding, so the timer and NEXT line up with the keypad's edges rather than
     sitting 12px inside them. */
  .numpad-footer {
    padding: clamp(4px, 0.8dvh, 10px) 0;
    padding-bottom: calc(clamp(4px, 0.8dvh, 10px) + env(safe-area-inset-bottom));
  }
  .submit-btn { height: clamp(52px, 6.4dvh, 84px); font-size: clamp(40px, 5.6dvh, 72px); }
}

@media (max-width: 480px) {
  .remaining-val { font-size: 56px; }
  .dart-slot-val { font-size: 28px; }
  .numpad { gap: 6px; }
  /* No min-height: it put this rule back into the overflow the base grid was changed to
     avoid, and a 727px-tall phone was spilling the ⌫ row 12px past the grid. */
  .key { font-size: min(36px, 16cqh); }
  .mult-btn { font-size: 22px; padding: 8px 0; }
}

@media (hover: hover) and (pointer: fine) {
  .key:hover { background: #111; border-color: var(--blue); color: var(--blue); }
  .mult-btn:hover:not(.disabled) { border-color: #f59e0b; color: #f59e0b; background: rgba(245,158,11,0.08); }
}
</style>
