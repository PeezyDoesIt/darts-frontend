<template>
  <div class="game-page">
    <div class="drip-bar" />

    <!-- FINISHED OVERLAY -->
    <div v-if="game && game.status === 'finished'" class="finish-overlay" :style="{ background: `radial-gradient(ellipse at center, ${winner?.color}40 0%, #0a0a0a 80%)` }">
      <div class="finish-scroll">
        <div class="finish-inner">
          <div class="trophy-wrap">
            <span class="trophy">🏆</span>
            <div class="trophy-glow" :style="{ background: winner?.color }" />
          </div>
          <div class="finish-over display">GAME OVER</div>
          <div class="winner-name display" :style="{ color: winner?.color, filter: `drop-shadow(0 0 20px ${winner?.color})` }">{{ winner?.name }}</div>
          <div class="winner-sub">wins with {{ winner ? grandTotal(winnerScorecard!) : 0 }} points</div>

          <div class="finish-rankings">
            <div
              v-for="(ps, rank) in rankedPlayers"
              :key="ps.player.id"
              class="rank-row"
              :class="{ 'rank-winner': ps.player.id === game.winnerId }"
              :style="ps.player.id === game.winnerId ? { borderColor: ps.player.color, background: `${ps.player.color}20` } : {}"
            >
              <span class="rank-place display" :style="rank === 0 ? { color: ps.player.color } : {}">{{ rank + 1 }}</span>
              <div class="rank-avatar" :style="{ background: ps.player.color }">
                <img v-if="isPhoto(ps.player.avatarUrl)" :src="ps.player.avatarUrl!" alt="" />
                <span v-else>{{ ps.player.avatarUrl ?? '🎯' }}</span>
              </div>
              <span class="rank-name">{{ ps.player.name }}</span>
              <span class="rank-score" :style="ps.player.id === game.winnerId ? { color: ps.player.color } : {}">
                {{ grandTotal(ps.scorecard) }}
              </span>
            </div>
          </div>

          <div class="finish-actions">
            <button v-ripple class="btn btn-spray btn-xl" @click="playAgain">Play Again</button>
            <button v-ripple class="btn btn-outline btn-lg" @click="goHome">Home</button>
          </div>
        </div>
      </div>
    </div>

    <!-- PLAYING UI -->
    <template v-if="game && game.status === 'playing'">
      <!-- TURN HEADER -->
      <div class="turn-header" :style="{ background: `linear-gradient(180deg, ${currentPlayer?.color}18 0%, transparent 100%)`, borderBottomColor: currentPlayer?.color + '40' }">
        <div class="turn-left">
          <div class="turn-avatar" :style="{ background: currentPlayer?.color, boxShadow: `0 0 16px ${currentPlayer?.color}80` }">
            <img v-if="isPhoto(currentPlayer?.avatarUrl)" :src="currentPlayer!.avatarUrl!" alt="" />
            <span v-else>{{ currentPlayer?.avatarUrl ?? '🎯' }}</span>
          </div>
        </div>
        <div class="turn-center">
          <span class="turn-name display" :style="{ color: currentPlayer?.color, filter: `drop-shadow(0 0 28px ${currentPlayer?.color}) drop-shadow(0 0 8px ${currentPlayer?.color})` }">{{ currentPlayer?.name }}</span>
        </div>
        <div class="turn-right">
          <span class="turn-total display" :style="{ color: currentPlayer?.color }">{{ grandTotal(game.playerStates[game.currentPlayerIndex]!.scorecard) }}</span>
          <span class="turn-pts">pts</span>
          <div class="header-sc-btns">
            <button v-ripple class="header-sc-btn" :class="{ 'header-sc-btn-active': showTabs }" @click="showTabs = !showTabs" title="Show players">{{ showTabs ? '▲' : '▼' }}</button>
            <button v-ripple class="header-sc-btn" :class="{ 'header-sc-btn-active': hideCompleted }" @click="hideCompleted = !hideCompleted" title="Hide completed">{{ hideCompleted ? '👁' : '🙈' }}</button>
            <button v-ripple class="header-sc-btn" @click="scorecardTheme = scorecardTheme === 'dark' ? 'light' : 'dark'" title="Toggle theme">{{ scorecardTheme === 'dark' ? '☀️' : '🌙' }}</button>
          </div>
        </div>
      </div>

      <!-- PLAYER TABS -->
      <div v-show="showTabs" class="player-tabs">
        <button
          v-for="(ps, i) in game.playerStates"
          :key="ps.player.id"
          v-ripple
          class="player-tab"
          :class="{ 'tab-active': viewingIndex === i, 'tab-current': i === game.currentPlayerIndex }"
          :style="viewingIndex === i ? { borderBottomColor: ps.player.color, color: ps.player.color } : {}"
          @click="viewingIndex = i"
        >
          <div class="tab-avatar" :style="{ background: ps.player.color }">
            <img v-if="isPhoto(ps.player.avatarUrl)" :src="ps.player.avatarUrl!" alt="" />
            <span v-else style="font-size:10px">{{ ps.player.avatarUrl ?? '🎯' }}</span>
          </div>
          <span class="tab-name">{{ ps.player.name }}</span>
          <span class="tab-score">{{ grandTotal(ps.scorecard) }}</span>
        </button>
      </div>

      <!-- DICE AREA -->
      <div class="dice-area" v-if="isMyTurn" :style="{ background: `linear-gradient(180deg, ${currentPlayer?.color}0a 0%, transparent 100%)` }">
        <div class="dice-row">
          <div
            v-for="(val, i) in game.dice"
            :key="i"
            class="die-wrap"
            :class="{ 'die-held': game.held[i], [`die-theme-${dieTheme}`]: true }"
            :style="game.held[i] ? { '--held-color': currentPlayer?.color ?? 'var(--pink)' } : {}"
            @click="onDieTap(i)"
          >
            <svg class="die-svg" viewBox="0 0 36 36" xmlns="http://www.w3.org/2000/svg">
              <defs v-if="dieTheme === 'metallic'">
                <linearGradient :id="`mg-${i}`" x1="0" y1="0" x2="1" y2="1">
                  <stop offset="0%"   :stop-color="game.held[i] ? '#dcdce8' : '#c8c8d8'" />
                  <stop offset="50%"  :stop-color="game.held[i] ? '#9090a4' : '#787890'" />
                  <stop offset="100%" :stop-color="game.held[i] ? '#404050' : '#383848'" />
                </linearGradient>
              </defs>
              <rect x="0" y="0" width="36" height="36"
                :rx="dieFaceRx()"
                :fill="dieTheme === 'metallic' ? `url(#mg-${i})` : dieFaceFill(!!game.held[i])"
                :stroke="dieFaceStroke(!!game.held[i])"
                :stroke-width="dieTheme === 'default' ? 0 : 1.5"
              />
              <!-- Wooden grain lines -->
              <g v-if="dieTheme === 'wooden'">
                <line v-for="ly in [7, 13, 20, 27]" :key="ly"
                  x1="1" :y1="ly" x2="35" :y2="ly"
                  stroke="#4a2008" stroke-width="0.7" opacity="0.3" />
              </g>
              <!-- Vintage inner border -->
              <rect v-if="dieTheme === 'vintage'" x="2" y="2" width="32" height="32" rx="4"
                fill="none" stroke="#c0a870" stroke-width="0.6" opacity="0.6" />
              <!-- Pips -->
              <circle
                v-for="(dot, di) in dotPositions[val - 1]" :key="di"
                :cx="dot[0]" :cy="dot[1]" r="3.2"
                :fill="diePipFill(!!game.held[i])"
                :style="dieTheme === 'neon'
                  ? { filter: `drop-shadow(0 0 4px ${currentPlayer?.color ?? '#ff2d78'}) drop-shadow(0 0 2px ${currentPlayer?.color ?? '#ff2d78'})` }
                  : {}"
              />
            </svg>
            <span v-if="game.diceMode === 'physical'" class="die-tap-hint">tap to cycle</span>
            <span v-if="game.held[i]" class="held-label" :style="{ color: currentPlayer?.color }">HELD</span>
          </div>
        </div>

        <!-- ELECTRONIC MODE CONTROLS -->
        <div v-if="game.diceMode === 'electronic'" class="roll-controls">
          <div class="roll-indicator">
            <span
              v-for="n in 3" :key="n"
              class="roll-pip"
              :class="{ 'pip-done': n <= game.rollCount }"
              :style="n <= game.rollCount ? { background: currentPlayer?.color } : {}"
            />
          </div>
          <button
            v-ripple
            class="btn btn-spray btn-lg roll-btn"
            :disabled="game.rollCount >= 3"
            @click="yahtzeeStore.rollDice()"
          >
            {{ game.rollCount === 0 ? 'ROLL DICE' : game.rollCount >= 3 ? 'NO MORE ROLLS' : 'ROLL AGAIN' }}
          </button>
          <p v-if="game.rollCount > 0" class="score-hint">Select a category below to score</p>
        </div>

        <!-- PHYSICAL MODE CONTROLS -->
        <div v-else class="roll-controls">
          <div class="physical-roll-steps">
            <button
              v-for="n in 3" :key="n"
              v-ripple
              class="physical-step-btn"
              :class="{ 'step-active': game.rollCount >= n }"
              :style="game.rollCount >= n ? { borderColor: currentPlayer?.color, color: currentPlayer?.color, background: (currentPlayer?.color ?? '') + '22' } : {}"
              @click="yahtzeeStore.setPhysicalRollCount(n)"
            >
              Roll {{ n }}
            </button>
          </div>
          <p v-if="game.rollCount > 0" class="score-hint">Set dice above, then select a category to score</p>
        </div>
      </div>

      <div v-else class="viewing-banner">
        <span>Viewing <strong>{{ viewedState?.player.name }}</strong>'s scorecard</span>
        <button v-ripple class="btn btn-sm btn-surface" @click="viewingIndex = game.currentPlayerIndex">Back to turn</button>
      </div>

      <!-- SCORECARD -->
      <div class="scorecard-scroll" :style="scorecardBgStyle">
        <div class="sc-paper" :class="scorecardTheme === 'light' ? 'sc-light' : 'sc-dark'">
          <!-- UPPER HEADER -->
          <div class="sc-header-row">
            <div class="sc-col-name">UPPER SECTION</div>
            <div class="sc-col-howto">HOW TO SCORE</div>
            <div class="sc-col-box">PTS</div>
          </div>

          <!-- UPPER CATEGORIES -->
          <div
            v-for="cat in upperCategories"
            v-show="!(hideCompleted && viewedState?.scorecard[cat.key] !== null)"
            :key="cat.key"
            class="sc-row"
            :class="{
              'sc-row-filled': viewedState?.scorecard[cat.key] !== null,
              'sc-row-scoreable': isMyTurn && canScore && viewedState?.scorecard[cat.key] === null
            }"
            @click="tryScore(cat.key)"
          >
            <div class="sc-col-name sc-name-inner">
              <svg class="sc-die-icon" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <rect x="1.5" y="1.5" width="21" height="21" rx="4" class="sc-die-bg" />
                <circle
                  v-for="(dot, di) in dotPositions[(cat.dieValue ?? 1) - 1]"
                  :key="di"
                  :cx="dot[0] * 0.667"
                  :cy="dot[1] * 0.667"
                  r="2"
                  class="sc-die-pip"
                />
              </svg>
              <span class="sc-cat-label">{{ cat.label }}</span>
            </div>
            <div class="sc-col-howto sc-howto-text">{{ cat.howTo }}</div>
            <div
              class="sc-col-box sc-score-val"
              :class="{ 'sc-val-locked': viewedState?.scorecard[cat.key] !== null }"
              :style="isMyTurn && canScore && viewedState?.scorecard[cat.key] === null ? { color: currentPlayer?.color } : {}"
            >{{ scorecardDisplay(cat.key) }}</div>
          </div>

          <!-- UPPER TOTALS -->
          <div class="sc-total-row">
            <div class="sc-col-name sc-total-name"><span class="sc-arrows">▶▶</span> TOTAL SCORE</div>
            <div class="sc-col-howto sc-total-sub">Add Only Upper Section</div>
            <div class="sc-col-box sc-score-val sc-val-locked">{{ upperTotal(viewedState!.scorecard) }}</div>
          </div>
          <div class="sc-total-row">
            <div class="sc-col-name sc-total-name"><span class="sc-arrows">▶▶</span> BONUS</div>
            <div class="sc-col-howto sc-total-sub">Score 35 if ≥ 63</div>
            <div class="sc-col-box sc-score-val sc-val-locked" :class="{ 'sc-val-bonus': upperBonus(viewedState!.scorecard) > 0 }">{{ upperBonusDisplay }}</div>
          </div>
          <div class="sc-total-row sc-section-total-row">
            <div class="sc-col-name sc-total-name"><span class="sc-arrows">▶▶</span> UPPER TOTAL</div>
            <div class="sc-col-howto sc-total-sub"></div>
            <div class="sc-col-box sc-score-val sc-val-locked">{{ upperTotal(viewedState!.scorecard) + upperBonus(viewedState!.scorecard) }}</div>
          </div>

          <!-- LOWER SECTION HEADER -->
          <div class="sc-lower-header">══ LOWER SECTION ══</div>

          <!-- LOWER CATEGORIES -->
          <div
            v-for="cat in lowerCategories"
            v-show="!(hideCompleted && viewedState?.scorecard[cat.key] !== null)"
            :key="cat.key"
            class="sc-row"
            :class="{
              'sc-row-filled': viewedState?.scorecard[cat.key] !== null,
              'sc-row-scoreable': isMyTurn && canScore && viewedState?.scorecard[cat.key] === null
            }"
            @click="tryScore(cat.key)"
          >
            <div class="sc-col-name sc-name-inner sc-lower-name">
              <span class="sc-cat-label" :class="{ 'sc-yahtzee-lbl': cat.key === 'yahtzee' }">{{ cat.label }}</span>
            </div>
            <div class="sc-col-howto sc-howto-text">{{ cat.howTo }}</div>
            <div
              class="sc-col-box sc-score-val"
              :class="{ 'sc-val-locked': viewedState?.scorecard[cat.key] !== null }"
              :style="isMyTurn && canScore && viewedState?.scorecard[cat.key] === null ? { color: currentPlayer?.color } : {}"
            >{{ scorecardDisplay(cat.key) }}</div>
          </div>

          <!-- YAHTZEE BONUS -->
          <div class="sc-row sc-row-filled">
            <div class="sc-col-name sc-name-inner sc-lower-name">
              <span class="sc-cat-label">YAHTZEE BONUS</span>
            </div>
            <div class="sc-col-howto sc-bonus-checks">
              <span v-for="n in 3" :key="n" class="sc-bonus-check" :class="{ 'sc-check-on': viewedState!.scorecard.yahtzeeBonusCount >= n }">✓</span>
            </div>
            <div class="sc-col-box sc-score-val sc-val-locked" :class="{ 'sc-val-bonus': viewedState!.scorecard.yahtzeeBonusCount > 0 }">
              {{ viewedState!.scorecard.yahtzeeBonusCount > 0 ? viewedState!.scorecard.yahtzeeBonusCount * 100 : '—' }}
            </div>
          </div>

          <!-- LOWER TOTALS -->
          <div class="sc-total-row">
            <div class="sc-col-name sc-total-name"><span class="sc-arrows">▶▶</span> LOWER TOTAL</div>
            <div class="sc-col-howto sc-total-sub"></div>
            <div class="sc-col-box sc-score-val sc-val-locked">{{ lowerTotal(viewedState!.scorecard) }}</div>
          </div>
          <div class="sc-total-row">
            <div class="sc-col-name sc-total-name"><span class="sc-arrows">▶▶</span> UPPER TOTAL</div>
            <div class="sc-col-howto sc-total-sub"></div>
            <div class="sc-col-box sc-score-val sc-val-locked">{{ upperTotal(viewedState!.scorecard) + upperBonus(viewedState!.scorecard) }}</div>
          </div>
          <div class="sc-total-row sc-grand-row">
            <div class="sc-col-name sc-total-name sc-grand-label"><span class="sc-arrows">▶▶</span> GRAND TOTAL</div>
            <div class="sc-col-howto sc-total-sub"></div>
            <div class="sc-col-box sc-score-val sc-grand-val" :style="{ color: viewedState?.player.color }">{{ grandTotal(viewedState!.scorecard) }}</div>
          </div>
        </div>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useYahtzeeStore, grandTotal, upperTotal, upperBonus, lowerTotal, calcScore, isScorecardComplete } from '../stores/yahtzee'
import { usePlayersStore } from '../stores/players'
import type { YahtzeeCategory, YahtzeeScorecard } from '../stores/yahtzee'
import type { DiceTheme } from '../types/index'

const router = useRouter()
const yahtzeeStore = useYahtzeeStore()
const playersStore = usePlayersStore()
const game = computed(() => yahtzeeStore.game)

const viewingIndex = ref(0)
const scorecardTheme = ref<'dark' | 'light'>('dark')
const hideCompleted = ref(false)
const showTabs = ref(false)

const scorecardBgStyle = computed(() => {
  const bg = viewedState.value?.player.playerBackground
  if (!bg || scorecardTheme.value === 'light') return {}
  if (bg.startsWith('data:') || bg.startsWith('http')) {
    return { backgroundImage: `url(${bg})`, backgroundSize: 'cover', backgroundPosition: 'center', backgroundRepeat: 'no-repeat' }
  }
  return { background: bg }
})

watch(() => game.value?.currentPlayerIndex, (idx) => {
  if (idx !== undefined) viewingIndex.value = idx
})

onMounted(() => {
  if (!game.value) { router.push('/yahtzee/setup'); return }
  viewingIndex.value = game.value.currentPlayerIndex
  if (game.value.status === 'finished') {
    recordResults()
  }
})

let resultsRecorded = false
function recordResults() {
  if (resultsRecorded || !game.value) return
  resultsRecorded = true
  for (const ps of game.value.playerStates) {
    if (ps.player.id === game.value.winnerId) playersStore.recordWin(ps.player.id)
    else playersStore.recordGame(ps.player.id)
  }
}

watch(() => game.value?.status, (s) => {
  if (s === 'finished') recordResults()
})

const currentPlayer = computed(() => game.value?.players[game.value.currentPlayerIndex] ?? null)
const viewedState = computed(() => game.value?.playerStates[viewingIndex.value])
const isMyTurn = computed(() => viewingIndex.value === game.value?.currentPlayerIndex)
const canScore = computed(() => (game.value?.rollCount ?? 0) >= 1)

const winner = computed(() => {
  if (!game.value?.winnerId) return null
  return game.value.players.find(p => p.id === game.value!.winnerId) ?? null
})
const winnerScorecard = computed(() => {
  if (!game.value?.winnerId) return null
  return game.value.playerStates.find(ps => ps.player.id === game.value!.winnerId)?.scorecard ?? null
})
const rankedPlayers = computed(() => {
  if (!game.value) return []
  return [...game.value.playerStates].sort((a, b) => grandTotal(b.scorecard) - grandTotal(a.scorecard))
})

const dotPositions: [number, number][][] = [
  [[18, 18]],
  [[24, 10], [12, 26]],
  [[24, 10], [18, 18], [12, 26]],
  [[12, 10], [24, 10], [12, 26], [24, 26]],
  [[12, 10], [24, 10], [18, 18], [12, 26], [24, 26]],
  [[12, 10], [12, 18], [12, 26], [24, 10], [24, 18], [24, 26]],
]

const dieTheme = computed<DiceTheme>(() => currentPlayer.value?.diceTheme ?? 'default')

function dieFaceFill(held: boolean): string {
  const p = currentPlayer.value?.color ?? '#ff2d78'
  switch (dieTheme.value) {
    case 'casino':   return held ? '#e4e4e4' : '#ffffff'
    case 'neon':     return held ? '#141414' : '#080808'
    case 'metallic': return held ? '#b0b0c0' : '#888898'
    case 'wooden':   return held ? '#8b5e2c' : '#a0742e'
    case 'vintage':  return held ? '#d8d0b8' : '#f0e8d0'
    default:         return held ? (p + '55') : (p + '18')
  }
}
function dieFaceStroke(held: boolean): string {
  const p = currentPlayer.value?.color ?? '#ff2d78'
  switch (dieTheme.value) {
    case 'casino':   return '#222'
    case 'neon':     return held ? p : (p + '66')
    case 'metallic': return held ? '#aaa' : '#666'
    case 'wooden':   return '#5a2e08'
    case 'vintage':  return '#b0a070'
    default:         return 'transparent'
  }
}
function dieFaceRx(): number {
  switch (dieTheme.value) {
    case 'casino':   return 4
    case 'metallic': return 3
    case 'wooden':   return 5
    case 'vintage':  return 6
    default:         return 6
  }
}
function diePipFill(held: boolean): string {
  const p = currentPlayer.value?.color ?? '#ff2d78'
  switch (dieTheme.value) {
    case 'casino':   return '#111'
    case 'neon':     return p
    case 'metallic': return held ? '#111' : '#222'
    case 'wooden':   return held ? '#f0d888' : '#2e0e00'
    case 'vintage':  return '#6c4218'
    default:         return held ? p : '#ffffff'
  }
}

interface CatDef { key: YahtzeeCategory; label: string; dieValue?: number; howTo: string }
const upperCategories: CatDef[] = [
  { key: 'aces',   label: 'Aces',   dieValue: 1, howTo: 'Count and Add Only Aces' },
  { key: 'twos',   label: 'Twos',   dieValue: 2, howTo: 'Count and Add Only Twos' },
  { key: 'threes', label: 'Threes', dieValue: 3, howTo: 'Count and Add Only Threes' },
  { key: 'fours',  label: 'Fours',  dieValue: 4, howTo: 'Count and Add Only Fours' },
  { key: 'fives',  label: 'Fives',  dieValue: 5, howTo: 'Count and Add Only Fives' },
  { key: 'sixes',  label: 'Sixes',  dieValue: 6, howTo: 'Count and Add Only Sixes' },
]
const lowerCategories: CatDef[] = [
  { key: 'threeOfAKind',  label: '3 of a Kind',    howTo: 'Add Total of All Dice' },
  { key: 'fourOfAKind',   label: '4 of a Kind',    howTo: 'Add Total of All Dice' },
  { key: 'fullHouse',     label: 'Full House',     howTo: 'Score 25' },
  { key: 'smallStraight', label: 'Sm. Straight',   howTo: 'Score 30' },
  { key: 'largeStraight', label: 'Lg. Straight',   howTo: 'Score 40' },
  { key: 'yahtzee',       label: 'YAHTZEE',        howTo: 'Score 50' },
  { key: 'chance',        label: 'Chance',         howTo: 'Score Total of All 5 Dice' },
]

const upperBonusDisplay = computed(() => {
  if (!viewedState.value) return '—'
  const sc = viewedState.value.scorecard
  const allFilled = sc.aces !== null && sc.twos !== null && sc.threes !== null &&
    sc.fours !== null && sc.fives !== null && sc.sixes !== null
  if (!allFilled) {
    const current = upperTotal(sc)
    return `${current}/63`
  }
  return upperBonus(sc) > 0 ? '+35' : '0'
})

function scorecardDisplay(key: YahtzeeCategory): string | number {
  if (!viewedState.value) return '—'
  const sc = viewedState.value.scorecard
  const locked = sc[key]
  if (locked !== null) return locked
  if (!isMyTurn.value || !canScore.value || !game.value) return '—'
  const potential = calcScore(key, game.value.dice)
  return potential
}

function onDieTap(i: number) {
  if (!game.value) return
  if (game.value.diceMode === 'physical') {
    const next = (game.value.dice[i]! % 6) + 1
    yahtzeeStore.setDie(i, next)
  } else {
    if (game.value.rollCount > 0) yahtzeeStore.toggleHold(i)
  }
}

function tryScore(category: YahtzeeCategory) {
  if (!isMyTurn.value || !canScore.value) return
  if (!viewedState.value || viewedState.value.scorecard[category] !== null) return
  yahtzeeStore.scoreCategory(category)
}

function isPhoto(url: string | null | undefined) { return url?.startsWith('data:') || url?.startsWith('http') }

function playAgain() { yahtzeeStore.endGame(); router.push('/yahtzee/setup') }
function goHome() { yahtzeeStore.endGame(); router.push('/') }
</script>

<style scoped>
.game-page {
  display: flex;
  flex-direction: column;
  width: 100vw;
  height: 100dvh;
  overflow: hidden;
  background: #0a0a0a;
}

/* FINISHED */
.finish-overlay {
  position: fixed;
  inset: 0;
  z-index: 100;
  display: flex;
  align-items: flex-start;
  justify-content: center;
}
.finish-scroll {
  width: 100%;
  height: 100dvh;
  overflow-y: auto;
  -webkit-overflow-scrolling: touch;
  overscroll-behavior: contain;
  padding-top: env(safe-area-inset-top);
  padding-bottom: env(safe-area-inset-bottom);
}
.finish-inner {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 14px;
  padding: 40px 20px;
}
.trophy-wrap { position: relative; }
.trophy { font-size: 72px; position: relative; z-index: 1; }
.trophy-glow { position: absolute; inset: -20px; border-radius: 50%; opacity: 0.3; filter: blur(30px); }
.finish-over { font-size: 16px; letter-spacing: 0.3em; color: rgba(255,255,255,0.5); }
.winner-name { font-size: 60px; letter-spacing: 0.05em; }
.winner-sub { font-size: 14px; color: rgba(255,255,255,0.5); font-weight: 600; letter-spacing: 0.1em; text-transform: uppercase; }

.finish-rankings {
  display: flex; flex-direction: column; gap: 8px; width: 100%; max-width: 380px; margin: 8px 0;
}
.rank-row {
  display: flex; align-items: center; gap: 12px;
  padding: 12px 16px; background: rgba(255,255,255,0.05);
  border-radius: 10px; border: 1px solid rgba(255,255,255,0.1);
}
.rank-row.rank-winner { border-width: 2px; }
.rank-place { font-size: 22px; width: 28px; text-align: center; color: rgba(255,255,255,0.4); }
.rank-avatar { width: 36px; height: 36px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 18px; flex-shrink: 0; overflow: hidden; }
.rank-avatar img { width: 100%; height: 100%; object-fit: cover; }
.rank-name { flex: 1; font-size: 15px; font-weight: 700; }
.rank-score { font-size: 18px; font-weight: 900; font-family: var(--font-display); color: rgba(255,255,255,0.6); }

.finish-actions { display: flex; gap: 14px; margin-top: 8px; flex-wrap: wrap; justify-content: center; }

/* TURN HEADER */
.turn-header {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 14px 20px;
  padding-top: calc(14px + env(safe-area-inset-top));
  border-bottom: 1px solid rgba(255,255,255,0.08);
}
.turn-left { flex-shrink: 0; }
.turn-avatar {
  width: 52px; height: 52px; border-radius: 50%;
  display: flex; align-items: center; justify-content: center;
  font-size: 26px; overflow: hidden; flex-shrink: 0;
}
.turn-avatar img { width: 100%; height: 100%; object-fit: cover; }
.turn-center { flex: 1; display: flex; align-items: center; justify-content: center; overflow: hidden; }
.turn-name { font-size: clamp(28px, 5.5dvh, 52px); letter-spacing: 0.04em; line-height: 1; font-weight: 900; text-align: center; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.turn-right { display: flex; flex-direction: column; align-items: flex-end; gap: 0; flex-shrink: 0; min-width: 0; }
.turn-total { font-size: 32px; line-height: 1; }
.turn-pts { font-size: 10px; color: rgba(255,255,255,0.35); font-weight: 700; letter-spacing: 0.1em; text-transform: uppercase; }

/* PLAYER TABS */
.player-tabs {
  display: flex;
  overflow-x: auto;
  -webkit-overflow-scrolling: touch;
  flex-shrink: 0;
  background: rgba(0,0,0,0.5);
  border-bottom: 1px solid rgba(255,255,255,0.06);
  scrollbar-width: none;
}
.player-tabs::-webkit-scrollbar { display: none; }
.player-tab {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 8px 14px;
  flex-shrink: 0;
  border: none;
  background: transparent;
  color: rgba(255,255,255,0.35);
  cursor: pointer;
  border-bottom: 2px solid transparent;
  transition: all 0.15s;
  gap: 3px;
  position: relative;
  overflow: hidden;
  min-width: 64px;
}
.player-tab:hover { color: rgba(255,255,255,0.7); }
.tab-active { color: var(--pink); }
.tab-current::after {
  content: '▶';
  position: absolute;
  top: 3px;
  right: 3px;
  font-size: 6px;
  opacity: 0.5;
}
.tab-avatar { width: 22px; height: 22px; border-radius: 50%; display: flex; align-items: center; justify-content: center; overflow: hidden; flex-shrink: 0; }
.tab-avatar img { width: 100%; height: 100%; object-fit: cover; }
.tab-name { font-size: 11px; font-weight: 800; font-family: var(--font-display); letter-spacing: 0.04em; white-space: nowrap; }
.tab-score { font-size: 13px; font-weight: 900; font-family: var(--font-display); }

/* DICE AREA */
.dice-area {
  flex-shrink: 0;
  padding: 14px 16px 10px;
  background: rgba(255,255,255,0.02);
  border-bottom: 1px solid rgba(255,255,255,0.06);
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.dice-row {
  display: flex;
  justify-content: center;
  gap: 10px;
}
.die-wrap {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  cursor: pointer;
  -webkit-tap-highlight-color: transparent;
  transition: transform 0.1s;
}
.die-wrap:active { transform: scale(0.92); }
.die-svg {
  width: 52px;
  height: 52px;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.5);
  transition: box-shadow 0.15s;
}
.die-held .die-svg { box-shadow: 0 0 12px var(--held-color, var(--pink)); }
.die-theme-neon.die-held .die-svg { box-shadow: 0 0 18px var(--held-color, var(--pink)), 0 0 6px var(--held-color, var(--pink)); }
.die-theme-casino .die-svg { box-shadow: 0 3px 8px rgba(0,0,0,0.6); }
.die-theme-metallic .die-svg { box-shadow: 0 2px 10px rgba(0,0,0,0.7), inset 0 1px 2px rgba(255,255,255,0.2); }
.die-theme-wooden .die-svg { box-shadow: 0 3px 8px rgba(0,0,0,0.6); }
.die-theme-vintage .die-svg { box-shadow: 2px 3px 8px rgba(0,0,0,0.5), -1px -1px 4px rgba(255,255,255,0.05); }
.held-label { font-size: 9px; font-weight: 900; font-family: var(--font-display); letter-spacing: 0.08em; }
.die-tap-hint { font-size: 8px; color: rgba(255,255,255,0.3); letter-spacing: 0.05em; }

.roll-controls {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
}
.roll-indicator {
  display: flex;
  gap: 8px;
  align-items: center;
}
.roll-pip {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: rgba(255,255,255,0.15);
  transition: background 0.2s, box-shadow 0.2s;
}
.pip-done { box-shadow: 0 0 6px currentColor; }
.roll-btn { min-width: 180px; }
.score-hint { font-size: 11px; color: rgba(255,255,255,0.4); text-align: center; letter-spacing: 0.06em; }

.physical-roll-steps {
  display: flex;
  gap: 8px;
}
.physical-step-btn {
  padding: 8px 16px;
  border-radius: 8px;
  border: 2px solid rgba(255,255,255,0.15);
  background: rgba(255,255,255,0.04);
  color: rgba(255,255,255,0.5);
  font-size: 13px;
  font-weight: 800;
  font-family: var(--font-display);
  cursor: pointer;
  transition: all 0.15s;
  position: relative;
  overflow: hidden;
}
.physical-step-btn.step-active { }

.viewing-banner {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 16px;
  background: rgba(255,212,0,0.08);
  border-bottom: 1px solid rgba(255,212,0,0.2);
  font-size: 13px;
  color: rgba(255,255,255,0.7);
  gap: 12px;
}
.viewing-banner strong { color: var(--gold); }

/* SCORECARD */
.scorecard-scroll {
  flex: 1;
  overflow-y: auto;
  -webkit-overflow-scrolling: touch;
  overscroll-behavior: contain;
  padding-bottom: env(safe-area-inset-bottom);
  background: #0a0a0a;
}

.header-sc-btns { display: flex; gap: 5px; margin-top: 4px; }
.header-sc-btn {
  background: rgba(255,255,255,0.08);
  border: 1px solid rgba(255,255,255,0.15);
  border-radius: 6px;
  padding: 3px 7px;
  font-size: 14px;
  cursor: pointer;
  transition: background 0.15s;
  position: relative;
  overflow: hidden;
  -webkit-tap-highlight-color: transparent;
}
.header-sc-btn:hover { background: rgba(255,255,255,0.15); }
.header-sc-btn-active { border-color: var(--pink) !important; background: rgba(255,45,120,0.15) !important; }

/* PAPER */
.sc-paper { width: 100%; }

/* GRID */
.sc-header-row,
.sc-row,
.sc-total-row {
  display: grid;
  grid-template-columns: 108px 1fr 52px;
}
.sc-col-name {
  padding: 7px 8px;
  display: flex;
  align-items: center;
}
.sc-col-howto {
  padding: 7px 6px;
  display: flex;
  align-items: center;
}
.sc-col-box {
  padding: 7px 4px;
  display: flex;
  align-items: center;
  justify-content: center;
}

/* NAME CELL */
.sc-name-inner { gap: 5px; }
.sc-die-icon { width: 18px; height: 18px; flex-shrink: 0; }
.sc-cat-label {
  font-size: 12px;
  font-weight: 700;
  font-family: var(--font-display);
  letter-spacing: 0.03em;
  flex: 1;
  min-width: 0;
}
.sc-cat-eq { font-size: 10px; font-weight: 600; flex-shrink: 0; white-space: nowrap; }
.sc-lower-name { padding-left: 12px; }
.sc-yahtzee-lbl { font-weight: 900 !important; letter-spacing: 0.05em; }

/* HOW-TO */
.sc-howto-text { font-size: 10px; font-weight: 500; line-height: 1.3; }

/* SCORE VALUE */
.sc-score-val { font-size: 15px; font-weight: 900; font-family: var(--font-display); }

/* TOTAL ROWS */
.sc-total-name {
  font-size: 10px;
  font-weight: 900;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  white-space: nowrap;
  gap: 4px;
}
.sc-arrows { font-size: 7px; letter-spacing: -2px; flex-shrink: 0; }
.sc-total-sub { font-size: 9px; line-height: 1.3; }

/* GRAND TOTAL */
.sc-grand-label { font-size: 11px !important; }
.sc-grand-val { font-size: 20px !important; filter: drop-shadow(0 0 6px currentColor); }

/* LOWER SECTION HEADER */
.sc-lower-header {
  padding: 10px 0;
  font-size: 12px;
  font-weight: 900;
  font-family: var(--font-display);
  letter-spacing: 0.18em;
  text-align: center;
  text-transform: uppercase;
}

/* BONUS CHECKS */
.sc-bonus-checks { gap: 10px; }
.sc-bonus-check { font-size: 20px; font-weight: 900; transition: color 0.2s; }

/* DARK THEME */
.sc-dark { background: rgba(12,12,12,0.88); color: #f0f0f0; }
.sc-dark .sc-header-row { background: #1c1c1c; border-bottom: 2px solid #3a3a3a; }
.sc-dark .sc-header-row .sc-col-name,
.sc-dark .sc-header-row .sc-col-howto,
.sc-dark .sc-header-row .sc-col-box { font-size: 9px; font-weight: 900; letter-spacing: 0.1em; text-transform: uppercase; color: rgba(255,255,255,0.55); justify-content: center; }
.sc-dark .sc-header-row .sc-col-name { justify-content: flex-start; }
.sc-dark .sc-header-row .sc-col-howto { justify-content: flex-start; padding-left: 2px; }
.sc-dark .sc-col-name { border-right: 1px solid rgba(255,255,255,0.09); }
.sc-dark .sc-col-howto { border-right: 1px solid rgba(255,255,255,0.09); }
.sc-dark .sc-col-box { border-left: none; }
.sc-dark .sc-row { border-bottom: 1px solid rgba(255,255,255,0.07); transition: background 0.12s; cursor: default; }
.sc-dark .sc-row:nth-child(even) { background: rgba(255,255,255,0.02); }
.sc-dark .sc-row-scoreable { cursor: pointer; }
.sc-dark .sc-row-scoreable:hover { background: rgba(255,255,255,0.05) !important; }
.sc-dark .sc-row-filled { opacity: 0.72; }
.sc-dark .sc-total-row { background: rgba(255,255,255,0.04); border-top: 1px solid rgba(255,255,255,0.1); border-bottom: 1px solid rgba(255,255,255,0.06); }
.sc-dark .sc-section-total-row { border-bottom: 2px solid rgba(255,255,255,0.15); }
.sc-dark .sc-grand-row { background: rgba(255,255,255,0.07); border-top: 2px solid rgba(255,255,255,0.2); }
.sc-dark .sc-lower-header { background: #1c1c1c; border-top: 2px solid rgba(255,255,255,0.15); border-bottom: 2px solid rgba(255,255,255,0.15); color: rgba(255,255,255,0.65); }
.sc-dark .sc-die-bg { fill: rgba(255,255,255,0.08); stroke: rgba(255,255,255,0.35); stroke-width: 1; }
.sc-dark .sc-die-pip { fill: #fff; }
.sc-dark .sc-cat-label { color: #f0f0f0; }
.sc-dark .sc-cat-eq { color: rgba(255,255,255,0.45); }
.sc-dark .sc-howto-text { color: rgba(255,255,255,0.45); }
.sc-dark .sc-total-name { color: rgba(255,255,255,0.75); }
.sc-dark .sc-total-sub { color: rgba(255,255,255,0.4); }
.sc-dark .sc-arrows { color: rgba(255,255,255,0.25); }
.sc-dark .sc-val-locked { color: rgba(255,255,255,0.5); }
.sc-dark .sc-val-bonus { color: #ffd400 !important; }
.sc-dark .sc-yahtzee-lbl { color: #ffd400; }
.sc-dark .sc-bonus-check { color: rgba(255,255,255,0.15); }
.sc-dark .sc-check-on { color: #ffd400; }

/* LIGHT THEME */
.sc-light { background: rgba(245,240,232,0.95); color: #111; }
.sc-light .sc-header-row { background: #e0d8c8; border-bottom: 2px solid #999; }
.sc-light .sc-header-row .sc-col-name,
.sc-light .sc-header-row .sc-col-howto,
.sc-light .sc-header-row .sc-col-box { font-size: 9px; font-weight: 900; letter-spacing: 0.1em; text-transform: uppercase; color: #444; justify-content: center; }
.sc-light .sc-header-row .sc-col-name { justify-content: flex-start; }
.sc-light .sc-header-row .sc-col-howto { justify-content: flex-start; padding-left: 2px; }
.sc-light .sc-col-name { border-right: 1px solid #bbb; }
.sc-light .sc-col-howto { border-right: 1px solid #bbb; }
.sc-light .sc-row { border-bottom: 1px solid #ccc; transition: background 0.12s; cursor: default; }
.sc-light .sc-row:nth-child(even) { background: rgba(0,0,0,0.02); }
.sc-light .sc-row-scoreable { cursor: pointer; }
.sc-light .sc-row-scoreable:hover { background: rgba(0,0,0,0.05) !important; }
.sc-light .sc-row-filled { opacity: 0.72; }
.sc-light .sc-total-row { background: #ece6d8; border-top: 1px solid #aaa; border-bottom: 1px solid #bbb; }
.sc-light .sc-section-total-row { border-bottom: 2px solid #999; }
.sc-light .sc-grand-row { background: #e0d8c8; border-top: 2px solid #888; }
.sc-light .sc-lower-header { background: #e0d8c8; border-top: 2px solid #aaa; border-bottom: 2px solid #aaa; color: #333; }
.sc-light .sc-die-bg { fill: #fff; stroke: #333; stroke-width: 1.5; }
.sc-light .sc-die-pip { fill: #111; }
.sc-light .sc-cat-label { color: #111; }
.sc-light .sc-cat-eq { color: #555; }
.sc-light .sc-howto-text { color: #555; }
.sc-light .sc-total-name { color: #222; }
.sc-light .sc-total-sub { color: #666; }
.sc-light .sc-arrows { color: #999; }
.sc-light .sc-val-locked { color: #333; }
.sc-light .sc-val-bonus { color: #b8860b !important; font-weight: 900; }
.sc-light .sc-yahtzee-lbl { color: #b8860b; }
.sc-light .sc-bonus-check { color: #ccc; }
.sc-light .sc-check-on { color: #b8860b; }

@media (max-width: 380px) {
  .die-svg { width: 44px; height: 44px; }
  .dice-row { gap: 6px; }
  .sc-header-row,
  .sc-row,
  .sc-total-row { grid-template-columns: 96px 1fr 46px; }
  .sc-cat-label { font-size: 11px; }
  .sc-howto-text { font-size: 9px; }
}
</style>
