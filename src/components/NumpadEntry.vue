<template>
  <div class="numpad-wrap">
    <div class="remaining-display">
      <span class="remaining-label">Remaining</span>
      <span class="remaining-val">{{ remaining }}</span>
    </div>

    <div class="score-display">
      <span class="score-entered">{{ entered || '0' }}</span>
      <button v-ripple class="btn btn-sm btn-surface" @click="clear" style="margin-left:12px;position:relative;overflow:hidden">Clear</button>
    </div>

    <div v-if="isBust" class="bust-alert">BUST — score too high!</div>

    <div class="numpad">
      <button v-for="n in [1,2,3,4,5,6,7,8,9]" :key="n" v-ripple class="key" @click="press(n)">{{ n }}</button>
      <button v-ripple class="key" @click="press(0)">0</button>
      <button v-ripple class="key double" @click="backspace">⌫</button>
    </div>

    <div class="numpad-footer">
      <button
        v-ripple
        class="btn btn-gold btn-xl submit-btn"
        :disabled="isBust || entered === ''"
        @click="submit"
      >
        Submit Turn
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'

const props = defineProps<{ remaining: number }>()
const emit = defineEmits<{ submit: [score: number] }>()

const entered = ref('')
const numVal = computed(() => parseInt(entered.value || '0'))
const isBust = computed(() => numVal.value > props.remaining)

function press(n: number) { if (entered.value.length >= 3) return; entered.value += String(n) }
function backspace() { entered.value = entered.value.slice(0, -1) }
function clear() { entered.value = '' }
function submit() {
  if (isBust.value || entered.value === '') return
  emit('submit', numVal.value)
  entered.value = ''
}
</script>

<style scoped>
.numpad-wrap { flex: 1; display: flex; flex-direction: column; align-items: center; padding: 20px; padding-bottom: calc(20px + env(safe-area-inset-bottom)); gap: 16px; overflow: hidden; justify-content: center; }

.remaining-display { display: flex; flex-direction: column; align-items: center; }
.remaining-label { font-size: 10px; font-weight: 700; letter-spacing: 0.2em; color: var(--text-muted); text-transform: uppercase; }
.remaining-val { font-size: 72px; font-family: var(--font-display); color: var(--pink); line-height: 1; filter: drop-shadow(0 0 16px rgba(255,45,120,0.5)); }

.score-display { display: flex; align-items: center; }
.score-entered { font-size: 48px; font-weight: 900; font-family: var(--font-display); min-width: 100px; text-align: center; color: var(--blue); }

.bust-alert { color: #ef4444; font-size: 14px; font-weight: 800; letter-spacing: 0.05em; }

.numpad { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; width: 100%; max-width: 320px; }
.key {
  height: 80px; border-radius: 12px;
  border: 1px solid rgba(255,255,255,0.1); background: rgba(255,255,255,0.05);
  color: var(--text); font-size: 30px; font-weight: 700; cursor: pointer;
  transition: all 0.1s; display: flex; align-items: center; justify-content: center;
  font-family: var(--font-display); -webkit-tap-highlight-color: transparent;
  position: relative; overflow: hidden;
}
.key:hover { background: rgba(255,255,255,0.1); border-color: var(--pink); color: var(--pink); }
.key:active { transform: scale(0.91); }
.key.double { grid-column: span 2; }

.numpad-footer { width: 100%; max-width: 320px; }
.submit-btn { width: 100%; position: relative; overflow: hidden; }

@media (max-width: 768px) {
  .numpad-wrap { padding: 12px; padding-bottom: calc(12px + env(safe-area-inset-bottom)); gap: 12px; }
  .remaining-val { font-size: 56px; }
  .score-entered { font-size: 40px; }
  .key { height: 72px; font-size: 26px; }
}
</style>
