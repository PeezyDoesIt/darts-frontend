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
      <div v-if="throwTimerDuration" class="submit-left" @click="emit('toggleThrowPause')">
        <div class="submit-timer-fill"
          :class="{ warning: (throwTimeLeft ?? 0) <= 30, urgent: (throwTimeLeft ?? 0) <= 10, paused: throwPaused }"
          :style="{ width: `${((throwTimeLeft ?? 0) / throwTimerDuration) * 100}%`, transition: throwPaused ? 'none' : 'width 1s linear' }" />
        <span class="submit-timer-text" :class="{ urgent: (throwTimeLeft ?? 0) <= 10 }">
          {{ throwPaused ? 'PAUSED' : (throwTimeLeft ?? 0) + 's' }}
        </span>
      </div>
      <button v-ripple class="btn btn-gold btn-xl submit-btn" :disabled="false" @click="submit">NEXT</button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'

const props = defineProps<{
  remaining: number
  throwTimeLeft?: number
  throwTimerDuration?: number
  throwPaused?: boolean
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
.remaining-val { font-size: 72px; font-family: var(--font-display); color: #fff; line-height: 1; transition: color 0.2s; background: rgba(0,0,0,0.72); border-radius: 10px; padding: 4px 20px; }
.remaining-val.bust { color: #ef4444; }

/* Dart slots */
.dart-slots { display: flex; gap: 12px; width: 100%; flex-shrink: 0; }
.dart-slot {
  flex: 1; display: flex; flex-direction: column; align-items: center; gap: 4px;
  padding: 10px 8px; border-radius: 10px; cursor: pointer;
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
.total-row { display: flex; align-items: center; gap: 10px; flex-shrink: 0; background: #000; border-radius: 6px; padding: 6px 12px; }
.total-label { font-size: 12px; font-weight: 700; letter-spacing: 0.12em; text-transform: uppercase; color: #fff; }
.total-val { font-size: 32px; font-weight: 900; font-family: var(--font-display); color: #fff; line-height: 1; }
.total-val.bust { color: #ef4444; }
.bust-tag { font-size: 11px; font-weight: 900; letter-spacing: 0.12em; color: #ef4444; background: rgba(239,68,68,0.15); border: 1px solid rgba(239,68,68,0.4); border-radius: 4px; padding: 2px 6px; }

/* Numpad */
.numpad { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; width: 100%; flex: 1; min-height: 0; }
.key {
  height: auto; min-height: clamp(70px, 10dvh, 120px); border-radius: 10px;
  border: 1px solid rgba(255,255,255,0.15); background: #000;
  color: #fff; font-size: clamp(44px, 6.5dvh, 72px); font-weight: 700; cursor: pointer;
  transition: all 0.1s; display: flex; align-items: center; justify-content: center;
  font-family: var(--font-display); -webkit-tap-highlight-color: transparent;
  position: relative; overflow: hidden;
}
.key:hover { background: #111; border-color: var(--blue); color: var(--blue); }
.key:active { transform: scale(0.91); }
.key.double { grid-column: span 2; }

/* Multiplier row */
.mult-row { display: flex; gap: 10px; width: 100%; flex-shrink: 0; }
.mult-btn {
  flex: 1; padding: 10px 0; border-radius: 10px;
  border: 2px solid rgba(255,255,255,0.15); background: #000;
  color: #fff; font-size: clamp(26px, 4dvh, 38px);
  font-weight: 900; font-family: var(--font-display); letter-spacing: 0.05em;
  cursor: pointer; transition: all 0.15s; position: relative; overflow: hidden;
  -webkit-tap-highlight-color: transparent;
}
.mult-btn:hover:not(.disabled) { border-color: #f59e0b; color: #f59e0b; background: rgba(245,158,11,0.08); }
.mult-btn.active { border-color: #f59e0b; color: #f59e0b; background: rgba(245,158,11,0.15); box-shadow: 0 0 16px rgba(245,158,11,0.3); }
.mult-btn.disabled { opacity: 0.3; cursor: default; }
.mult-btn:active:not(.disabled) { transform: scale(0.95); }

.numpad-footer { width: 100%; flex-shrink: 0; display: flex; align-items: stretch; gap: 10px; min-height: 90px; }
.submit-left { flex: 0 0 90px; position: relative; overflow: hidden; display: flex; align-items: center; justify-content: center; border-radius: 12px; background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.08); cursor: pointer; }
.submit-btn { flex: 1; position: relative; overflow: hidden; height: clamp(68px, 9dvh, 104px); font-size: clamp(52px, 8dvh, 82px); font-weight: 900; letter-spacing: 0.06em; text-transform: uppercase; font-family: var(--font-display); text-shadow: 0 0 18px rgba(255,255,255,0.7), 0 1px 0 rgba(0,0,0,0.4); }
.submit-timer-fill {
  position: absolute; left: 0; top: 0; bottom: 0; pointer-events: none;
  background: #ff0000; transition: width 1s linear, background 0.3s; z-index: 0;
}
.submit-timer-fill.warning { background: #ff0000; }
.submit-timer-fill.urgent { background: #ff3333; }
.submit-timer-fill.paused { background: rgba(120,120,120,0.6); }
.submit-timer-text { position: relative; z-index: 1; font-size: clamp(20px, 3dvh, 28px); font-weight: 900; letter-spacing: 0.15em; color: rgba(255,255,255,0.9); font-family: var(--font-display); text-transform: uppercase; }
.submit-timer-text.urgent { color: #fff; }

/* Tablet / iPad */
@media (min-width: 768px) {
  .numpad-wrap { padding: 24px 40px; padding-bottom: calc(24px + env(safe-area-inset-bottom)); gap: 18px; }
  .remaining-val { font-size: clamp(80px, 12dvh, 140px); }
  .dart-slots { gap: 16px; }
  .dart-slot { padding: 14px 12px; border-radius: 14px; }
  .dart-slot-label { font-size: 11px; }
  .dart-slot-val { font-size: clamp(40px, 6dvh, 64px); }
  .total-val { font-size: clamp(36px, 5dvh, 52px); }
  .numpad { gap: clamp(10px, 1.5dvh, 18px); }
  .mult-row { }
  .numpad-footer { }
}

@media (max-width: 480px) {
  .remaining-val { font-size: 56px; }
  .dart-slot-val { font-size: 28px; }
  .numpad { gap: 6px; }
  .key { font-size: 36px; min-height: 60px; }
  .mult-btn { font-size: 22px; padding: 8px 0; }
}
</style>
