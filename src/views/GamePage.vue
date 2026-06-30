<template>
  <div class="game" v-if="game">
    <div class="game-body">

      <!-- Entry panel -->
      <div class="entry-panel" :style="entryPanelStyle">
        <div class="turn-header" :style="{ '--player-color': currentPlayer.color }">
          <!-- Player box -->
          <div class="turn-player-box">
            <div class="turn-player-info">
              <span class="turn-name display" :style="{ color: currentPlayerNameColor, filter: `drop-shadow(0 0 12px ${currentPlayer.color}80)` }">{{ currentPlayer.name }}</span>
            </div>
          </div>

          <!-- Timer inline, expands to fill -->
          <div v-if="throwTimerDuration > 0" class="throw-timer-bar" @click="toggleThrowPause">
            <div
              class="throw-timer-fill"
              :class="{ urgent: throwTimeLeft <= 10, paused: throwPaused }"
              :style="{ width: `${(throwTimeLeft / throwTimerDuration) * 100}%`, transition: throwPaused ? 'none' : 'width 1s linear' }"
            />
            <span class="throw-timer-text" :class="{ urgent: throwTimeLeft <= 10 }">
              {{ settingsStore.disableTimerPause ? throwTimeLeft + 's' : throwPaused ? '⏸ PAUSED' : throwTimeLeft + 's' }}
            </span>
            <span v-if="settingsStore.disableTimerPause" class="throw-timer-lock">🔒</span>
          </div>
          <div v-else class="throw-timer-spacer" />

          <button v-ripple class="btn btn-sm btn-surface scores-btn" @click="showAllScores = !showAllScores">SCORES</button>
          <template v-if="game.gameType === 'cricket' || game.gameType === 'cutThroat'">
            <button v-ripple class="btn btn-sm btn-surface marks-layout-btn" @click="toggleMarksLayout" :title="marksLayout === 'top' ? 'Move marks to right column' : 'Move marks to top strip'">
              {{ marksLayout === 'top' ? '▶' : '▼' }}
            </button>
            <button
              v-ripple
              class="btn btn-sm btn-gold submit-header-btn"
              :disabled="cricketEntryRef?.submitted"
              @click="cricketEntryRef?.submit()"
            >SUBMIT TURN</button>
          </template>
        </div>

        <!-- Cricket marks grid: top strip (default) -->
        <template v-if="(game.gameType === 'cricket' || game.gameType === 'cutThroat') && marksLayout === 'top'">

          <!-- 1-3 players: players as rows, targets as columns -->
          <div v-if="game.players.length < 4" class="cricket-strip">
            <div class="cs-header">
              <div class="cs-name-col"></div>
              <div v-for="t in CRICKET_TARGETS" :key="t" class="cs-target-head" :style="{ color: currentPlayerNameColor }">{{ t === 'bull' ? 'B' : t }}</div>
            </div>
            <div
              v-for="p in game.players" :key="p.id"
              class="cs-row"
              :class="{ 'cs-active': p.id === currentPlayer.id }"
              :style="p.id === currentPlayer.id ? { borderLeftColor: p.color } : {}"
            >
              <div class="cs-name" :style="p.id === currentPlayer.id ? { color: p.color } : {}">{{ p.name }}</div>
              <div v-for="t in CRICKET_TARGETS" :key="t" class="cs-cell"
                :class="{ 'cs-closed': (getCricketMarks(p.id)?.[t] ?? 0) >= 3 }">
                <span v-for="n in 3" :key="n" class="cs-pip"
                  :class="{ filled: (getCricketMarks(p.id)?.[t] ?? 0) >= n }"
                  :style="(getCricketMarks(p.id)?.[t] ?? 0) >= n ? { background: p.color, boxShadow: `0 0 4px ${p.color}` } : {}"
                />
              </div>
            </div>
          </div>

          <!-- 4+ players: transposed — targets as rows, players as columns -->
          <div v-else class="cricket-strip cricket-strip-transposed">
            <div class="cst-header">
              <div class="cst-target-col"></div>
              <div v-for="p in game.players" :key="p.id" class="cst-player-head"
                :style="{ color: p.color }">
                {{ p.name }}
              </div>
            </div>
            <div v-for="t in CRICKET_TARGETS" :key="t" class="cst-row">
              <div class="cst-target-label" :style="{ color: currentPlayerNameColor }">{{ t === 'bull' ? 'B' : t }}</div>
              <div v-for="p in game.players" :key="p.id" class="cst-cell"
                :class="{ 'cs-closed': (getCricketMarks(p.id)?.[t] ?? 0) >= 3 }"
                :style="p.id === currentPlayer.id ? { background: p.color + '10' } : {}">
                <span v-for="n in 3" :key="n" class="cs-pip"
                  :class="{ filled: (getCricketMarks(p.id)?.[t] ?? 0) >= n }"
                  :style="(getCricketMarks(p.id)?.[t] ?? 0) >= n ? { background: p.color, boxShadow: `0 0 4px ${p.color}` } : {}"
                />
              </div>
            </div>
          </div>

        </template>

        <div class="entry-body">
          <CricketEntry
            v-if="game.gameType === 'cricket' || game.gameType === 'cutThroat'"
            ref="cricketEntryRef"
            :key="currentPlayer.id"
            :playerId="currentPlayer.id"
            :scores="game.scores"
            :isCutThroat="game.gameType === 'cutThroat'"
            :round="game.round"
            :closedTargetDisplay="currentPlayer.cricketTargetDisplay ?? game.closedTargetDisplay"
            :avatarUrl="currentPlayer.avatarUrl"
            :playerColor="currentPlayer.color"
            :playerBackground="currentPlayer.playerBackground"
            :targetLabelColor="currentPlayer.targetLabelColor"
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
            :hint="horseHint"
            @submit="handleNumpadSubmit"
          />
        </div>
      </div>

      <!-- Cricket marks grid: right column (optional layout) -->
      <div v-if="(game.gameType === 'cricket' || game.gameType === 'cutThroat') && marksLayout === 'right'" class="cricket-col">
        <!-- Player name headers -->
        <div class="cc-header">
          <div class="cc-target-label" style="min-width:0"></div>
          <div v-for="p in game.players" :key="p.id" class="cc-player-head"
            :style="{ color: p.color }">
            {{ p.name }}
          </div>
        </div>
        <!-- One row per target -->
        <div v-for="t in CRICKET_TARGETS" :key="t" class="cc-target-row">
          <div class="cc-target-label" :style="{ color: currentPlayerNameColor }">{{ t === 'bull' ? 'B' : t }}</div>
          <div v-for="p in game.players" :key="p.id" class="cc-cell"
            :class="{ 'cc-closed': (getCricketMarks(p.id)?.[t] ?? 0) >= 3 }">
            <span v-for="n in 3" :key="n" class="cs-pip"
              :class="{ filled: (getCricketMarks(p.id)?.[t] ?? 0) >= n }"
              :style="(getCricketMarks(p.id)?.[t] ?? 0) >= n ? { background: p.color, boxShadow: `0 0 4px ${p.color}` } : {}"
            />
          </div>
        </div>
      </div>

      <!-- Score reveal overlay — oh-one games -->
      <Transition name="score-reveal">
        <div v-if="showScoreReveal && revealData" class="score-reveal-overlay" :class="{ 'bust-overlay': revealData.isBust }">
          <template v-if="revealData.isBust">
            <div class="reveal-label" style="background:#7f1d1d">BUST</div>
            <template v-if="game.bustEliminates">
              <div class="reveal-eliminated" :style="{ color: revealData.playerColor, filter: `drop-shadow(0 0 40px ${revealData.playerColor}80)` }">ELIMINATED</div>
              <div class="reveal-bust-msg">Better luck next time 👋</div>
            </template>
            <template v-else>
              <div class="reveal-number" :style="{ color: revealData.playerColor, filter: `drop-shadow(0 0 40px ${revealData.playerColor}80)` }">{{ revealData.remaining }}</div>
              <div class="reveal-bust-msg">No change — next player 👋</div>
            </template>
          </template>
          <template v-else>
            <div class="reveal-label">REMAINING</div>
            <div class="reveal-number" :style="{ color: revealData.playerColor, filter: `drop-shadow(0 0 40px ${revealData.playerColor}80)` }">
              {{ revealData.remaining }}
            </div>
          </template>
        </div>
      </Transition>
    </div>

    <!-- Fullscreen scores overlay -->
    <div v-if="showAllScores" class="scores-overlay">
      <div class="lb-header">
        <div>
          <div class="game-type-badge">{{ GAME_TYPE_LABELS[game.gameType] }}</div>
          <div class="round-label">Round {{ game.round }}</div>
        </div>
        <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap;justify-content:flex-end">
          <div v-if="game.gameType === 'cricket' || game.gameType === 'cutThroat'" class="ct-display-row">
            <button v-for="opt in ctDisplayOptions" :key="opt.value" v-ripple
              class="ct-display-btn" :class="{ active: game.closedTargetDisplay === opt.value }"
              @click="gameStore.setClosedTargetDisplay(opt.value)">{{ opt.label }}</button>
          </div>
          <button v-ripple class="btn btn-sm btn-surface" @click="showAddPlayer = !showAddPlayer">+ Add</button>
          <button v-ripple class="btn btn-sm btn-surface" @click="showAllScores = false">✕</button>
          <button v-ripple class="btn btn-sm btn-danger" @click="confirmQuit = true">Quit</button>
        </div>
      </div>

      <!-- Timer controls -->
      <div class="timer-controls-row">
        <div class="timer-control-group">
          <span class="timer-control-label">Walk-up</span>
          <div class="timer-control-btns">
            <button v-ripple class="timer-ctrl-btn" :class="{ active: game.timerDuration === 0 }" @click="gameStore.setTimerDuration(0)">Off</button>
            <button v-for="t in TIMER_OPTIONS" :key="t" v-ripple class="timer-ctrl-btn" :class="{ active: game.timerDuration === t }" @click="gameStore.setTimerDuration(t)">{{ t }}s</button>
          </div>
        </div>
        <div class="timer-control-group">
          <span class="timer-control-label">Throw</span>
          <div class="timer-control-btns">
            <button v-ripple class="timer-ctrl-btn" :class="{ active: game.throwTimerDuration === 0 }" @click="gameStore.setThrowTimerDuration(0)">Off</button>
            <button v-for="t in TIMER_OPTIONS" :key="t" v-ripple class="timer-ctrl-btn" :class="{ active: game.throwTimerDuration === t }" @click="gameStore.setThrowTimerDuration(t)">{{ t }}s</button>
          </div>
        </div>
        <div class="timer-control-group">
          <span class="timer-control-label">Pause</span>
          <div class="timer-control-btns">
            <button v-ripple class="timer-ctrl-btn" :class="{ active: !settingsStore.disableTimerPause }" @click="settingsStore.setDisableTimerPause(false)">Allow</button>
            <button v-ripple class="timer-ctrl-btn" :class="{ active: settingsStore.disableTimerPause }" @click="settingsStore.setDisableTimerPause(true)">Lock</button>
          </div>
        </div>
        <div class="timer-control-group">
          <span class="timer-control-label">Narrator</span>
          <div class="timer-control-btns">
            <button v-ripple class="timer-ctrl-btn" :class="{ active: !settingsStore.cleanMode }" @click="settingsStore.setCleanMode(false)">Normal</button>
            <button v-ripple class="timer-ctrl-btn" :class="{ active: settingsStore.cleanMode }" @click="settingsStore.setCleanMode(true)">Clean</button>
          </div>
        </div>
      </div>

      <!-- Add player picker -->
      <div v-if="showAddPlayer" class="add-player-panel">
        <button v-ripple class="add-player-row add-player-create" @click="router.push('/player-setup?addToGame=true'); showAddPlayer = false; showAllScores = false">
          <span class="add-player-name" style="color: var(--pink)">+ Create New Player</span>
        </button>
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
            :class="{
              active: p.id === currentPlayer.id,
              'ptc-finished': game.cricketPlayToCompletion && game.cricketFinishOrder.includes(p.id)
            }"
            :style="p.id === currentPlayer.id ? { '--active-color': p.color, background: p.color + '12', boxShadow: `0 0 20px ${p.color}20` } : {}"
          >
            <div class="active-dot" :style="{ background: p.color, opacity: p.id === currentPlayer.id ? 1 : 0 }" />
            <div class="lb-avatar" :style="{ background: p.color, boxShadow: p.id === currentPlayer.id ? `0 0 14px ${p.color}99` : '0 0 0 transparent' }">
              <img v-if="isPhoto(p.avatarUrl)" :src="p.avatarUrl!" alt="" />
              <span v-else>{{ p.avatarUrl ?? '🎯' }}</span>
            </div>
            <div class="lb-player-info">
              <span class="lb-player-name" :style="p.id === currentPlayer.id ? { color: '#fff' } : {}">
                {{ p.name }}
                <span v-if="p.id === currentPlayer.id" class="throwing-tag">throwing</span>
                <span v-else-if="game.cricketPlayToCompletion && game.cricketFinishOrder.includes(p.id)" class="finished-tag">finished</span>
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
              <span class="lb-score-val" :style="p.id === currentPlayer.id ? { color: '#fff' } : {}">{{ displayScore(p.id) }}</span>
              <span class="lb-score-label">{{ scoreLabel }}</span>
            </div>
            <button v-if="game.players.length > 2 && !(game.cricketPlayToCompletion && game.cricketFinishOrder.includes(p.id))" v-ripple class="remove-player-btn" @click.stop="gameStore.removePlayerFromGame(p.id)" title="Remove from game">✕</button>
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
import { useSettingsStore } from '../stores/settings'
import { GAME_TYPE_LABELS, CRICKET_TARGETS, PLAYER_THEMES, type PlayerScore, type CricketTarget } from '../types/index'
import { speak } from '../composables/useSpeech'
import { playCountdownBeep, unlockAudio } from '../composables/useSounds'

const WHITE_LABEL_THEMES = new Set<string | null>(
  PLAYER_THEMES
    .filter(t => ['Magma', 'Steel', 'Obsidian', 'Blood', 'Oil Slick', 'Midnight'].includes(t.label))
    .map(t => t.value as string | null)
)
import CricketEntry from '../components/CricketEntry.vue'
import NumpadEntry from '../components/NumpadEntry.vue'
import SimpleEntry from '../components/SimpleEntry.vue'
type OhOneScore = Extract<PlayerScore, { kind: 'ohOne' }>
type CricketHits = Record<string | number, number>

const router = useRouter()
const gameStore = useGameStore()
const playersStore = usePlayersStore()
const settingsStore = useSettingsStore()
const game = computed(() => gameStore.game)
const confirmQuit = ref(false)
const showAllScores = ref(false)
const showAddPlayer = ref(false)
const marksLayout = ref<'top' | 'right'>(
  (localStorage.getItem('cricketMarksLayout') as 'top' | 'right') ?? 'top'
)
function toggleMarksLayout() {
  marksLayout.value = marksLayout.value === 'top' ? 'right' : 'top'
  localStorage.setItem('cricketMarksLayout', marksLayout.value)
}
const cricketEntryRef = ref<InstanceType<typeof CricketEntry> | null>(null)

const TIMER_OPTIONS = [60, 90, 120, 180]

const ctDisplayOptions = [
  { value: 'show'   as const, label: 'Normal' },
  { value: 'fade'   as const, label: 'Fade' },
  { value: 'strike' as const, label: 'Strike' },
  { value: 'hide'   as const, label: 'Hide' },
]

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
  if ((gt === 'cricket' || gt === 'cutThroat') && game.value?.cricketPlayToCompletion) return 'place'
  if (gt === 'cricket' || gt === 'cutThroat') return 'pts'
  if (['301','501','701','1001'].includes(gt)) return 'left'
  if (gt === 'horse') return 'letters'
  return 'total'
})

const horseHint = computed((): string | null => {
  if (game.value?.gameType !== 'horse') return null
  if (game.value.currentPlayerIndex === 0) return 'You set the target — throw your best score'
  const p0 = game.value.players[0]
  if (!p0) return null
  const p0Score = game.value.scores[p0.id]
  if (p0Score?.kind !== 'horse') return null
  const target = p0Score.data.history.at(-1)
  return target !== undefined ? `Target to beat: ${target}` : null
})

function isPhoto(url: string | null) { return url?.startsWith('data:') || url?.startsWith('http') }
function getCricketMarks(playerId: string) {
  const s = game.value?.scores[playerId]
  return s?.kind === 'cricket' ? s.data.marks : null
}
function ordinal(n: number): string {
  const s = ['th', 'st', 'nd', 'rd']
  const v = n % 100
  return n + (s[(v - 20) % 10] ?? s[v] ?? s[0]!)
}
function displayScore(playerId: string): string {
  const s = game.value?.scores[playerId]
  if (!s) return '—'
  if (s.kind === 'cricket' && game.value?.cricketPlayToCompletion) {
    const pos = game.value.cricketFinishOrder.indexOf(playerId)
    return pos >= 0 ? ordinal(pos + 1) : '—'
  }
  if (s.kind === 'ohOne') return String(s.data.remaining)
  if (s.kind === 'cricket') return String(s.data.points)
  if (s.kind === 'simple') return String(s.data.total)
  if (s.kind === 'horse') return s.data.letters === 0 ? '—' : 'HORSE'.slice(0, s.data.letters)
  if (s.kind === 'suddenDeath') return String(s.data.total)
  if (s.kind === 'bobs27') return s.data.busted ? 'BUST' : String(s.data.score)
  return '—'
}
function handleCricketSubmit(marks: CricketHits) { unlockAudio(); gameStore.submitScore(currentPlayer.value.id, marks as Record<CricketTarget, number>) }

// Score reveal (oh-one games)
const showScoreReveal = ref(false)
const revealData = ref<{ remaining: number; playerColor: string; isBust: boolean } | null>(null)
let pendingRevealNavigation = false
let revealTimeout: ReturnType<typeof setTimeout> | null = null

function handleNumpadSubmit(score: number) {
  unlockAudio()
  const isOhOne = ['301','501','701','1001'].includes(game.value?.gameType ?? '')
  if (!isOhOne) { gameStore.submitScore(currentPlayer.value.id, score); return }

  // Capture state before submission changes the active player
  const player = currentPlayer.value
  const currentScore = game.value?.scores[player.id]
  const currentRemaining = currentScore?.kind === 'ohOne' ? currentScore.data.remaining : 0
  const newRemaining = currentRemaining - score
  const isBust = newRemaining < 0

  pendingRevealNavigation = true
  gameStore.submitScore(player.id, score)

  // Checkout — go straight to win screen
  if (game.value?.status === 'finished') {
    pendingRevealNavigation = false
    router.push('/win')
    return
  }

  revealData.value = { remaining: isBust ? currentRemaining : Math.max(0, newRemaining), playerColor: player.color, isBust }
  showScoreReveal.value = true

  if (revealTimeout) clearTimeout(revealTimeout)
  revealTimeout = setTimeout(() => {
    showScoreReveal.value = false
    pendingRevealNavigation = false
    // On bust the store already advanced the turn; if game finished (last player busted out) go to win
    if (isBust && game.value?.status === 'finished') { router.push('/win'); return }
    navigateToBetween()
  }, isBust ? 3000 : 4000)
}

function quitGame() { gameStore.endGame(); router.push('/') }

function navigateToBetween() {
  router.push('/between')
}

// Throw timer
const throwTimerDuration = computed(() => settingsStore.disableThrowTimer ? 0 : (game.value?.throwTimerDuration ?? 0))
const throwTimeLeft = ref(0)
const throwPaused = ref(false)
let throwInterval: ReturnType<typeof setInterval> | null = null
let throwHurryUpSaid = false

function clearThrowTimer() { if (throwInterval) { clearInterval(throwInterval); throwInterval = null } }
function toggleThrowPause() { if (!settingsStore.disableTimerPause) throwPaused.value = !throwPaused.value }
function startThrowTimer() {
  clearThrowTimer()
  throwPaused.value = false
  throwHurryUpSaid = false
  if (!throwTimerDuration.value) return
  throwTimeLeft.value = throwTimerDuration.value
  throwInterval = setInterval(() => {
    if (throwPaused.value) return
    throwTimeLeft.value--
    if (throwTimeLeft.value > 0 && throwTimeLeft.value <= 5) playCountdownBeep()
    const half = Math.floor(throwTimerDuration.value / 2)
    if (throwTimeLeft.value === half && half > 30 && !settingsStore.cleanMode) speak(`${currentPlayer.value.name}, it's your turn`)
    if (throwTimeLeft.value <= 30 && !throwHurryUpSaid && !settingsStore.cleanMode) {
      throwHurryUpSaid = true
      const hurryCount = gameStore.playerHurryUpCounts[currentPlayer.value.id] ?? 0
      gameStore.recordHurryUp(currentPlayer.value.id)
      const line = hurryCount > 0
        ? `${currentPlayer.value.name}. Hurry the fuck up. It's your turn. This is why nobody wants to play darts with you.`
        : `${currentPlayer.value.name}. Hurry the fuck up. It's your turn.`
      speak(line)
    }
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
  const bg = game.value?.gameTheme ?? currentPlayer.value.playerBackground
  if (!bg) return {}
  if (bg.startsWith('data:') || bg.startsWith('http'))
    return { backgroundImage: `url(${bg})`, backgroundSize: 'cover', backgroundPosition: 'center' }
  return { background: bg }
})

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

const currentPlayerNameColor = computed(() => {
  const p = currentPlayer.value
  if (p.targetLabelColor) return p.targetLabelColor
  if (p.playerBackground && WHITE_LABEL_THEMES.has(p.playerBackground)) return '#ffffff'
  return complementaryColor(p.color)
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
onUnmounted(() => {
  clearThrowTimer()
  if (revealTimeout) clearTimeout(revealTimeout)
})

watch(() => game.value?.status, (status) => {
  if (status === 'between_turns') { clearThrowTimer(); if (!pendingRevealNavigation) navigateToBetween() }
  if (status === 'finished') { clearThrowTimer(); if (!pendingRevealNavigation) router.push('/win') }
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
  display: flex; align-items: stretch; gap: 0;
  padding-top: env(safe-area-inset-top);
  flex-shrink: 0; background: rgba(255,255,255,0.03); backdrop-filter: blur(20px); -webkit-backdrop-filter: blur(20px);
  border-bottom: 1px solid rgba(255,255,255,0.06); position: relative; min-height: 72px;
}
.turn-header::before { content: ''; position: absolute; left: 0; top: 0; bottom: 0; width: 4px; background: var(--player-color, var(--pink)); box-shadow: 0 0 12px var(--player-color, var(--pink)); z-index: 1; }

/* Player identity box */
.turn-player-box {
  display: flex; align-items: center; gap: 14px;
  padding: 12px 20px 12px 24px;
  border-right: 1px solid rgba(255,255,255,0.08);
  flex-shrink: 0;
}
.turn-avatar { width: 54px; height: 54px; border-radius: 6px; display: flex; align-items: center; justify-content: center; font-size: 28px; border: 2px solid rgba(255,255,255,0.15); overflow: hidden; flex-shrink: 0; }
.turn-avatar img { width: 100%; height: 100%; object-fit: cover; }
.turn-player-info { display: flex; flex-direction: column; gap: 4px; }
.turn-name { font-size: 64px; line-height: 1; letter-spacing: 0.05em; font-weight: 900; }

/* Timer — expands to fill remaining header space */
.throw-timer-bar { flex: 1; position: relative; background: rgba(255,255,255,0.05); overflow: hidden; display: flex; align-items: center; cursor: pointer; user-select: none; border-right: 1px solid rgba(255,255,255,0.08); }
.throw-timer-spacer { flex: 1; }
.throw-timer-fill { position: absolute; left: 0; top: 0; bottom: 0; background: #dc2626; transition: width 1s linear, background 0.3s; }
.throw-timer-fill.urgent { background: #ff1a1a; }
.throw-timer-fill.paused { background: var(--text-muted); }
.throw-timer-text { position: relative; z-index: 1; font-size: 22px; font-weight: 800; letter-spacing: 0.1em; color: rgba(255,255,255,0.7); padding: 0 16px; font-family: var(--font-display); }
.throw-timer-text.urgent { color: #fff; }
.throw-timer-lock { position: relative; z-index: 1; font-size: 14px; margin-left: -8px; opacity: 0.6; }

.submit-header-btn { flex-shrink: 0; align-self: center; margin-left: 16px; font-size: 14px; letter-spacing: 0.1em; padding: 12px 44px; }
.submit-header-btn:disabled { opacity: 0.4; }
.scores-btn { flex-shrink: 0; align-self: center; margin: 0 16px; font-size: 14px; letter-spacing: 0.1em; padding: 12px 40px; }
.entry-body { flex: 1; display: flex; flex-direction: column; overflow: hidden; min-height: 0; }

/* Cricket marks grid strip */
.cricket-strip {
  flex-shrink: 0; overflow-y: auto;
  background: rgba(0,0,0,0.4); border-bottom: 1px solid rgba(255,255,255,0.08);
  display: flex; flex-direction: column;
  scrollbar-width: none; max-height: 45vh;
}
.cricket-strip::-webkit-scrollbar { display: none; }
.cs-header {
  display: flex; align-items: center;
  padding: 4px 8px 2px;
  background: rgba(255,255,255,0.03); border-bottom: 1px solid rgba(255,255,255,0.06);
  position: sticky; top: 0; z-index: 1;
}
.cs-name-col { width: 72px; flex-shrink: 0; }
.cs-target-head {
  flex: 1; text-align: center;
  font-size: 11px; font-weight: 800; letter-spacing: 0.08em;
  color: rgba(255,255,255,0.45); font-family: var(--font-display);
}
.cs-row {
  display: flex; align-items: center;
  padding: 3px 8px; border-left: 3px solid transparent;
  border-bottom: 1px solid rgba(255,255,255,0.05);
  transition: border-color 0.2s;
}
.cs-active { background: rgba(255,255,255,0.04); }
.cs-name {
  width: 72px; flex-shrink: 0;
  font-size: 12px; font-weight: 800; letter-spacing: 0.03em;
  color: rgba(255,255,255,0.5); white-space: nowrap; overflow: hidden;
  text-overflow: ellipsis; font-family: var(--font-display);
}
.cs-cell {
  flex: 1; display: flex; justify-content: center; align-items: center; gap: 2px;
  padding: 1px 0;
}
.cs-closed { opacity: 0.35; }
.cs-pip {
  width: 7px; height: 7px; border-radius: 50%;
  border: 1.5px solid rgba(255,255,255,0.75);
  background: transparent; transition: background 0.1s;
}
.cs-pip.filled { border-color: transparent; }

/* Transposed top strip (4+ players): targets as rows, players as columns */
.cricket-strip-transposed { max-height: none; }
.cst-header {
  display: flex; align-items: center; padding: 3px 8px 2px;
  background: rgba(255,255,255,0.03); border-bottom: 1px solid rgba(255,255,255,0.06);
  position: sticky; top: 0; z-index: 1;
}
.cst-target-col { width: 28px; flex-shrink: 0; }
.cst-player-head {
  flex: 1; text-align: center; font-size: 10px; font-weight: 900;
  letter-spacing: 0.04em;
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
  font-family: var(--font-display);
}
.cst-row {
  display: flex; align-items: center; padding: 3px 8px;
  border-bottom: 1px solid rgba(255,255,255,0.05);
}
.cst-target-label {
  width: 28px; flex-shrink: 0; font-size: 11px; font-weight: 900;
  letter-spacing: 0.06em; color: #ffffff; font-family: var(--font-display);
}
.cst-cell {
  flex: 1; display: flex; justify-content: center; align-items: center; gap: 2px; padding: 1px 0;
}

/* Layout toggle button */
.marks-layout-btn { flex-shrink: 0; align-self: center; margin: 0 4px; padding: 12px 14px; font-size: 12px; }

/* Cricket marks right column */
.cricket-col {
  width: 130px; flex-shrink: 0; display: flex; flex-direction: column;
  border-left: 1px solid rgba(255,255,255,0.08);
  background: rgba(0,0,0,0.4); overflow-y: auto; scrollbar-width: none;
}
.cricket-col::-webkit-scrollbar { display: none; }
.cc-header {
  display: flex; flex-direction: row; align-items: center;
  padding: 6px 6px 4px;
  border-bottom: 1px solid rgba(255,255,255,0.06);
  background: rgba(255,255,255,0.03);
  position: sticky; top: 0; z-index: 1; flex-shrink: 0;
}
.cc-player-head {
  flex: 1; text-align: center;
  font-size: 10px; font-weight: 900; letter-spacing: 0.04em;
  white-space: nowrap; overflow: hidden;
  text-overflow: ellipsis; font-family: var(--font-display);
}
.cc-target-row {
  display: flex; flex-direction: row; align-items: center;
  padding: 5px 6px; border-bottom: 1px solid rgba(255,255,255,0.05); flex-shrink: 0;
}
.cc-target-label {
  width: 22px; flex-shrink: 0; text-align: center;
  font-size: 12px; font-weight: 900; letter-spacing: 0.06em;
  color: #ffffff; font-family: var(--font-display);
}
.cc-cell {
  flex: 1; display: flex; flex-direction: column; align-items: center; gap: 2px;
}
.cc-closed { opacity: 0.3; }

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
.lb-header .btn { padding: 8px 28px; font-size: 14px; }
.game-type-badge { font-size: 15px; font-weight: 800; letter-spacing: 0.12em; text-transform: uppercase; color: var(--pink); font-family: var(--font-display); }
.round-label { font-size: 11px; color: #fff; margin-top: 2px; letter-spacing: 0.08em; text-transform: uppercase; font-weight: 900; }
.lb-players-scroll { flex: 1; min-height: 0; display: flex; flex-direction: column; }
.lb-players { flex: 1; display: flex; flex-direction: column; gap: 0; padding: 0; }
.lb-player-row {
  flex: 1; min-height: 0; overflow: hidden;
  display: flex; align-items: center; gap: 14px; padding: 10px 20px;
  background: transparent; border: none; border-left: 6px solid transparent;
  border-bottom: 1px solid rgba(255,255,255,0.06);
  transition: border-color 0.2s, background 0.2s; position: relative;
}
.lb-player-row.active { border-left-color: var(--active-color, var(--pink)); }
.active-dot { display: none; }
.lb-avatar { width: 48px; height: 48px; border-radius: 4px; display: flex; align-items: center; justify-content: center; font-size: 24px; flex-shrink: 0; overflow: hidden; border: 2px solid rgba(255,255,255,0.1); }
.lb-avatar img { width: 100%; height: 100%; object-fit: cover; }
.lb-player-info { flex: 1; display: flex; flex-direction: column; gap: 6px; min-width: 0; }
.lb-player-name { font-size: 22px; font-weight: 900; font-family: var(--font-display); letter-spacing: 0.05em; display: flex; align-items: center; gap: 10px; color: #fff; }
.throwing-tag { font-size: 9px; font-weight: 800; letter-spacing: 0.1em; text-transform: uppercase; background: rgba(255,255,255,0.12); border-radius: 3px; padding: 2px 5px; font-family: var(--font-body); }
.finished-tag { font-size: 9px; font-weight: 800; letter-spacing: 0.1em; text-transform: uppercase; background: rgba(255,255,255,0.08); color: rgba(255,255,255,0.5); border-radius: 3px; padding: 2px 5px; font-family: var(--font-body); }
.lb-player-row.ptc-finished { opacity: 0.45; }
.cricket-mini { display: flex; flex-wrap: nowrap; gap: 4px; }
.mini-target { display: flex; flex-direction: column; align-items: center; gap: 3px; flex: 1; min-width: 0; background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.12); border-radius: 5px; padding: 6px 2px; }
.mini-label { font-size: 34px; font-weight: 800; color: rgba(255,255,255,0.9); letter-spacing: 0.02em; font-family: var(--font-display); }
.mini-marks { display: flex; gap: 2px; }
.mini-pip { width: 30px; height: 30px; border-radius: 50%; border: 2px solid rgba(255,255,255,0.5); background: rgba(255,255,255,0.12); transition: background 0.1s; flex-shrink: 0; }
.mini-pip.filled { background: var(--pink); border-color: var(--pink); box-shadow: 0 0 6px rgba(255,45,120,0.8); }
.lb-score { display: flex; flex-direction: column; align-items: flex-end; flex-shrink: 0; }
.lb-score-val { font-size: clamp(48px, 8dvh, 120px); font-weight: 900; font-family: var(--font-display); line-height: 1; color: #fff; }
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

/* Closed-target display selector in scores overlay */
.ct-display-row { display: flex; gap: 4px; }
.ct-display-btn {
  padding: 6px 12px; border-radius: 6px; border: 1px solid rgba(255,255,255,0.1);
  background: rgba(255,255,255,0.05); color: rgba(255,255,255,0.6);
  font-size: 12px; font-weight: 700; cursor: pointer; transition: all 0.15s;
  position: relative; overflow: hidden; white-space: nowrap;
  -webkit-tap-highlight-color: transparent;
}
.ct-display-btn:hover { background: rgba(255,255,255,0.1); color: #fff; }
.ct-display-btn.active { border-color: var(--pink); color: var(--pink); background: rgba(255,45,120,0.12); }

/* In-game timer controls */
.timer-controls-row {
  display: flex; gap: 16px; flex-wrap: wrap;
  padding: 10px 20px; border-bottom: 1px solid rgba(255,255,255,0.07);
  background: rgba(255,255,255,0.02); flex-shrink: 0;
}
.timer-control-group { display: flex; align-items: center; gap: 8px; }
.timer-control-label { font-size: 11px; font-weight: 700; letter-spacing: 0.12em; text-transform: uppercase; color: rgba(255,255,255,0.45); white-space: nowrap; min-width: 52px; }
.timer-control-btns { display: flex; gap: 4px; }
.timer-ctrl-btn {
  padding: 5px 10px; border-radius: 6px; border: 1px solid rgba(255,255,255,0.1);
  background: rgba(255,255,255,0.05); color: rgba(255,255,255,0.6);
  font-size: 12px; font-weight: 700; cursor: pointer; transition: all 0.15s;
  position: relative; overflow: hidden; white-space: nowrap;
  -webkit-tap-highlight-color: transparent;
}
.timer-ctrl-btn:hover { background: rgba(255,255,255,0.1); color: #fff; }
.timer-ctrl-btn.active { border-color: var(--blue); color: var(--blue); background: rgba(0,212,255,0.1); }

/* Score reveal overlay */
.score-reveal-overlay {
  position: absolute; inset: 0; z-index: 20;
  display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 12px;
  background: rgba(0,0,0,0.82); backdrop-filter: blur(10px); -webkit-backdrop-filter: blur(10px);
}
.reveal-label {
  font-size: 13px; font-weight: 800; letter-spacing: 0.35em; text-transform: uppercase;
  color: #fff; font-family: var(--font-display);
  background: #000; border-radius: 4px; padding: 4px 12px;
}
.reveal-number {
  font-size: clamp(100px, 22dvh, 200px); font-family: var(--font-display);
  font-weight: 900; line-height: 1; letter-spacing: 0.02em;
}
.bust-overlay { background: rgba(60,0,0,0.92) !important; }
.reveal-eliminated {
  font-size: clamp(72px, 16dvh, 140px); font-family: var(--font-display);
  font-weight: 900; line-height: 1; letter-spacing: 0.04em;
}
.reveal-bust-msg {
  font-size: 22px; font-weight: 700; color: rgba(255,255,255,0.6);
  letter-spacing: 0.08em;
}
.reveal-bust-tag {
  font-size: 22px; font-weight: 900; letter-spacing: 0.2em; color: #ef4444;
  background: rgba(239,68,68,0.15); border: 2px solid rgba(239,68,68,0.4);
  border-radius: 6px; padding: 6px 18px; font-family: var(--font-display);
}
.score-reveal-enter-active, .score-reveal-leave-active { transition: opacity 0.25s; }
.score-reveal-enter-from, .score-reveal-leave-to { opacity: 0; }

/* Misc */
.no-game { display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 24px; width: 100vw; height: 100dvh; }
.confirm-card { background: #1a1a1a; min-width: 300px; border: 1px solid rgba(255,255,255,0.1); border-radius: 12px; }
.confirm-card .q-card-actions { padding: 12px 16px 16px; gap: 10px; }

@media (orientation: landscape) and (max-height: 900px) {
  .turn-header { min-height: 52px; }
  .turn-player-box { padding: 6px 14px 6px 18px; gap: 10px; }
  .turn-avatar { width: 36px; height: 36px; font-size: 18px; }
  .turn-name { font-size: 34px; }
  .throw-timer-text { font-size: 16px; }
  .submit-header-btn { padding: 8px 18px; font-size: 12px; margin-left: 10px; }
  .scores-btn { padding: 8px 28px; font-size: 12px; margin: 0 10px; }
}

@media (max-width: 768px) {
  .game { position: fixed; inset: 0; }
  .entry-panel { flex: 1; min-height: 0; }
  .cricket-col { width: 100px; }
  .cc-player-head { font-size: 9px; }
  .cc-target-label { font-size: 10px; width: 18px; }
  .turn-header { min-height: 58px; }
  .turn-player-box { padding: 8px 12px 8px 16px; gap: 8px; }
  .turn-avatar { width: 38px; height: 38px; font-size: 18px; }
  .turn-name { font-size: 40px; }
  .throw-timer-text { font-size: 15px; padding: 0 10px; }
  .submit-header-btn { padding: 8px 14px; font-size: 12px; margin-left: 8px; }
  .scores-btn { padding: 8px 24px; font-size: 12px; margin: 0 10px; }
  .submit-row { padding: 8px 12px; padding-bottom: calc(8px + env(safe-area-inset-bottom)); }
  .submit-btn { height: 46px; font-size: 16px; }
  .lb-player-row { padding: 8px 16px; }
  .lb-avatar { width: 40px; height: 40px; font-size: 20px; }
  .lb-player-name { font-size: 18px; }
  .lb-score-val { font-size: clamp(48px, 8dvh, 120px); }
  .mini-label { font-size: 26px; }
  .mini-pip { width: 22px; height: 22px; }
}
</style>
