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
        <span class="dart-slot-val">{{ darts[i - 1] !== '' ? darts[i - 1] : '—' }}</span>
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

    <div class="numpad-footer">
      <button
        v-ripple
        class="btn btn-gold btn-xl submit-btn"
        :disabled="isBust || dartTotal === 0"
        @click="submit"
      >Submit Turn</button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'

const props = defineProps<{ remaining: number }>()
const emit = defineEmits<{ submit: [score: number] }>()

const darts = ref<string[]>(['', '', ''])
const activeDart = ref(0)

const dartTotal = computed(() =>
  darts.value.reduce((sum, d) => sum + (parseInt(d) || 0), 0)
)
const isBust = computed(() => dartTotal.value > props.remaining)

function press(n: number) {
  const current = darts.value[activeDart.value]!
  if (current.length >= 2) return
  const next = current + String(n)
  const val = parseInt(next)
  if (val > 60) return // max single dart score
  darts.value = darts.value.map((d, i) => i === activeDart.value ? next : d)
  // Auto-advance: after 2 digits, or if any second digit would exceed 60
  const twoDigits = next.length === 2
  const cantExtend = parseInt(next + '0') > 60
  if ((twoDigits || cantExtend) && activeDart.value < 2) {
    activeDart.value++
  }
}

function backspace() {
  const current = darts.value[activeDart.value]!
  if (current === '' && activeDart.value > 0) {
    activeDart.value--
    return
  }
  darts.value = darts.value.map((d, i) => i === activeDart.value ? d.slice(0, -1) : d)
}

function submit() {
  if (isBust.value || dartTotal.value === 0) return
  emit('submit', dartTotal.value)
  darts.value = ['', '', '']
  activeDart.value = 0
}
</script>

<style scoped>
.numpad-wrap {
  flex: 1; display: flex; flex-direction: column; align-items: center;
  padding: 16px 20px; padding-bottom: calc(16px + env(safe-area-inset-bottom));
  gap: 14px; overflow: hidden; justify-content: space-between;
}

/* Remaining */
.remaining-display { display: flex; flex-direction: column; align-items: center; flex-shrink: 0; }
.remaining-label { font-size: 10px; font-weight: 700; letter-spacing: 0.2em; color: var(--text-muted); text-transform: uppercase; }
.remaining-val { font-size: 72px; font-family: var(--font-display); color: var(--pink); line-height: 1; filter: drop-shadow(0 0 16px rgba(255,45,120,0.5)); transition: color 0.2s; }
.remaining-val.bust { color: #ef4444; filter: drop-shadow(0 0 16px rgba(239,68,68,0.5)); }

/* Dart slots */
.dart-slots { display: flex; gap: 12px; width: 100%; max-width: 480px; flex-shrink: 0; }
.dart-slot {
  flex: 1; display: flex; flex-direction: column; align-items: center; gap: 4px;
  padding: 10px 8px; border-radius: 10px; cursor: pointer;
  border: 2px solid rgba(255,255,255,0.15); background: #000;
  transition: all 0.15s; -webkit-tap-highlight-color: transparent;
}
.dart-slot.active { border-color: var(--blue); background: rgba(0,212,255,0.08); box-shadow: 0 0 16px rgba(0,212,255,0.2); }
.dart-slot.filled { border-color: rgba(255,255,255,0.25); }
.dart-slot.active.filled { border-color: var(--blue); }
.dart-slot-label { font-size: 10px; font-weight: 700; letter-spacing: 0.15em; text-transform: uppercase; color: var(--text-muted); }
.dart-slot-val { font-size: 36px; font-weight: 900; font-family: var(--font-display); color: var(--text); line-height: 1; }
.dart-slot.active .dart-slot-val { color: var(--blue); }
.dart-slot.filled:not(.active) .dart-slot-val { color: #fff; }

/* Total */
.total-row { display: flex; align-items: center; gap: 10px; flex-shrink: 0; }
.total-label { font-size: 12px; font-weight: 700; letter-spacing: 0.12em; text-transform: uppercase; color: var(--text-muted); }
.total-val { font-size: 32px; font-weight: 900; font-family: var(--font-display); color: #fff; line-height: 1; }
.total-val.bust { color: #ef4444; }
.bust-tag { font-size: 11px; font-weight: 900; letter-spacing: 0.12em; color: #ef4444; background: rgba(239,68,68,0.15); border: 1px solid rgba(239,68,68,0.4); border-radius: 4px; padding: 2px 6px; }

/* Numpad */
.numpad { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; width: 100%; max-width: 480px; flex: 1; min-height: 0; }
.key {
  height: auto; min-height: 0; border-radius: 10px;
  border: 1px solid rgba(255,255,255,0.15); background: #000;
  color: #fff; font-size: clamp(22px, 4dvh, 36px); font-weight: 700; cursor: pointer;
  transition: all 0.1s; display: flex; align-items: center; justify-content: center;
  font-family: var(--font-display); -webkit-tap-highlight-color: transparent;
  position: relative; overflow: hidden;
}
.key:hover { background: #111; border-color: var(--blue); color: var(--blue); }
.key:active { transform: scale(0.91); }
.key.double { grid-column: span 2; }

.numpad-footer { width: 100%; max-width: 480px; flex-shrink: 0; }
.submit-btn { width: 100%; position: relative; overflow: hidden; height: clamp(52px, 7dvh, 80px); font-size: clamp(16px, 2.5dvh, 24px); }

/* Tablet / iPad */
@media (min-width: 768px) {
  .numpad-wrap { padding: 24px 40px; padding-bottom: calc(24px + env(safe-area-inset-bottom)); gap: 18px; }
  .remaining-val { font-size: clamp(80px, 12dvh, 140px); }
  .dart-slots { max-width: 640px; gap: 16px; }
  .dart-slot { padding: 14px 12px; border-radius: 14px; }
  .dart-slot-label { font-size: 11px; }
  .dart-slot-val { font-size: clamp(40px, 6dvh, 64px); }
  .total-val { font-size: clamp(36px, 5dvh, 52px); }
  .numpad { max-width: 640px; gap: clamp(10px, 1.5dvh, 18px); }
  .numpad-footer { max-width: 640px; }
}

@media (max-width: 480px) {
  .remaining-val { font-size: 56px; }
  .dart-slot-val { font-size: 28px; }
  .numpad { gap: 6px; }
  .key { font-size: 22px; }
}
</style>
