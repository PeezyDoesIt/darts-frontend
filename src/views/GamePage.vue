<template>
  <div class="game" v-if="game">
    <div class="game-body">

      <!-- LEFT: Leaderboard -->
      <div class="leaderboard-panel" :class="{ fullscreen: showAllScores }" v-show="showAllScores">
        <div class="lb-header">
          <div>
            <div class="game-type-badge">{{ GAME_TYPE_LABELS[game.gameType] }}</div>
            <div class="round-label">Round {{ game.round }}</div>
          </div>
          <div style="display:flex;gap:8px;align-items:center">
            <button v-ripple class="btn btn-sm btn-surface" @click="showAllScores = false">✕</button>
            <button v-ripple class="btn btn-sm btn-danger" @click="confirmQuit = true">Quit</button>
          </div>
        </div>

        <div class="lb-players-scroll" ref="lbScrollRef">
          <div class="lb-players">
            <div
              v-for="p in game.players" :key="p.id"
              class="lb-player-row"
              :class="{ active: p.id === currentPlayer.id }"
              :style="p.id === currentPlayer.id ? { '--active-color': p.color, background: p.color + '12', boxShadow: `0 0 20px ${p.color}20` } : {}"
            >
              <div class="active-dot" :style="{ background: p.color, opacity: p.id === currentPlayer.id ? 1 : 0 }" />
              <div class="lb-avatar" :style="{ background: p.color, boxShadow: p.id === currentPlayer.id ? `0 0 14px ${p.color}99` : '0 0 0 transparent' }">
                <img v-if="isPhoto(p.avatarUrl)" :src="p.avatarUrl!" alt="" />
                <span v-else>{{ p.avatarUrl ?? '🎯' }}</span>
              </div>
              <div class="lb-player-info">
                <span class="lb-player-name" :style="p.id === currentPlayer.id ? { color: p.color } : {}">
                  {{ p.name }}
                  <span v-if="p.id === currentPlayer.id" class="throwing-tag">throwing</span>
                </span>
                <div v-if="game.gameType === 'cricket' || game.gameType === 'cutThroat'" class="cricket-mini">
                  <div v-for="t in CRICKET_TARGETS" :key="t" class="mini-target">
                    <span class="mini-label">{{ t === 'bull' ? 'B' : t }}</span>
                    <div class="mini-marks">
                      <span v-for="n in 3" :key="n" class="mini-pip" :class="{ filled: (getCricketMarks(p.id)?.[t] ?? 0) >= n }" />
                    </div>
                  </div>
                </div>
              </div>
              <div class="lb-score">
                <span class="lb-score-val" :style="p.id === currentPlayer.id ? { color: p.color } : {}">{{ displayScore(p.id) }}</span>
                <span class="lb-score-label">{{ scoreLabel }}</span>
              </div>
              <button v-if="game.players.length > 2" v-ripple class="remove-player-btn" @click.stop="gameStore.removePlayerFromGame(p.id)" title="Remove from game">✕</button>
            </div>
          </div>
        </div>

        <div class="up-next-strip" v-if="upNext.length > 0">
          <span class="up-next-title">UP NEXT</span>
          <div class="up-next-chips">
            <div v-for="p in upNext" :key="p.id" class="up-next-chip" :style="{ borderColor: p.color }">
              <div class="chip-avatar" :style="{ background: p.color }">{{ p.avatarUrl ?? '🎯' }}</div>
              <span>{{ p.name }}</span>
            </div>
          </div>
        </div>
      </div>

      <!-- RIGHT: Entry panel -->
      <div class="entry-panel" v-show="!showAllScores" :style="entryPanelStyle">
        <div class="turn-header" :style="{ '--player-color': currentPlayer.color }">
          <div class="turn-avatar" :style="{ background: currentPlayer.color, boxShadow: `0 0 20px ${currentPlayer.color}99` }">
            <img v-if="isPhoto(currentPlayer.avatarUrl)" :src="currentPlayer.avatarUrl!" alt="" />
            <span v-else>{{ currentPlayer.avatarUrl ?? '🎯' }}</span>
          </div>
          <div class="turn-player-info">
            <span class="turn-label">THROWING NOW</span>
            <span class="turn-name display" :style="{ color: currentPlayer.color, filter: `drop-shadow(0 0 12px ${currentPlayer.color}80)` }">{{ currentPlayer.name }}</span>
          </div>
          <div class="turn-score-area">
            <span class="turn-score-val" :style="{ color: currentPlayer.color }">{{ displayScore(currentPlayer.id) }}</span>
            <span class="turn-score-label">{{ scoreLabel }}</span>
          </div>
          <button v-ripple class="btn btn-sm btn-surface scores-btn" @click="showAllScores = !showAllScores">
            {{ showAllScores ? 'HIDE' : 'SCORES' }}
          </button>
        </div>

        <div v-if="throwTimerDuration > 0" class="throw-timer-bar" @click="toggleThrowPause">
          <div
            class="throw-timer-fill"
            :class="{ urgent: throwTimeLeft <= 10, paused: throwPaused }"
            :style="{ width: `${(throwTimeLeft / throwTimerDuration) * 100}%`, transition: throwPaused ? 'none' : 'width 1s linear' }"
          />
          <span class="throw-timer-text" :class="{ urgent: throwTimeLeft <= 10 }">
            {{ throwPaused ? '⏸ PAUSED' : throwTimeLeft + 's' }}
          </span>
        </div>

        <!-- Portrait: big score display between header and entry controls -->
        <div class="portrait-score">
          <span class="portrait-score-val" :style="{ color: currentPlayer.color, filter: `drop-shadow(0 0 24px ${currentPlayer.color}60)` }">{{ displayScore(currentPlayer.id) }}</span>
          <span class="portrait-score-label">{{ scoreLabel }}</span>
        </div>

        <div class="entry-body">
          <CricketEntry
            v-if="game.gameType === 'cricket' || game.gameType === 'cutThroat'"
            :key="currentPlayer.id"
            :playerId="currentPlayer.id"
            :scores="game.scores"
            :isCutThroat="game.gameType === 'cutThroat'"
            @submit="handleCricketSubmit"
          />
          <NumpadEntry
            v-else-if="['301','501','701','1001'].includes(game.gameType)"
            :key="currentPlayer.id"
            :remaining="(game.scores[currentPlayer.id] as OhOneScore).data.remaining"
            @submit="handleNumpadSubmit"
          />
          <SimpleEntry
            v-else
            :key="currentPlayer.id"
            :gameType="game.gameType"
            :round="game.round"
            @submit="handleNumpadSubmit"
          />
        </div>
      </div>
    </div>

    <!-- Quit confirm dialog -->
    <q-dialog v-model="confirmQuit">
      <q-card dark class="confirm-card">
        <q-card-section>
          <div class="text-h6">Quit this game?</div>
          <div class="text-body2 text-grey-5 q-mt-sm">Progress will be lost.</div>
        </q-card-section>
        <q-card-actions align="right">
          <button v-ripple class="btn btn-surface btn-sm" @click="confirmQuit = false">Cancel</button>
          <button v-ripple class="btn btn-danger btn-sm" @click="quitGame">Quit</button>
        </q-card-actions>
      </q-card>
    </q-dialog>
  </div>

  <div v-else class="no-game">
    <p>No active game.</p>
    <button v-ripple class="btn btn-gold btn-lg" @click="router.push('/')">Go Home</button>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch, nextTick, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { useGameStore } from '../stores/game'
import { GAME_TYPE_LABELS, CRICKET_TARGETS, type PlayerScore, type CricketTarget } from '../types/index'
import CricketEntry from '../components/CricketEntry.vue'
import NumpadEntry from '../components/NumpadEntry.vue'
import SimpleEntry from '../components/SimpleEntry.vue'
import type { QScrollArea } from 'quasar'

type OhOneScore = Extract<PlayerScore, { kind: 'ohOne' }>
type CricketHits = Record<string | number, number>

const router = useRouter()
const gameStore = useGameStore()
const game = computed(() => gameStore.game)
const confirmQuit = ref(false)
const showAllScores = ref(false)
const lbScrollRef = ref<InstanceType<typeof QScrollArea> | null>(null)

const currentPlayer = computed(() => game.value!.players[game.value!.currentPlayerIndex]!)

const upNext = computed(() => {
  if (!game.value) return []
  const { players, currentPlayerIndex } = game.value
  const result = []
  for (let i = 1; i < players.length; i++) result.push(players[(currentPlayerIndex + i) % players.length]!)
  return result
})

const scoreLabel = computed(() => {
  const gt = game.value?.gameType
  if (!gt) return ''
  if (gt === 'cricket' || gt === 'cutThroat') return 'pts'
  if (['301','501','701','1001'].includes(gt)) return 'left'
  return 'total'
})

function isPhoto(url: string | null) { return url?.startsWith('data:') || url?.startsWith('http') }
function getCricketMarks(playerId: string) {
  const s = game.value?.scores[playerId]
  return s?.kind === 'cricket' ? s.data.marks : null
}
function displayScore(playerId: string): string {
  const s = game.value?.scores[playerId]
  if (!s) return '—'
  if (s.kind === 'ohOne') return String(s.data.remaining)
  if (s.kind === 'cricket') return String(s.data.points)
  if (s.kind === 'simple') return String(s.data.total)
  return '—'
}
function handleCricketSubmit(marks: CricketHits) { gameStore.submitScore(currentPlayer.value.id, marks as Record<CricketTarget, number>) }
function handleNumpadSubmit(score: number) { gameStore.submitScore(currentPlayer.value.id, score) }
function quitGame() { gameStore.endGame(); router.push('/') }

// Throw timer
const throwTimerDuration = computed(() => game.value?.throwTimerDuration ?? 0)
const throwTimeLeft = ref(0)
const throwPaused = ref(false)
let throwInterval: ReturnType<typeof setInterval> | null = null

function clearThrowTimer() { if (throwInterval) { clearInterval(throwInterval); throwInterval = null } }
function toggleThrowPause() { throwPaused.value = !throwPaused.value }
function startThrowTimer() {
  clearThrowTimer()
  throwPaused.value = false
  if (!throwTimerDuration.value) return
  throwTimeLeft.value = throwTimerDuration.value
  throwInterval = setInterval(() => {
    if (throwPaused.value) return
    throwTimeLeft.value--
    if (throwTimeLeft.value <= 0) {
      clearThrowTimer()
      gameStore.recordTimeout(currentPlayer.value.id)
      const gt = game.value?.gameType
      if (gt === 'cricket' || gt === 'cutThroat') handleCricketSubmit({} as Record<CricketTarget, number>)
      else handleNumpadSubmit(0)
    }
  }, 1000)
}

const entryPanelStyle = computed(() => {
  const bg = currentPlayer.value.playerBackground
  if (!bg || bg.startsWith('data:') || bg.startsWith('http')) return {}
  return { background: bg }
})

function scrollActivePlayerIntoView() {
  nextTick(() => {
    const el = lbScrollRef.value?.getScrollTarget()
    const active = el?.querySelector?.('.lb-player-row.active')
    active?.scrollIntoView?.({ behavior: 'smooth', block: 'nearest' })
  })
}

onMounted(() => {
  if (game.value?.status === 'playing') startThrowTimer()
  scrollActivePlayerIntoView()
})
onUnmounted(() => clearThrowTimer())

watch(() => game.value?.status, (status) => {
  if (status === 'between_turns') { clearThrowTimer(); router.push('/between') }
  if (status === 'finished') { clearThrowTimer(); router.push('/win') }
  if (status === 'playing') startThrowTimer()
})
watch(() => game.value?.currentPlayerIndex, () => {
  if (game.value?.status === 'playing') startThrowTimer()
  scrollActivePlayerIntoView()
})
</script>

<style scoped>
.game { display: flex; flex-direction: column; width: 100vw; height: 100dvh; overflow: hidden; }
.game-body { flex: 1; display: flex; flex-direction: row; overflow: hidden; min-height: 0; }

/* LEFT */
.leaderboard-panel {
  width: 50%; display: flex; flex-direction: column;
  border-right: 1px solid rgba(255,255,255,0.06);
  overflow: hidden; background: rgba(255,255,255,0.02);
}
.leaderboard-panel.fullscreen {
  width: 100%; flex: 1; max-height: none; border-right: none;
}
.leaderboard-panel.fullscreen .lb-players { gap: 0; padding: 0; }
.leaderboard-panel.fullscreen .lb-player-row { padding: 20px 28px; border-radius: 0; border-left-width: 6px; border-top: none; border-right: none; border-bottom: 1px solid rgba(255,255,255,0.06); }
.leaderboard-panel.fullscreen .lb-avatar { width: 64px; height: 64px; font-size: 34px; }
.leaderboard-panel.fullscreen .lb-player-name { font-size: 32px; }
.leaderboard-panel.fullscreen .lb-score-val { font-size: 28vw; }
.leaderboard-panel.fullscreen .lb-score-label { font-size: 13px; }
.lb-header {
  display: flex; align-items: center; justify-content: space-between; padding: 16px 20px;
  padding-top: calc(16px + env(safe-area-inset-top));
  border-bottom: 1px solid rgba(255,255,255,0.06);
  background: rgba(255,255,255,0.03); backdrop-filter: blur(20px); -webkit-backdrop-filter: blur(20px); flex-shrink: 0;
}
.game-type-badge { font-size: 15px; font-weight: 800; letter-spacing: 0.12em; text-transform: uppercase; color: var(--pink); font-family: var(--font-display); }
.round-label { font-size: 11px; color: var(--text-muted); margin-top: 2px; letter-spacing: 0.08em; text-transform: uppercase; font-weight: 700; }

.lb-players-scroll { flex: 1; min-height: 0; overflow-y: auto; }
.lb-players { display: flex; flex-direction: column; gap: 8px; padding: 14px; }
.lb-player-row {
  display: flex; align-items: center; gap: 14px; padding: 14px 16px; border-radius: 6px;
  background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.07);
  border-left: 4px solid transparent; transition: border-color 0.2s, background 0.2s, box-shadow 0.2s; position: relative;
}
.lb-player-row.active { border-left-color: var(--active-color, var(--pink)); }
.active-dot { display: none; }

.lb-avatar { width: 44px; height: 44px; border-radius: 4px; display: flex; align-items: center; justify-content: center; font-size: 22px; flex-shrink: 0; overflow: hidden; border: 2px solid rgba(255,255,255,0.1); transition: box-shadow 0.2s; }
.lb-avatar img { width: 100%; height: 100%; object-fit: cover; }
.lb-player-info { flex: 1; display: flex; flex-direction: column; gap: 10px; min-width: 0; }
.lb-player-name { font-size: 22px; font-weight: 900; font-family: var(--font-display); letter-spacing: 0.05em; display: flex; align-items: center; gap: 10px; transition: color 0.2s; color: #fff; }
.throwing-tag { font-size: 9px; font-weight: 800; letter-spacing: 0.1em; text-transform: uppercase; background: rgba(255,255,255,0.12); border-radius: 3px; padding: 2px 5px; font-family: var(--font-body); }
.cricket-mini { display: flex; flex-wrap: nowrap; gap: 4px; }
.mini-target { display: flex; flex-direction: column; align-items: center; gap: 4px; flex: 1; min-width: 0; background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.12); border-radius: 5px; padding: 6px 2px; }
.mini-label { font-size: 11px; font-weight: 800; color: rgba(255,255,255,0.75); letter-spacing: 0.02em; font-family: var(--font-display); }
.mini-marks { display: flex; gap: 3px; }
.mini-pip { width: 10px; height: 10px; border-radius: 50%; border: 1.5px solid rgba(255,255,255,0.25); background: rgba(255,255,255,0.05); transition: background 0.1s; flex-shrink: 0; }
.mini-pip.filled { background: var(--pink); border-color: var(--pink); box-shadow: 0 0 6px rgba(255,45,120,0.8); }
.lb-score { display: flex; flex-direction: column; align-items: flex-end; flex-shrink: 0; }
.lb-score-val { font-size: 64px; font-weight: 900; font-family: var(--font-display); line-height: 1; color: #fff; transition: color 0.2s; }
.lb-score-label { font-size: 11px; color: rgba(255,255,255,0.45); font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase; text-align: right; }
.remove-player-btn { background: none; border: 1px solid rgba(255,255,255,0.1); border-radius: 4px; color: rgba(255,255,255,0.3); cursor: pointer; font-size: 12px; padding: 4px 7px; flex-shrink: 0; transition: all 0.15s; align-self: flex-start; margin-top: 2px; position: relative; overflow: hidden; }
.remove-player-btn:hover { border-color: #ef4444; color: #ef4444; }

.up-next-strip { border-top: 1px solid rgba(255,255,255,0.06); padding: 10px 14px; padding-bottom: calc(10px + env(safe-area-inset-bottom)); background: rgba(255,255,255,0.03); display: flex; align-items: center; gap: 12px; flex-shrink: 0; }
.up-next-title { font-size: 9px; font-weight: 800; letter-spacing: 0.2em; color: var(--text-muted); flex-shrink: 0; text-transform: uppercase; font-family: var(--font-display); }
.up-next-chips { display: flex; gap: 6px; flex-wrap: wrap; }
.up-next-chip { display: flex; align-items: center; gap: 5px; padding: 3px 8px 3px 3px; border: 1px solid rgba(255,255,255,0.12); border-radius: 3px; font-size: 12px; font-weight: 700; font-family: var(--font-display); background: rgba(255,255,255,0.03); }
.chip-avatar { width: 22px; height: 22px; border-radius: 2px; display: flex; align-items: center; justify-content: center; font-size: 11px; }

/* RIGHT */
.entry-panel { flex: 1; display: flex; flex-direction: column; overflow: hidden; position: relative; }
.turn-header {
  display: flex; align-items: center; gap: 18px; padding: 16px 24px;
  padding-top: calc(16px + env(safe-area-inset-top));
  flex-shrink: 0; background: rgba(255,255,255,0.03); backdrop-filter: blur(20px); -webkit-backdrop-filter: blur(20px);
  border-bottom: 1px solid rgba(255,255,255,0.06); position: relative;
}
.turn-header::before { content: ''; position: absolute; left: 0; top: 0; bottom: 0; width: 4px; background: var(--player-color, var(--pink)); box-shadow: 0 0 12px var(--player-color, var(--pink)); }
.turn-avatar { width: 60px; height: 60px; border-radius: 6px; display: flex; align-items: center; justify-content: center; font-size: 30px; border: 2px solid rgba(255,255,255,0.15); overflow: hidden; flex-shrink: 0; }
.turn-avatar img { width: 100%; height: 100%; object-fit: cover; }
.turn-player-info { display: flex; flex-direction: column; gap: 2px; }
.turn-label { font-size: 9px; font-weight: 800; letter-spacing: 0.2em; color: var(--text-muted); text-transform: uppercase; }
.turn-name { font-size: 36px; line-height: 1; letter-spacing: 0.05em; }
.turn-score-area { margin-left: auto; display: flex; flex-direction: column; align-items: flex-end; flex-shrink: 0; }
.turn-score-val { font-size: 120px; font-weight: 900; font-family: var(--font-display); line-height: 1; transition: color 0.2s; }
.turn-score-label { font-size: 11px; color: rgba(255,255,255,0.45); font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase; }
.scores-btn { flex-shrink: 0; margin-left: 12px; font-size: 11px; letter-spacing: 0.1em; }
.portrait-score { display: none; }
.entry-body { flex: 1; display: flex; flex-direction: column; overflow: hidden; min-height: 0; }

/* Throw timer */
.throw-timer-bar { position: relative; height: 28px; background: rgba(255,255,255,0.05); border-bottom: 1px solid rgba(255,255,255,0.06); flex-shrink: 0; overflow: hidden; display: flex; align-items: center; cursor: pointer; user-select: none; }
.throw-timer-fill { position: absolute; left: 0; top: 0; bottom: 0; background: var(--blue); transition: width 1s linear, background 0.3s; }
.throw-timer-fill.urgent { background: var(--pink); }
.throw-timer-fill.paused { background: var(--text-muted); }
.throw-timer-text { position: relative; z-index: 1; font-size: 11px; font-weight: 800; letter-spacing: 0.1em; color: rgba(255,255,255,0.7); padding: 0 10px; font-family: var(--font-display); }
.throw-timer-text.urgent { color: #fff; }

/* Misc */
.no-game { display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 24px; width: 100vw; height: 100dvh; }
.confirm-card { background: #1a1a1a; min-width: 300px; border: 1px solid rgba(255,255,255,0.1); border-radius: 12px; }
.confirm-card .q-card-actions { padding: 12px 16px 16px; gap: 10px; }

@media (max-width: 768px) {
  .game { position: fixed; inset: 0; }
  .game-body { flex-direction: column; }
  .entry-panel { flex: 1; width: 100%; min-height: 0; order: 0; }
  .leaderboard-panel { width: 100%; flex-shrink: 0; order: 1; border-right: none; border-top: 1px solid rgba(255,255,255,0.06); max-height: 38vh; }
  .leaderboard-panel.fullscreen { max-height: none; width: 100%; order: 0; border-top: none; }
  .leaderboard-panel.fullscreen .lb-score-val { font-size: 32vw; }
  .leaderboard-panel.fullscreen .lb-player-name { font-size: 24px; }
  .leaderboard-panel.fullscreen .lb-avatar { width: 48px; height: 48px; font-size: 24px; }
  .leaderboard-panel.fullscreen .lb-player-row { padding: 16px 20px; }
  .lb-players-scroll { flex: 1; min-height: 0; overflow-y: auto; }
  .lb-header { padding: 10px 14px; padding-top: 10px; }
  .lb-player-row { padding: 8px 10px; }
  .lb-player-info { gap: 5px; }
  .lb-avatar { width: 34px; height: 34px; font-size: 16px; }
  .lb-player-name { font-size: 14px; }
  .cricket-mini { gap: 3px; }
  .mini-target { padding: 4px 2px; }
  .mini-label { font-size: 9px; }
  .mini-pip { width: 8px; height: 8px; }
  .mini-marks { gap: 2px; }
  .lb-score-val { font-size: 36px; }
  .up-next-strip { display: none; }
  .turn-header { padding: 10px 14px; padding-top: 10px; gap: 10px; }
  .turn-avatar { width: 40px; height: 40px; font-size: 20px; }
  .turn-name { font-size: 22px; }
  .turn-score-val { font-size: 80px; }
  .scores-btn { margin-left: 6px; }
}

@media (orientation: portrait) {
  .turn-score-area { display: none; }
  .portrait-score {
    display: flex; flex-direction: column; align-items: center; justify-content: center;
    flex: 1; min-height: 0;
  }
  .portrait-score-val {
    font-size: 40vw; font-weight: 900; font-family: var(--font-display); line-height: 1; transition: color 0.2s;
  }
  .portrait-score-label {
    font-size: 13px; color: rgba(255,255,255,0.45); font-weight: 700; letter-spacing: 0.1em; text-transform: uppercase; margin-top: 6px;
  }
  .entry-body { flex: 0 0 auto; }
}
</style>
