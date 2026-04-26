<template>
  <div class="game" v-if="game">
    <div class="game-body">

      <!-- Entry panel -->
      <div class="entry-panel" :style="entryPanelStyle">
        <div class="turn-header" :style="{ '--player-color': currentPlayer.color }">
          <div class="turn-avatar" :style="{ background: currentPlayer.color, boxShadow: `0 0 20px ${currentPlayer.color}99` }">
            <img v-if="isPhoto(currentPlayer.avatarUrl)" :src="currentPlayer.avatarUrl!" alt="" />
            <span v-else>{{ currentPlayer.avatarUrl ?? '🎯' }}</span>
          </div>
          <div class="turn-player-info">
            <span class="turn-label">THROWING NOW</span>
            <span class="turn-name display" :style="{ color: currentPlayer.color, filter: `drop-shadow(0 0 12px ${currentPlayer.color}80)` }">{{ currentPlayer.name }}</span>
          </div>
          <button v-ripple class="btn btn-sm btn-surface scores-btn" @click="showAllScores = !showAllScores">SCORES</button>
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

      <!-- Scores sidebar (always visible) -->
      <div class="scores-sidebar">
        <div class="sb-game-info">
          <span class="sb-game-type">{{ GAME_TYPE_LABELS[game.gameType] }}</span>
          <span class="sb-round">Round {{ game.round }}</span>
        </div>
        <div class="sb-players">
          <div
            v-for="p in game.players" :key="p.id"
            class="sb-player-row"
            :class="{ active: p.id === currentPlayer.id }"
            :style="p.id === currentPlayer.id ? { borderLeftColor: p.color } : {}"
          >
            <div class="sb-avatar" :style="{ background: p.color }">
              <img v-if="isPhoto(p.avatarUrl)" :src="p.avatarUrl!" alt="" style="width:100%;height:100%;object-fit:cover" />
              <span v-else>{{ p.avatarUrl ?? '🎯' }}</span>
            </div>
            <div class="sb-info">
              <span class="sb-name" :style="p.id === currentPlayer.id ? { color: p.color } : {}">{{ p.name }}</span>
              <span v-if="p.id === currentPlayer.id" class="sb-throwing">throwing</span>
            </div>
            <span class="sb-score" :style="p.id === currentPlayer.id ? { color: p.color } : {}">{{ displayScore(p.id) }}</span>
          </div>
        </div>
        <div class="sb-footer">
          <button v-ripple class="btn btn-sm btn-surface" @click="showAllScores = true">Detail</button>
          <button v-ripple class="btn btn-sm btn-danger" @click="confirmQuit = true">Quit</button>
        </div>
      </div>
    </div>

    <!-- Fullscreen scores overlay -->
    <div v-if="showAllScores" class="scores-overlay">
      <div class="lb-header">
        <div>
          <div class="game-type-badge">{{ GAME_TYPE_LABELS[game.gameType] }}</div>
          <div class="round-label">Round {{ game.round }}</div>
        </div>
        <div style="display:flex;gap:8px;align-items:center">
          <button v-ripple class="btn btn-sm btn-surface" @click="showAddPlayer = !showAddPlayer">+ Add</button>
          <button v-ripple class="btn btn-sm btn-surface" @click="showAllScores = false">✕</button>
          <button v-ripple class="btn btn-sm btn-danger" @click="confirmQuit = true">Quit</button>
        </div>
      </div>

      <!-- Add player picker -->
      <div v-if="showAddPlayer" class="add-player-panel">
        <div v-if="availablePlayers.length === 0" class="add-player-empty">All saved players are already in this game.</div>
        <button
          v-for="p in availablePlayers" :key="p.id"
          v-ripple
          class="add-player-row"
          @click="gameStore.addPlayerToGame(p); showAddPlayer = false"
        >
          <div class="add-player-avatar" :style="{ background: p.color }">
            <img v-if="p.avatarUrl?.startsWith('data:') || p.avatarUrl?.startsWith('http')" :src="p.avatarUrl" alt="" />
            <span v-else>{{ p.avatarUrl ?? '🎯' }}</span>
          </div>
          <span class="add-player-name">{{ p.name }}</span>
          <span class="add-player-cta">Add →</span>
        </button>
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
import { usePlayersStore } from '../stores/players'
import { GAME_TYPE_LABELS, CRICKET_TARGETS, type PlayerScore, type CricketTarget } from '../types/index'
import CricketEntry from '../components/CricketEntry.vue'
import NumpadEntry from '../components/NumpadEntry.vue'
import SimpleEntry from '../components/SimpleEntry.vue'
type OhOneScore = Extract<PlayerScore, { kind: 'ohOne' }>
type CricketHits = Record<string | number, number>

const router = useRouter()
const gameStore = useGameStore()
const playersStore = usePlayersStore()
const game = computed(() => gameStore.game)
const confirmQuit = ref(false)
const showAllScores = ref(false)
const showAddPlayer = ref(false)

const availablePlayers = computed(() =>
  playersStore.players.filter(p => !game.value?.players.some(gp => gp.id === p.id))
)
const lbScrollRef = ref<HTMLElement | null>(null)

const currentPlayer = computed(() => game.value!.players[game.value!.currentPlayerIndex]!)
const otherPlayers = computed(() => game.value!.players.filter(p => p.id !== currentPlayer.value.id))

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
    const active = lbScrollRef.value?.querySelector?.('.lb-player-row.active')
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
.game { display: flex; flex-direction: column; width: 100vw; height: 100dvh; overflow: hidden; position: relative; }
.game-body { flex: 1; display: flex; flex-direction: row; overflow: hidden; min-height: 0; }

/* Entry panel */
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
.scores-btn { flex-shrink: 0; margin-left: auto; font-size: 11px; letter-spacing: 0.1em; }
.entry-body { flex: 1; display: flex; flex-direction: column; overflow: hidden; min-height: 0; }

/* Throw timer */
.throw-timer-bar { position: relative; height: 28px; background: rgba(255,255,255,0.05); border-bottom: 1px solid rgba(255,255,255,0.06); flex-shrink: 0; overflow: hidden; display: flex; align-items: center; cursor: pointer; user-select: none; }
.throw-timer-fill { position: absolute; left: 0; top: 0; bottom: 0; background: var(--blue); transition: width 1s linear, background 0.3s; }
.throw-timer-fill.urgent { background: var(--pink); }
.throw-timer-fill.paused { background: var(--text-muted); }
.throw-timer-text { position: relative; z-index: 1; font-size: 11px; font-weight: 800; letter-spacing: 0.1em; color: rgba(255,255,255,0.7); padding: 0 10px; font-family: var(--font-display); }
.throw-timer-text.urgent { color: #fff; }

/* Scores sidebar — always visible */
.scores-sidebar {
  width: 260px; flex-shrink: 0; display: flex; flex-direction: column;
  border-left: 1px solid rgba(255,255,255,0.08);
  background: rgba(255,255,255,0.02); overflow: hidden;
}
.sb-game-info {
  display: flex; flex-direction: column; padding: 14px 16px;
  padding-top: calc(14px + env(safe-area-inset-top));
  border-bottom: 1px solid rgba(255,255,255,0.06);
  background: rgba(255,255,255,0.03); flex-shrink: 0;
}
.sb-game-type { font-size: 13px; font-weight: 800; letter-spacing: 0.12em; text-transform: uppercase; color: var(--pink); font-family: var(--font-display); }
.sb-round { font-size: 11px; color: var(--text-muted); margin-top: 2px; letter-spacing: 0.08em; text-transform: uppercase; font-weight: 700; }
.sb-players { flex: 1; overflow-y: auto; padding: 10px; display: flex; flex-direction: column; gap: 6px; }
.sb-player-row {
  display: flex; align-items: center; gap: 10px; padding: 10px 12px;
  background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.07);
  border-left: 3px solid transparent; border-radius: 6px; transition: border-color 0.2s;
}
.sb-player-row.active { border-left-color: var(--pink); }
.sb-avatar { width: 34px; height: 34px; border-radius: 4px; display: flex; align-items: center; justify-content: center; font-size: 17px; flex-shrink: 0; overflow: hidden; }
.sb-info { flex: 1; display: flex; flex-direction: column; gap: 1px; min-width: 0; }
.sb-name { font-size: 13px; font-weight: 800; font-family: var(--font-display); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; letter-spacing: 0.03em; }
.sb-throwing { font-size: 9px; font-weight: 700; letter-spacing: 0.1em; text-transform: uppercase; color: var(--text-muted); }
.sb-score { font-size: 48px; font-weight: 900; font-family: var(--font-display); flex-shrink: 0; line-height: 1; }
.sb-footer {
  display: flex; gap: 8px; padding: 10px;
  padding-bottom: calc(10px + env(safe-area-inset-bottom));
  border-top: 1px solid rgba(255,255,255,0.06); flex-shrink: 0;
}
.sb-footer .btn { flex: 1; }

/* Fullscreen scores overlay */
.scores-overlay {
  position: absolute; inset: 0; z-index: 10;
  display: flex; flex-direction: column;
  background: #0a0a0a;
}
.lb-header {
  display: flex; align-items: center; justify-content: space-between; padding: 16px 20px;
  padding-top: calc(16px + env(safe-area-inset-top));
  border-bottom: 1px solid rgba(255,255,255,0.06);
  background: rgba(255,255,255,0.03); backdrop-filter: blur(20px); -webkit-backdrop-filter: blur(20px); flex-shrink: 0;
}
.game-type-badge { font-size: 15px; font-weight: 800; letter-spacing: 0.12em; text-transform: uppercase; color: var(--pink); font-family: var(--font-display); }
.round-label { font-size: 11px; color: var(--text-muted); margin-top: 2px; letter-spacing: 0.08em; text-transform: uppercase; font-weight: 700; }
.lb-players-scroll { flex: 1; min-height: 0; overflow-y: auto; }
.lb-players { display: flex; flex-direction: column; gap: 0; padding: 0; }
.lb-player-row {
  display: flex; align-items: center; gap: 14px; padding: 20px 28px;
  background: transparent; border: none; border-left: 6px solid transparent;
  border-bottom: 1px solid rgba(255,255,255,0.06);
  transition: border-color 0.2s, background 0.2s; position: relative;
}
.lb-player-row.active { border-left-color: var(--active-color, var(--pink)); }
.active-dot { display: none; }
.lb-avatar { width: 64px; height: 64px; border-radius: 4px; display: flex; align-items: center; justify-content: center; font-size: 34px; flex-shrink: 0; overflow: hidden; border: 2px solid rgba(255,255,255,0.1); }
.lb-avatar img { width: 100%; height: 100%; object-fit: cover; }
.lb-player-info { flex: 1; display: flex; flex-direction: column; gap: 10px; min-width: 0; }
.lb-player-name { font-size: 32px; font-weight: 900; font-family: var(--font-display); letter-spacing: 0.05em; display: flex; align-items: center; gap: 10px; color: #fff; }
.throwing-tag { font-size: 9px; font-weight: 800; letter-spacing: 0.1em; text-transform: uppercase; background: rgba(255,255,255,0.12); border-radius: 3px; padding: 2px 5px; font-family: var(--font-body); }
.cricket-mini { display: flex; flex-wrap: nowrap; gap: 4px; }
.mini-target { display: flex; flex-direction: column; align-items: center; gap: 4px; flex: 1; min-width: 0; background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.12); border-radius: 5px; padding: 6px 2px; }
.mini-label { font-size: 28px; font-weight: 800; color: rgba(255,255,255,0.9); letter-spacing: 0.02em; font-family: var(--font-display); }
.mini-marks { display: flex; gap: 3px; }
.mini-pip { width: 10px; height: 10px; border-radius: 50%; border: 1.5px solid rgba(255,255,255,0.25); background: rgba(255,255,255,0.05); transition: background 0.1s; flex-shrink: 0; }
.mini-pip.filled { background: var(--pink); border-color: var(--pink); box-shadow: 0 0 6px rgba(255,45,120,0.8); }
.lb-score { display: flex; flex-direction: column; align-items: flex-end; flex-shrink: 0; }
.lb-score-val { font-size: 28vw; font-weight: 900; font-family: var(--font-display); line-height: 1; color: #fff; }
.lb-score-label { font-size: 13px; color: rgba(255,255,255,0.45); font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase; text-align: right; }
.remove-player-btn { background: none; border: 1px solid rgba(255,255,255,0.1); border-radius: 4px; color: rgba(255,255,255,0.3); cursor: pointer; font-size: 12px; padding: 4px 7px; flex-shrink: 0; transition: all 0.15s; align-self: flex-start; position: relative; overflow: hidden; }
.remove-player-btn:hover { border-color: #ef4444; color: #ef4444; }

/* Add player panel */
.add-player-panel {
  flex-shrink: 0; border-bottom: 1px solid rgba(255,255,255,0.08);
  background: rgba(255,255,255,0.03); display: flex; flex-direction: column;
}
.add-player-empty { padding: 16px 24px; font-size: 13px; color: var(--text-muted); }
.add-player-row {
  display: flex; align-items: center; gap: 14px; padding: 12px 24px;
  background: none; border: none; border-bottom: 1px solid rgba(255,255,255,0.05);
  cursor: pointer; text-align: left; width: 100%; transition: background 0.15s;
  -webkit-tap-highlight-color: transparent; position: relative; overflow: hidden;
}
.add-player-row:last-child { border-bottom: none; }
.add-player-row:active { background: rgba(255,255,255,0.06); }
.add-player-avatar {
  width: 40px; height: 40px; border-radius: 6px; display: flex; align-items: center;
  justify-content: center; font-size: 20px; flex-shrink: 0; overflow: hidden;
}
.add-player-avatar img { width: 100%; height: 100%; object-fit: cover; }
.add-player-name { flex: 1; font-size: 18px; font-weight: 800; font-family: var(--font-display); color: #fff; letter-spacing: 0.03em; }
.add-player-cta { font-size: 13px; font-weight: 700; color: var(--pink); letter-spacing: 0.08em; flex-shrink: 0; }

/* Misc */
.no-game { display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 24px; width: 100vw; height: 100dvh; }
.confirm-card { background: #1a1a1a; min-width: 300px; border: 1px solid rgba(255,255,255,0.1); border-radius: 12px; }
.confirm-card .q-card-actions { padding: 12px 16px 16px; gap: 10px; }

@media (orientation: landscape) and (max-height: 900px) {
  .turn-header { padding: 6px 16px; padding-top: calc(6px + env(safe-area-inset-top)); gap: 12px; }
  .turn-avatar { width: 40px; height: 40px; font-size: 20px; }
  .turn-name { font-size: 22px; }
}

@media (max-width: 768px) {
  .game { position: fixed; inset: 0; }
  .game-body { flex-direction: column; }
  .entry-panel { flex: 1; width: 100%; min-height: 0; }
  .scores-sidebar { width: 100%; height: auto; flex-shrink: 0; border-left: none; border-top: 1px solid rgba(255,255,255,0.08); flex-direction: row; align-items: center; padding: 0; }
  .sb-game-info { display: none; }
  .sb-players { flex-direction: row; flex: 1; padding: 6px 8px; gap: 6px; overflow-x: auto; overflow-y: hidden; flex-wrap: nowrap; align-items: center; }
  .sb-player-row { flex-shrink: 0; flex-direction: column; align-items: center; gap: 4px; padding: 8px 10px; border-left: none; border-bottom: 3px solid transparent; border-radius: 6px; }
  .sb-player-row.active { border-bottom-color: var(--pink); border-left-color: transparent; }
  .sb-avatar { width: 28px; height: 28px; font-size: 14px; }
  .sb-info { align-items: center; }
  .sb-name { font-size: 11px; }
  .sb-throwing { display: none; }
  .sb-score { font-size: 36px; }
  .sb-footer { display: none; }
  .turn-header { padding: 10px 14px; padding-top: 10px; gap: 10px; }
  .turn-avatar { width: 40px; height: 40px; font-size: 20px; }
  .turn-name { font-size: 22px; }
  .scores-btn { margin-left: 6px; }
  .lb-player-row { padding: 16px 20px; }
  .lb-avatar { width: 48px; height: 48px; font-size: 24px; }
  .lb-player-name { font-size: 24px; }
  .lb-score-val { font-size: 32vw; }
  .mini-label { font-size: 22px; }
  .mini-pip { width: 8px; height: 8px; }
}
</style>
