<template>
  <div class="cricket">
    <div class="cricket-board-scroll">
      <div class="cricket-board">
        <button
          v-for="target in CRICKET_TARGETS"
          :key="target"
          v-ripple
          class="board-tile"
          :class="{ closed: myClosed(target), active: (roundHits[target] ?? 0) > 0 }"
          :disabled="myClosed(target)"
          @click="handleTileClick(target)"
        >
          <span class="target-label">{{ target === 'bull' ? 'BULL' : target }}</span>

          <div class="pips-wrap">
            <span
              v-for="n in 3" :key="n"
              class="pip"
              :class="{ existing: pipIsExisting(target, n), round: pipIsRound(target, n) }"
            />
          </div>

          <span v-if="myClosed(target)" class="closed-badge">✓ CLOSED</span>
          <span v-else-if="(roundHits[target] ?? 0) > 0" class="hit-badge">+{{ roundHits[target] }}</span>
          <span v-else class="hit-badge invisible">+0</span>
        </button>
      </div>
    </div>

    <div class="submit-row">
      <div class="round-summary">
        <span v-if="totalHitsThisRound > 0" class="hits-text">
          {{ totalHitsThisRound }} hit{{ totalHitsThisRound !== 1 ? 's' : '' }} this round
        </span>
        <span v-else class="muted">Tap a number to mark a hit</span>
      </div>
      <button v-ripple class="submit-btn" @click="submit" :disabled="submitted">SUBMIT TURN</button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { CRICKET_TARGETS, type CricketTarget, type PlayerScore } from '../types/index'

const props = defineProps<{
  playerId: string
  scores: Record<string, PlayerScore>
  isCutThroat: boolean
}>()

const emit = defineEmits<{
  submit: [hits: Record<CricketTarget, number>]
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

function myClosed(target: CricketTarget) { return (existingMarks.value[target] ?? 0) >= 3 }
function pipIsExisting(target: CricketTarget, n: number) { return (existingMarks.value[target] ?? 0) >= n }
function pipIsRound(target: CricketTarget, n: number) {
  const existing = existingMarks.value[target] ?? 0
  return existing < n && existing + (roundHits.value[target] ?? 0) >= n
}
function handleTileClick(target: CricketTarget) {
  if (myClosed(target)) return
  const existing = existingMarks.value[target] ?? 0
  const max = 3 - existing
  const current = roundHits.value[target] ?? 0
  roundHits.value = { ...roundHits.value, [target]: current >= max ? 0 : current + 1 }
}
function submit() {
  if (submitted.value) return
  submitted.value = true
  const hits: Record<CricketTarget, number> = {} as Record<CricketTarget, number>
  for (const t of CRICKET_TARGETS) hits[t] = roundHits.value[t] ?? 0
  emit('submit', hits)
  roundHits.value = {}
}
</script>

<style scoped>
.cricket { flex: 1; display: flex; flex-direction: column; overflow: hidden; min-height: 0; }

.cricket-board-scroll { flex: 1; min-height: 0; overflow-y: auto; }

.cricket-board {
  display: flex;
  flex-direction: column;
  padding: 10px 16px;
  gap: 8px;
  /* Make tiles fill the available height by stretching */
  min-height: 100%;
}

.board-tile {
  display: flex; align-items: center; width: 100%; padding: 0 24px; gap: 0;
  min-height: 72px;
  background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.08); border-radius: 8px;
  cursor: pointer; transition: all 0.15s; -webkit-tap-highlight-color: transparent; text-align: left;
  position: relative; overflow: hidden;
}
.board-tile:not(:disabled):active { transform: scale(0.98); }
.board-tile.active { border-color: var(--pink); background: rgba(255,45,120,0.18); box-shadow: 0 0 32px rgba(255,45,120,0.35), inset 0 0 40px rgba(255,45,120,0.08); }
.board-tile.closed { opacity: 0.3; cursor: default; }

.target-label { font-size: 52px; font-family: var(--font-display); color: var(--pink); letter-spacing: 0.05em; width: 110px; flex-shrink: 0; filter: drop-shadow(0 0 12px rgba(255,45,120,0.7)); }
.pips-wrap { display: flex; align-items: center; gap: 24px; flex: 1; justify-content: center; }
.pip { width: 54px; height: 54px; border-radius: 50%; border: 3px solid rgba(255,255,255,0.2); background: rgba(255,255,255,0.04); display: block; transition: all 0.2s; flex-shrink: 0; }
.pip.existing { background: var(--pink); border-color: var(--pink); box-shadow: 0 0 20px rgba(255,45,120,1), 0 0 40px rgba(255,45,120,0.5); }
.pip.round { background: rgba(255,45,120,0.55); border-color: var(--pink); box-shadow: 0 0 16px rgba(255,45,120,0.6); }

.closed-badge { font-size: 12px; font-weight: 800; letter-spacing: 0.1em; color: var(--pink); text-transform: uppercase; font-family: var(--font-display); opacity: 0.7; width: 80px; text-align: right; flex-shrink: 0; }
.hit-badge { font-size: 22px; font-weight: 900; font-family: var(--font-display); color: var(--pink); width: 80px; text-align: right; flex-shrink: 0; filter: drop-shadow(0 0 8px rgba(255,45,120,0.6)); }
.hit-badge.invisible { opacity: 0; }

.submit-row {
  display: flex; align-items: center; justify-content: space-between;
  padding: 16px 20px; padding-bottom: calc(16px + env(safe-area-inset-bottom));
  border-top: 1px solid rgba(255,255,255,0.08); background: rgba(255,255,255,0.03);
  backdrop-filter: blur(16px); -webkit-backdrop-filter: blur(16px); flex-shrink: 0; gap: 16px;
}
.round-summary { font-size: 14px; flex-shrink: 0; }
.hits-text { color: var(--pink); font-weight: 700; }
.muted { color: var(--text-muted); }
.submit-btn {
  flex: 1; height: 64px; font-size: 22px; font-weight: 900; font-family: var(--font-display);
  letter-spacing: 0.12em; border: none; border-radius: 8px; cursor: pointer;
  background: linear-gradient(135deg, var(--pink), var(--purple), var(--blue));
  color: #fff; box-shadow: 0 0 24px rgba(255,45,120,0.4); transition: all 0.15s;
  -webkit-tap-highlight-color: transparent; position: relative; overflow: hidden;
}
.submit-btn:active { transform: scale(0.97); opacity: 0.9; }

@media (orientation: landscape) and (max-height: 900px) {
  .cricket-board { padding: 6px 12px; gap: 5px; }
  .board-tile { min-height: 60px; }
}

@media (max-width: 768px) {
  .cricket-board { padding: 5px 8px; gap: 5px; }
  .board-tile { padding: 0 12px; min-height: 56px; }
  .target-label { font-size: 40px; width: 80px; }
  .pips-wrap { gap: 12px; }
  .pip { width: 44px; height: 44px; border-width: 2px; }
  .hit-badge { font-size: 16px; width: 52px; }
  .closed-badge { width: 52px; font-size: 9px; }
  .submit-row { padding: 10px 12px; padding-bottom: calc(10px + env(safe-area-inset-bottom)); }
  .submit-btn { height: 54px; font-size: 18px; }
}
</style>
