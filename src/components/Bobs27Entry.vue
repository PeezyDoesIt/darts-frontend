<template>
  <div class="bobs27">

    <div class="target-section">
      <span class="round-tag">Round {{ round }} / 20</span>
      <div class="double-display" :style="{ color: playerColor ?? 'var(--pink)', filter: `drop-shadow(0 0 28px ${playerColor ?? 'var(--pink)'})` }">
        D{{ round }}
      </div>
      <div class="double-sub">Double {{ round }} &nbsp;·&nbsp; {{ round * 2 }} pts per hit &nbsp;·&nbsp; miss −{{ round * 2 }}</div>
    </div>

    <div class="hits-row">
      <button
        v-for="n in [0, 1, 2, 3]" :key="n"
        v-ripple
        class="hit-btn"
        :class="{ active: hits === n, miss: n === 0 && hits === 0 }"
        @click="hits = n"
      >
        <span class="hit-num">{{ n }}</span>
        <span class="hit-word">{{ n === 0 ? 'MISS' : n === 1 ? 'HIT' : 'HITS' }}</span>
      </button>
    </div>

    <div class="score-preview">
      <div class="score-current-wrap">
        <span class="score-label">Score</span>
        <span class="score-current">{{ currentScore }}</span>
      </div>
      <template v-if="hits !== null">
        <span class="preview-delta" :class="{ gain: previewDelta > 0, loss: previewDelta < 0 }">
          {{ previewDelta > 0 ? '+' : '' }}{{ previewDelta }}
        </span>
        <span class="preview-arrow">→</span>
        <span class="score-new" :class="{ bust: previewNew <= 0 }">
          {{ Math.max(0, previewNew) }}
          <span v-if="previewNew <= 0" class="bust-label">BUST</span>
        </span>
      </template>
    </div>

    <div class="submit-row">
      <button
        v-ripple
        class="submit-btn"
        :disabled="hits === null"
        @click="doSubmit"
      >NEXT</button>
    </div>

  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import type { PlayerScore } from '../types/index'

const props = defineProps<{
  playerId: string
  scores: Record<string, PlayerScore>
  round: number
  playerColor?: string
}>()

const emit = defineEmits<{
  submit: [hits: number]
}>()

const hits = ref<number | null>(null)

const myScore = computed(() => {
  const s = props.scores[props.playerId]
  return s?.kind === 'bobs27' ? s.data : null
})

const currentScore = computed(() => myScore.value?.score ?? 27)
const doubleValue = computed(() => props.round * 2)

const previewDelta = computed(() => {
  if (hits.value === null) return 0
  return hits.value === 0 ? -doubleValue.value : hits.value * doubleValue.value
})

const previewNew = computed(() => currentScore.value + previewDelta.value)

function doSubmit() {
  if (hits.value === null) return
  const h = hits.value
  hits.value = null
  emit('submit', h)
}

defineExpose({ doSubmit })
</script>

<style scoped>
.bobs27 {
  flex: 1; display: flex; flex-direction: column; overflow: hidden; min-height: 0;
  align-items: stretch; gap: 0;
}

/* Target section */
.target-section {
  display: flex; flex-direction: column; align-items: center; justify-content: center;
  flex: 1; min-height: 0; padding: 8px 16px 0;
}
.round-tag {
  font-size: 12px; font-weight: 800; letter-spacing: 0.15em; text-transform: uppercase;
  color: var(--text-muted); margin-bottom: 4px;
}
.double-display {
  font-size: clamp(80px, 18dvh, 160px); font-family: var(--font-display);
  font-weight: 900; line-height: 1; letter-spacing: 0.04em;
}
.double-sub {
  font-size: clamp(11px, 1.6dvh, 15px); color: rgba(255,255,255,0.45);
  font-weight: 600; letter-spacing: 0.05em; margin-top: 4px;
}

/* Hit buttons */
.hits-row {
  display: flex; gap: 10px; padding: 12px 16px;
  flex-shrink: 0;
}
.hit-btn {
  flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: center;
  gap: 4px; padding: 14px 8px; 
  background: #1a1a20; border: 2px solid rgba(255,255,255,0.15);
  cursor: pointer; transition: all 0.15s; -webkit-tap-highlight-color: transparent;
  min-height: 80px;
}
.hit-btn:active { transform: scale(0.96); }
.hit-btn.active {
  background: rgba(255,45,120,0.2); border-color: var(--pink);
  box-shadow: 4px 4px 0 rgba(0,0,0,0.5);
}
.hit-btn.miss.active {
  background: rgba(239,68,68,0.2); border-color: #ef4444;
  box-shadow: 4px 4px 0 rgba(0,0,0,0.5);
}
.hit-num {
  font-size: clamp(28px, 5dvh, 52px); font-weight: 900;
  font-family: var(--font-display); line-height: 1; color: #fff;
}
.hit-btn.miss.active .hit-num { color: #ef4444; }
.hit-btn.active:not(.miss) .hit-num { color: var(--pink); }
.hit-word {
  font-size: 9px; font-weight: 800; letter-spacing: 0.12em; text-transform: uppercase;
  color: rgba(255,255,255,0.45);
}
.hit-btn.active .hit-word { color: rgba(255,255,255,0.7); }

/* Score preview */
.score-preview {
  display: flex; align-items: center; justify-content: center; gap: 16px;
  padding: 8px 16px; flex-shrink: 0; min-height: 56px;
}
.score-current-wrap { display: flex; flex-direction: column; align-items: center; }
.score-label { font-size: 10px; font-weight: 800; letter-spacing: 0.12em; text-transform: uppercase; color: var(--text-muted); }
.score-current { font-size: clamp(28px, 4.5dvh, 48px); font-weight: 900; font-family: var(--font-display); color: #fff; line-height: 1; }
.preview-delta { font-size: clamp(22px, 3.5dvh, 36px); font-weight: 900; font-family: var(--font-display); line-height: 1; }
.preview-delta.gain { color: #4ade80; filter: drop-shadow(0 0 8px rgba(74,222,128,0.6)); }
.preview-delta.loss { color: #ef4444; filter: drop-shadow(0 0 8px rgba(239,68,68,0.6)); }
.preview-arrow { font-size: 20px; color: rgba(255,255,255,0.3); }
.score-new { font-size: clamp(28px, 4.5dvh, 48px); font-weight: 900; font-family: var(--font-display); color: #fff; line-height: 1; display: flex; flex-direction: column; align-items: center; }
.score-new.bust { color: #ef4444; }
.bust-label { font-size: 9px; font-weight: 800; letter-spacing: 0.15em; color: #ef4444; }

/* Submit */
.submit-row {
  padding: 12px 16px; padding-bottom: calc(12px + env(safe-area-inset-bottom));
  border-top: 2px solid rgba(255,255,255,0.08); background: #141419;
  flex-shrink: 0; min-height: 90px; display: flex; align-items: center;
}
.submit-btn {
  width: 100%; height: 64px; font-size: 22px; font-weight: 900;
  font-family: var(--font-display); letter-spacing: 0.12em;
  border: none;  cursor: pointer;
  background: linear-gradient(135deg, var(--pink), var(--purple), var(--blue));
  color: #fff; box-shadow: 5px 5px 0 rgba(0,0,0,0.55);
  transition: all 0.15s; -webkit-tap-highlight-color: transparent;
}
.submit-btn:disabled {
  background: #1e1e25; box-shadow: none; color: rgba(255,255,255,0.3); cursor: default;
}
.submit-btn:not(:disabled):active { transform: scale(0.97); opacity: 0.9; }

/* Landscape */
@media (orientation: landscape) and (max-height: 600px) {
  .target-section { flex-direction: row; gap: 16px; padding: 4px 16px; flex: 0; }
  .round-tag { display: none; }
  .double-display { font-size: clamp(40px, 10dvh, 80px); }
  .double-sub { font-size: 11px; }
  .hits-row { padding: 6px 16px; gap: 8px; }
  .hit-btn { min-height: 56px; padding: 8px 4px; }
  .hit-num { font-size: clamp(20px, 4dvh, 36px); }
  .score-preview { padding: 4px 16px; min-height: 40px; }
  .submit-row { padding: 8px 16px; padding-bottom: calc(8px + env(safe-area-inset-bottom)); }
  .submit-btn { height: 44px; font-size: 16px; }
}
</style>
