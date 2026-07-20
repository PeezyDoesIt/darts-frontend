<template>
  <div class="simple-wrap">
    <div class="round-info">
      <span class="round-label">{{ gameLabel }}</span>
      <span class="round-sub">Round {{ round }} — enter score for this round</span>
      <span v-if="hint" class="round-hint">{{ hint }}</span>
    </div>

    <div class="score-display">
      <span class="score-entered">{{ entered || '0' }}</span>
      <button v-ripple class="btn btn-sm btn-surface" @click="clear" style="margin-left:12px;position:relative;overflow:hidden">Clear</button>
    </div>

    <div class="numpad">
      <button v-for="n in [1,2,3,4,5,6,7,8,9]" :key="n" v-ripple class="key" @click="press(n)">{{ n }}</button>
      <button v-ripple class="key" @click="press(0)">0</button>
      <button v-ripple class="key double" @click="backspace">⌫</button>
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
      <button v-ripple class="btn btn-gold btn-xl submit-btn" :disabled="entered === ''" @click="submit">
        NEXT
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { GAME_TYPE_LABELS, type GameType } from '../types/index'

const props = defineProps<{
  gameType: GameType
  round: number
  hint?: string | null
  throwTimeLeft?: number
  throwTimerDuration?: number
  throwPaused?: boolean
}>()
const emit = defineEmits<{ submit: [score: number]; toggleThrowPause: [] }>()

const entered = ref('')
const gameLabel = computed(() => GAME_TYPE_LABELS[props.gameType])

function press(n: number) { if (entered.value.length >= 4) return; entered.value += String(n) }
function backspace() { entered.value = entered.value.slice(0, -1) }
function clear() { entered.value = '' }
function submit() {
  if (!entered.value) return
  emit('submit', parseInt(entered.value))
  entered.value = ''
}
</script>

<style scoped>
.simple-wrap { flex: 1; display: flex; flex-direction: column; align-items: stretch; padding: 24px; padding-bottom: calc(24px + env(safe-area-inset-bottom)); gap: 20px; overflow: hidden; justify-content: center; }

.round-info { text-align: center; }
.round-label { font-size: 20px; font-weight: 800; color: var(--gold); display: block; }
.round-sub { font-size: 14px; color: var(--text-muted); font-weight: 700; }
.round-hint { font-size: 18px; font-weight: 800; color: var(--pink); margin-top: 4px; display: block; }

.score-display { display: flex; align-items: center; }
.score-entered { font-size: 52px; font-weight: 900; min-width: 100px; text-align: center; font-family: var(--font-display); }

.numpad { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; width: 100%; }
.key {
  height: clamp(90px, 12dvh, 130px); border-radius: 12px; border: 1px solid var(--border); background: var(--bg-card);
  color: var(--text); font-size: clamp(44px, 6.5dvh, 72px); font-weight: 700; cursor: pointer;
  transition: background 0.1s, transform 0.1s; display: flex; align-items: center; justify-content: center;
  -webkit-tap-highlight-color: transparent; position: relative; overflow: hidden;
}
.key:hover { background: var(--bg-surface); }
.key:active { transform: scale(0.93); }
.key.double { grid-column: span 2; }

.numpad-footer { width: 100%; display: flex; align-items: stretch; gap: 10px; }
.submit-left { flex: 0 0 80px; position: relative; overflow: hidden; display: flex; align-items: center; justify-content: center; border-radius: 12px; background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.08); cursor: pointer; }
.submit-btn { flex: 1; width: 100%; position: relative; overflow: hidden; font-size: clamp(52px, 8dvh, 82px); font-weight: 900; letter-spacing: 0.06em; text-transform: uppercase; font-family: var(--font-display); text-shadow: 0 0 18px rgba(255,255,255,0.7), 0 1px 0 rgba(0,0,0,0.4); }
.submit-timer-fill {
  position: absolute; left: 0; top: 0; bottom: 0; pointer-events: none;
  background: #ff0000; transition: width 1s linear, background 0.3s; z-index: 0;
}
.submit-timer-fill.warning { background: #ff0000; }
.submit-timer-fill.urgent { background: #ff3333; }
.submit-timer-fill.paused { background: rgba(120,120,120,0.6); }
.submit-timer-text { position: relative; z-index: 1; font-size: clamp(18px, 2.8dvh, 26px); font-weight: 900; letter-spacing: 0.15em; color: rgba(255,255,255,0.9); font-family: var(--font-display); text-transform: uppercase; }
.submit-timer-text.urgent { color: #fff; }

@media (max-width: 768px) {
  .simple-wrap { padding: 16px; padding-bottom: calc(16px + env(safe-area-inset-bottom)); gap: 14px; }
  .key { height: 72px; font-size: 36px; }
  .score-entered { font-size: 40px; }
}
</style>
