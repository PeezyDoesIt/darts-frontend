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
          <span class="turn-name display" :style="{ color: currentPlayer?.color, filter: `drop-shadow(0 0 16px ${currentPlayer?.color})` }">{{ currentPlayer?.name }}</span>
          <span class="turn-sub">{{ isMyTurn ? "it's your turn" : `watching ${currentPlayer?.name}` }}</span>
        </div>
        <div class="turn-right">
          <span class="turn-total display" :style="{ color: currentPlayer?.color }">{{ grandTotal(game.playerStates[game.currentPlayerIndex]!.scorecard) }}</span>
          <span class="turn-pts">pts</span>
        </div>
      </div>

      <!-- PLAYER TABS -->
      <div class="player-tabs">
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
            :class="{ 'die-held': game.held[i] }"
            :style="game.held[i] ? { '--held-color': currentPlayer?.color ?? 'var(--pink)' } : {}"
            @click="onDieTap(i)"
          >
            <svg class="die-svg" viewBox="0 0 36 36" xmlns="http://www.w3.org/2000/svg">
              <rect x="0" y="0" width="36" height="36" rx="6" :fill="game.held[i] ? ((currentPlayer?.color ?? '#ff2d78') + '55') : (currentPlayer?.color ?? '#ff2d78') + '18'" />
              <circle v-for="(dot, di) in dotPositions[val - 1]" :key="di" :cx="dot[0]" :cy="dot[1]" r="3.2" :fill="game.held[i] ? (currentPlayer?.color ?? '#fff') : '#ffffff'" />
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
      <div class="scorecard-scroll">
        <div class="scorecard">
          <!-- UPPER SECTION -->
          <div class="sc-section-header">UPPER SECTION</div>

          <div
            v-for="cat in upperCategories"
            :key="cat.key"
            class="sc-row"
            :class="{
              'sc-row-filled': viewedState?.scorecard[cat.key] !== null,
              'sc-row-scoreable': isMyTurn && canScore && viewedState?.scorecard[cat.key] === null
            }"
            @click="tryScore(cat.key)"
          >
            <span class="sc-cat-name">{{ cat.label }}</span>
            <span class="sc-cat-hint">{{ cat.hint }}</span>
            <span
              class="sc-score"
              :class="{ 'sc-score-locked': viewedState?.scorecard[cat.key] !== null, 'sc-score-potential': isMyTurn && canScore && viewedState?.scorecard[cat.key] === null }"
              :style="isMyTurn && canScore && viewedState?.scorecard[cat.key] === null
                ? { color: viewedState?.scorecard[cat.key] !== null ? 'rgba(255,255,255,0.45)' : (currentPlayer?.color ?? 'var(--pink)') }
                : {}"
            >
              {{ scorecardDisplay(cat.key) }}
            </span>
          </div>

          <div class="sc-row sc-row-total">
            <span class="sc-cat-name">TOTAL SCORE</span>
            <span class="sc-cat-hint">Upper sum</span>
            <span class="sc-score sc-score-locked">{{ upperTotal(viewedState!.scorecard) }}</span>
          </div>
          <div class="sc-row sc-row-total">
            <span class="sc-cat-name">BONUS</span>
            <span class="sc-cat-hint">35 if ≥ 63</span>
            <span class="sc-score sc-score-locked" :style="upperBonus(viewedState!.scorecard) > 0 ? { color: 'var(--gold)' } : {}">
              {{ upperBonusDisplay }}
            </span>
          </div>
          <div class="sc-row sc-row-total">
            <span class="sc-cat-name">UPPER TOTAL</span>
            <span class="sc-cat-hint"></span>
            <span class="sc-score sc-score-locked" :style="{ color: 'var(--blue)' }">{{ upperTotal(viewedState!.scorecard) + upperBonus(viewedState!.scorecard) }}</span>
          </div>

          <!-- LOWER SECTION -->
          <div class="sc-section-header">LOWER SECTION</div>

          <div
            v-for="cat in lowerCategories"
            :key="cat.key"
            class="sc-row"
            :class="{
              'sc-row-filled': viewedState?.scorecard[cat.key] !== null,
              'sc-row-scoreable': isMyTurn && canScore && viewedState?.scorecard[cat.key] === null
            }"
            @click="tryScore(cat.key)"
          >
            <span class="sc-cat-name">{{ cat.label }}</span>
            <span class="sc-cat-hint">{{ cat.hint }}</span>
            <span
              class="sc-score"
              :class="{ 'sc-score-locked': viewedState?.scorecard[cat.key] !== null, 'sc-score-potential': isMyTurn && canScore && viewedState?.scorecard[cat.key] === null }"
              :style="isMyTurn && canScore && viewedState?.scorecard[cat.key] === null
                ? { color: viewedState?.scorecard[cat.key] !== null ? 'rgba(255,255,255,0.45)' : (currentPlayer?.color ?? 'var(--pink)') }
                : {}"
            >
              {{ scorecardDisplay(cat.key) }}
            </span>
          </div>

          <!-- Yahtzee Bonus row -->
          <div class="sc-row sc-row-filled">
            <span class="sc-cat-name">YAHTZEE BONUS</span>
            <span class="sc-cat-hint">100 per extra</span>
            <span class="sc-score sc-score-locked" :style="viewedState!.scorecard.yahtzeeBonusCount > 0 ? { color: 'var(--gold)' } : {}">
              {{ viewedState!.scorecard.yahtzeeBonusCount > 0 ? `×${viewedState!.scorecard.yahtzeeBonusCount} = ${viewedState!.scorecard.yahtzeeBonusCount * 100}` : '—' }}
            </span>
          </div>

          <div class="sc-row sc-row-total">
            <span class="sc-cat-name">LOWER TOTAL</span>
            <span class="sc-cat-hint"></span>
            <span class="sc-score sc-score-locked" :style="{ color: 'var(--blue)' }">{{ lowerTotal(viewedState!.scorecard) }}</span>
          </div>
          <div class="sc-row sc-row-total">
            <span class="sc-cat-name">UPPER TOTAL</span>
            <span class="sc-cat-hint"></span>
            <span class="sc-score sc-score-locked">{{ upperTotal(viewedState!.scorecard) + upperBonus(viewedState!.scorecard) }}</span>
          </div>
          <div class="sc-row sc-row-grand-total" :style="{ background: (viewedState?.player.color ?? 'var(--pink)') + '18', borderTopColor: (viewedState?.player.color ?? 'var(--pink)') + '60' }">
            <span class="sc-cat-name display">GRAND TOTAL</span>
            <span class="sc-cat-hint"></span>
            <span class="sc-score sc-score-grand display" :style="{ color: viewedState?.player.color ?? 'var(--pink)', filter: `drop-shadow(0 0 8px ${viewedState?.player.color ?? 'var(--pink)'})` }">{{ grandTotal(viewedState!.scorecard) }}</span>
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

const router = useRouter()
const yahtzeeStore = useYahtzeeStore()
const playersStore = usePlayersStore()
const game = computed(() => yahtzeeStore.game)

const viewingIndex = ref(0)

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

interface CatDef { key: YahtzeeCategory; label: string; hint: string }
const upperCategories: CatDef[] = [
  { key: 'aces',   label: 'Aces',   hint: 'Sum of 1s' },
  { key: 'twos',   label: 'Twos',   hint: 'Sum of 2s' },
  { key: 'threes', label: 'Threes', hint: 'Sum of 3s' },
  { key: 'fours',  label: 'Fours',  hint: 'Sum of 4s' },
  { key: 'fives',  label: 'Fives',  hint: 'Sum of 5s' },
  { key: 'sixes',  label: 'Sixes',  hint: 'Sum of 6s' },
]
const lowerCategories: CatDef[] = [
  { key: 'threeOfAKind',  label: '3 of a Kind',    hint: 'Sum all if 3+ same' },
  { key: 'fourOfAKind',   label: '4 of a Kind',    hint: 'Sum all if 4+ same' },
  { key: 'fullHouse',     label: 'Full House',     hint: '25 pts' },
  { key: 'smallStraight', label: 'Sm. Straight',   hint: '30 pts' },
  { key: 'largeStraight', label: 'Lg. Straight',   hint: '40 pts' },
  { key: 'yahtzee',       label: 'YAHTZEE',        hint: '50 pts' },
  { key: 'chance',        label: 'Chance',         hint: 'Sum all dice' },
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
.turn-center { flex: 1; display: flex; flex-direction: column; gap: 2px; }
.turn-name { font-size: 28px; letter-spacing: 0.06em; line-height: 1; }
.turn-sub { font-size: 11px; color: rgba(255,255,255,0.4); font-weight: 600; letter-spacing: 0.08em; text-transform: uppercase; }
.turn-right { display: flex; flex-direction: column; align-items: flex-end; gap: 0; flex-shrink: 0; }
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
}
.scorecard {
  display: flex;
  flex-direction: column;
}
.sc-section-header {
  padding: 8px 16px;
  font-size: 10px;
  font-weight: 900;
  font-family: var(--font-display);
  letter-spacing: 0.18em;
  color: rgba(255,255,255,0.35);
  background: rgba(255,255,255,0.03);
  border-bottom: 1px solid rgba(255,255,255,0.06);
  text-transform: uppercase;
}
.sc-row {
  display: flex;
  align-items: center;
  padding: 12px 16px;
  border-bottom: 1px solid rgba(255,255,255,0.05);
  gap: 8px;
  transition: background 0.12s;
  cursor: default;
}
.sc-row:nth-child(even) { background: rgba(255,255,255,0.015); }
.sc-row-scoreable {
  cursor: pointer;
}
.sc-row-scoreable:hover { background: rgba(255,255,255,0.07); }
.sc-row-scoreable:active { background: rgba(255,255,255,0.04); }
.sc-row-filled { opacity: 0.65; }
.sc-row-total {
  background: rgba(255,255,255,0.04) !important;
  cursor: default !important;
}
.sc-row-grand-total {
  background: rgba(255,255,255,0.07) !important;
  padding: 16px;
  cursor: default !important;
}
.sc-cat-name {
  font-size: 14px;
  font-weight: 700;
  color: #fff;
  flex: 1;
  min-width: 0;
}
.sc-row-total .sc-cat-name { font-size: 11px; font-weight: 800; letter-spacing: 0.08em; color: rgba(255,255,255,0.5); text-transform: uppercase; }
.sc-row-grand-total .sc-cat-name { font-size: 18px; color: #fff; }
.sc-cat-hint {
  font-size: 10px;
  color: rgba(255,255,255,0.3);
  white-space: nowrap;
  flex-shrink: 0;
  width: 88px;
  text-align: right;
}
.sc-score {
  font-size: 16px;
  font-weight: 900;
  font-family: var(--font-display);
  min-width: 44px;
  text-align: right;
  flex-shrink: 0;
}
.sc-score-locked { color: rgba(255,255,255,0.4); }
.sc-score-potential { }
.sc-score-grand { font-size: 28px; }

@media (max-width: 380px) {
  .die-svg { width: 44px; height: 44px; }
  .dice-row { gap: 6px; }
  .sc-cat-hint { display: none; }
}
</style>
