<template>
  <div class="cricket">
    <!-- Single avatar watermark behind the whole board -->
    <div class="board-avatar-bg" aria-hidden="true">
      <img v-if="avatarUrl?.startsWith('data:') || avatarUrl?.startsWith('http')" :src="avatarUrl" alt="" />
      <span v-else-if="avatarUrl">{{ avatarUrl }}</span>
    </div>

    <div class="cricket-board-scroll">
      <TransitionGroup tag="div" name="tile-vanish" class="cricket-board">
        <button
          v-for="target in CRICKET_TARGETS"
          :key="target"
          v-show="closedTargetDisplay !== 'hide' || !myClosed(target)"
          v-ripple
          class="board-tile"
          :class="{
            closed: myClosed(target) && closedTargetDisplay === 'show',
            'closed-fade': myClosed(target) && closedTargetDisplay === 'fade',
            'closed-strike': myClosed(target) && closedTargetDisplay === 'strike',
            active: (roundHits[target] ?? 0) > 0
          }"
          :disabled="myClosed(target)"
          @click="handleTileClick(target)"
        >
          <span class="target-label" :style="{ color: targetColor, filter: `drop-shadow(0 0 12px ${targetColor})` }">{{ target === 'bull' ? '🎯' : target }}</span>

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
      </TransitionGroup>
    </div>

    <!-- Corner avatar: bottom-right -->
    <div v-if="avatarUrl" class="corner-avatar" aria-hidden="true">
      <img v-if="avatarUrl.startsWith('data:') || avatarUrl.startsWith('http')" :src="avatarUrl" alt="" />
      <span v-else>{{ avatarUrl }}</span>
    </div>

    <div class="submit-row">
      <span v-if="totalHitsThisRound > 0" class="hits-text">
        {{ totalHitsThisRound }} hit{{ totalHitsThisRound !== 1 ? 's' : '' }} this round
      </span>
      <span v-else class="muted">Round {{ round }}</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { CRICKET_TARGETS, PLAYER_THEMES, type CricketTarget, type PlayerScore } from '../types/index'
import { playShotgun, playBuzzer } from '../composables/useSounds'
import { speak } from '../composables/useSpeech'
import { useSettingsStore } from '../stores/settings'

const settingsStore = useSettingsStore()

const props = defineProps<{
  playerId: string
  scores: Record<string, PlayerScore>
  isCutThroat: boolean
  round: number
  closedTargetDisplay?: 'show' | 'hide' | 'fade' | 'strike'
  avatarUrl?: string | null
  playerColor?: string
  playerBackground?: string | null
  targetLabelColor?: string | null
}>()

const WHITE_LABEL_THEMES = new Set<string | null>(
  PLAYER_THEMES
    .filter(t => ['Magma', 'Steel', 'Obsidian', 'Blood', 'Oil Slick', 'Midnight'].includes(t.label))
    .map(t => t.value as string | null)
)

function complementaryColor(hex: string): string {
  if (!hex.startsWith('#') || hex.length < 7) return hex
  const r = parseInt(hex.slice(1,3), 16) / 255
  const g = parseInt(hex.slice(3,5), 16) / 255
  const b = parseInt(hex.slice(5,7), 16) / 255
  const max = Math.max(r,g,b), min = Math.min(r,g,b)
  let h = 0, s = 0
  const l = (max + min) / 2
  if (max !== min) {
    const d = max - min
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min)
    if (max === r) h = ((g - b) / d + (g < b ? 6 : 0)) / 6
    else if (max === g) h = ((b - r) / d + 2) / 6
    else h = ((r - g) / d + 4) / 6
  }
  h = (h + 0.5) % 1
  return `hsl(${Math.round(h * 360)}, ${Math.round(s * 100)}%, ${Math.round(l * 100)}%)`
}

const targetColor = computed(() => {
  if (props.targetLabelColor) return props.targetLabelColor
  if (props.playerBackground && WHITE_LABEL_THEMES.has(props.playerBackground)) return '#ffffff'
  return props.playerColor ? complementaryColor(props.playerColor) : 'var(--pink)'
})

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
  const next = current >= max ? 0 : current + 1
  roundHits.value = { ...roundHits.value, [target]: next }
  if (target === 'bull' && next > current) {
    const s = settingsStore.bullseyeSound
    if (s === 'buzzer') playBuzzer()
    else if (s === 'tts-bullseye') speak('Bullseye!')
    else if (s === 'tts-oh-baby') speak('Oh babyyy')
    else if (s === 'tts-oh-yeah') speak('Oh yeah, right in the bull motherfucker')
    else playShotgun()
  }
}
function submit() {
  if (submitted.value) return
  submitted.value = true
  const hits: Record<CricketTarget, number> = {} as Record<CricketTarget, number>
  for (const t of CRICKET_TARGETS) hits[t] = roundHits.value[t] ?? 0
  emit('submit', hits)
  roundHits.value = {}
}

defineExpose({ submit, submitted })
</script>

<style scoped>
.cricket { flex: 1; display: flex; flex-direction: column; overflow: hidden; min-height: 0; position: relative; }

.cricket-board-scroll { flex: 1; min-height: 0; overflow-y: auto; position: relative; z-index: 1; }

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
  flex: 1; min-height: 48px;
  background: rgba(0,0,0,0.72); border: 2px solid rgba(255,255,255,0.35); border-radius: 8px;
  cursor: pointer; transition: all 0.15s; -webkit-tap-highlight-color: transparent; text-align: left;
  position: relative; overflow: hidden;
}
.board-tile:not(:disabled):active { transform: scale(0.98); }
.board-tile.active { border-color: var(--pink); background: rgba(180,0,60,0.92); box-shadow: 0 0 32px rgba(255,45,120,0.35); }
.board-tile.closed { opacity: 0.3; cursor: default; }
.board-tile.closed-fade { opacity: 0.12; cursor: default; }
.board-tile.closed-strike { opacity: 0.45; filter: grayscale(0.7); cursor: default; }
.board-tile.closed-strike::after {
  content: ''; position: absolute; inset: 0; pointer-events: none; z-index: 2;
  background: linear-gradient(transparent 46%, rgba(255,255,255,0.45) 46%, rgba(255,255,255,0.45) 54%, transparent 54%);
}

.target-label { font-size: clamp(100px, 17dvh, 190px); font-family: var(--font-display); letter-spacing: 0.05em; width: clamp(130px, 18dvh, 210px); flex-shrink: 0; display: flex; align-items: center; overflow: hidden; }
.pips-wrap { display: flex; align-items: stretch; gap: 20px; flex: 1; padding: 14px 0; }
.pip { flex: 1; min-width: 0; border-radius: 10px; border: 3px solid rgba(255,255,255,0.35); background: rgba(255,255,255,0.08); display: block; transition: all 0.2s; }
.pip.existing { background: var(--pink); border-color: var(--pink); box-shadow: 0 0 20px rgba(255,45,120,1), 0 0 40px rgba(255,45,120,0.5); }
.pip.round { background: var(--pink); border-color: var(--pink); box-shadow: 0 0 16px rgba(255,45,120,0.6); }

.closed-badge { font-size: 12px; font-weight: 800; letter-spacing: 0.1em; color: var(--pink); text-transform: uppercase; font-family: var(--font-display); opacity: 0.7; width: 80px; text-align: right; flex-shrink: 0; align-self: center; }
.hit-badge { font-size: 22px; font-weight: 900; font-family: var(--font-display); color: var(--pink); width: 80px; text-align: right; flex-shrink: 0; filter: drop-shadow(0 0 8px rgba(255,45,120,0.6)); align-self: center; }
.hit-badge.invisible { opacity: 0; }

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
  padding: 16px 20px; padding-bottom: calc(16px + env(safe-area-inset-bottom));
  border-top: 1px solid rgba(255,255,255,0.08); background: rgba(255,255,255,0.03);
  backdrop-filter: blur(16px); -webkit-backdrop-filter: blur(16px); flex-shrink: 0; gap: 16px;
  position: relative; z-index: 1;
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
  .cricket-board-scroll { overflow: hidden; display: flex; flex-direction: column; }
  .cricket-board { flex: 1; height: 100%; min-height: 0; padding: 3px 12px; gap: 3px; }
  .board-tile { min-height: 0; padding: 2px 14px; }
  .target-label { font-size: clamp(28px, 6dvh, 60px); width: clamp(70px, 10dvh, 120px); }
  .pips-wrap { gap: 8px; padding: 6px 0; }
  .pip { border-radius: 6px; border-width: 2px; }
  .hit-badge { font-size: 16px; width: 52px; }
  .closed-badge { width: 52px; font-size: 9px; }
  .submit-row { padding: 4px 16px; padding-bottom: calc(4px + env(safe-area-inset-bottom)); }
  .submit-btn { height: 36px; font-size: 14px; }
}

@media (max-width: 768px) {
  .cricket-board { padding: 5px 8px; gap: 5px; }
  .board-tile { padding: 6px 12px; min-height: 56px; }
  .target-label { font-size: clamp(60px, 11dvh, 100px); width: clamp(90px, 12dvh, 130px); }
  .pips-wrap { gap: 16px; }
  .hit-badge { font-size: 16px; width: 52px; }
  .closed-badge { width: 52px; font-size: 9px; }
  .submit-row { padding: 8px 12px; padding-bottom: calc(8px + env(safe-area-inset-bottom)); }
  .submit-btn { height: 46px; font-size: 16px; }
}
</style>
