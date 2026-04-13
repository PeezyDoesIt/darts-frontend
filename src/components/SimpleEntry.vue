<template>
  <div class="simple-wrap">
    <div class="round-info">
      <span class="round-label">{{ gameLabel }}</span>
      <span class="round-sub">Round {{ round }} — enter score for this round</span>
    </div>

    <div class="score-display">
      <span class="score-entered">{{ entered || '0' }}</span>
      <button class="btn btn-sm btn-surface" @click="clear" style="margin-left:12px">Clear</button>
    </div>

    <div class="numpad">
      <button v-for="n in [1,2,3,4,5,6,7,8,9]" :key="n" class="key" @click="press(n)">{{ n }}</button>
      <button class="key" @click="press(0)">0</button>
      <button class="key double" @click="backspace">⌫</button>
    </div>

    <button class="btn btn-gold btn-xl" :disabled="entered === ''" @click="submit">
      Submit Turn
    </button>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { GAME_TYPE_LABELS, type GameType } from '../types/index'

const props = defineProps<{
  gameType: GameType
  round: number
}>()

const emit = defineEmits<{
  submit: [score: number]
}>()

const entered = ref('')
const gameLabel = computed(() => GAME_TYPE_LABELS[props.gameType])

function press(n: number) {
  if (entered.value.length >= 4) return
  entered.value += String(n)
}
function backspace() { entered.value = entered.value.slice(0, -1) }
function clear() { entered.value = '' }
function submit() {
  if (!entered.value) return
  emit('submit', parseInt(entered.value))
  entered.value = ''
}
</script>

<style scoped>
.simple-wrap {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 24px;
  gap: 20px;
  overflow: hidden;
}

.round-info { text-align: center; }
.round-label { font-size: 20px; font-weight: 800; color: var(--gold); display: block; }
.round-sub { font-size: 14px; color: var(--text-muted); }

.score-display { display: flex; align-items: center; }
.score-entered { font-size: 48px; font-weight: 900; min-width: 100px; text-align: center; }

.numpad {
  display: grid;
  grid-template-columns: repeat(3, 72px);
  gap: 10px;
}
.key {
  width: 72px;
  height: 72px;
  border-radius: 14px;
  border: 1px solid var(--border);
  background: var(--bg-card);
  color: var(--text);
  font-size: 26px;
  font-weight: 700;
  cursor: pointer;
  transition: background 0.1s, transform 0.1s;
  display: flex;
  align-items: center;
  justify-content: center;
}
.key:hover { background: var(--bg-surface); }
.key:active { transform: scale(0.93); }
.key.double { grid-column: span 2; width: 100%; }
</style>
