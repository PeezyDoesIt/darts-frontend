<template>
  <div class="win-page" :style="{ background: `radial-gradient(ellipse at center, ${winner?.color}40 0%, #0a0a0a 70%)` }">
    <div class="drip-bar" style="position:absolute;top:0;left:0;right:0" />

    <div class="win-scroll">
      <div class="win-inner">
        <div class="winner-label display">WINNER</div>

        <div class="winner-avatar" :style="{ background: winner?.color, boxShadow: `0 0 60px ${winner?.color}` }">
          <img v-if="isPhoto(winner?.avatarUrl)" :src="winner!.avatarUrl!" alt="" />
          <span v-else>{{ avatarGlyph(winner) }}</span>
        </div>

        <div class="winner-name display" :style="{ color: winner?.color, filter: `drop-shadow(0 0 20px ${winner?.color})` }">
          {{ winner?.name }}
        </div>
        <div class="winner-sub">takes the glory</div>

        <div class="trophy-wrap">
          <span class="trophy">🏆</span>
          <div class="trophy-glow" :style="{ background: winner?.color }" />
        </div>

        <div class="final-scores">
          <div v-for="(p, i) in finalPlayers" :key="p.id" class="final-row"
            :class="{ winner: p.id === winner?.id }"
            :style="p.id === winner?.id ? { borderColor: p.color, background: `${p.color}20` } : {}">
            <span v-if="game?.playToCompletion" class="final-place" :style="i === 0 ? { color: p.color } : {}">{{ ordinal(i + 1) }}</span>
            <div class="final-avatar" :style="{ background: p.color, boxShadow: `0 0 10px ${p.color}80` }">
              <img v-if="isPhoto(p.avatarUrl)" :src="p.avatarUrl!" alt="" style="width:100%;height:100%;object-fit:cover;border-radius:50%" />
              <span v-else>{{ avatarGlyph(p) }}</span>
            </div>
            <span class="final-name">{{ p.name }}</span>
            <span v-if="!game?.playToCompletion" class="final-score" :style="p.id === winner?.id ? { color: p.color } : {}">{{ displayScore(p.id) }}</span>
          </div>
        </div>

        <div class="win-actions">
          <button v-ripple class="btn btn-spray btn-xl" @click="playAgain">Play Again</button>
          <button v-ripple class="btn btn-outline btn-lg" @click="goHome">Home</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { avatarGlyph, isPhoto } from '../lib/playerDisplay'
import { useGameStore } from '../stores/game'
import { usePlayersStore } from '../stores/players'
import { useNarrator } from '../composables/useNarrator'
import { recordGameResult } from '../api/gameResults'
import { CRICKET_TARGETS } from '../types/index'

const router = useRouter()
const gameStore = useGameStore()
const playersStore = usePlayersStore()
const { narrateAsync } = useNarrator()
const game = computed(() => gameStore.game)
const winner = computed(() => game.value?.players.find(p => p.id === game.value!.winnerId) ?? null)
/** Speed Cricket closes a number in one mark rather than three, as it does everywhere else. */
const marksToClose = computed(() => game.value?.gameType === 'speedCricket' ? 1 : 3)
const finalPlayers = computed(() => {
  if (!game.value) return []
  if (game.value.playToCompletion && game.value.finishOrder?.length) {
    return game.value.finishOrder
      .map(id => game.value!.players.find(p => p.id === id))
      .filter(Boolean) as typeof game.value.players
  }
  return game.value.players
})
function ordinal(n: number): string {
  const s = ['th', 'st', 'nd', 'rd']
  const v = n % 100
  return n + (s[(v - 20) % 10] ?? s[v] ?? s[0]!)
}

onMounted(() => {
  if (!game.value) return
  for (const p of game.value.players) {
    if (p.id === game.value.winnerId) playersStore.recordWin(p.id)
    else playersStore.recordGame(p.id)
  }
  if (winner.value) {
    // Personality-aware now; the win line was hard-coded identically in two views.
    narrateAsync('win', { name: winner.value.name })
  }
  // Durable record for the leaderboard and time-based stats. Deliberately not awaited:
  // the win screen must render regardless, and the call is idempotent server-side.
  const g = game.value
  void recordGameResult({
    clientGameId: g.id,
    gameType: g.gameType,
    winnerId: g.winnerId ?? '',
    playerIds: g.players.map(p => p.id),
    startedAt: g.startedAt ?? null,
    finishedAt: new Date().toISOString(),
    roundCount: g.round ?? null,
    finalScores: g.scores ?? null,
  })
})

function displayScore(playerId: string) {
  const s = game.value?.scores[playerId]
  if (!s) return '—'
  if (s.kind === 'ohOne') return `${s.data.remaining} left`
  /*
   * Closed count, not points.
   *
   * Cricket here is a race to close every number: marks are capped at the closing count and
   * the excess is discarded, so `points` is initialised to 0 and never incremented by
   * anything. This line read `${points} pts`, which meant every player on the win screen was
   * shown "0 pts" — a real number, sourced from a field that is never filled in.
   */
  if (s.kind === 'cricket') {
    const closed = CRICKET_TARGETS.filter(t => s.data.marks[t] >= marksToClose.value).length
    return `${closed}/${CRICKET_TARGETS.length} closed`
  }
  if (s.kind === 'simple') return String(s.data.total)
  if (s.kind === 'bobs27') return s.data.busted ? 'BUST' : `${s.data.score} pts`
  return '—'
}
function playAgain() { gameStore.endGame(); router.push('/new-game') }
function goHome() { gameStore.endGame(); router.push('/') }
</script>

<style scoped>
.win-page {
  width: 100vw; height: 100dvh; display: flex; align-items: center; justify-content: center;
  position: relative; overflow: hidden;
}
.win-scroll {
  width: 100%; height: 100dvh; height: 100dvh; overflow-y: auto; -webkit-overflow-scrolling: touch; overscroll-behavior: contain;
  padding-top: env(safe-area-inset-top);
  padding-bottom: env(safe-area-inset-bottom);
}
.win-inner { display: flex; flex-direction: column; align-items: center; gap: 14px; padding: 40px 20px; position: relative; z-index: 1; }

.trophy-wrap { position: relative; }
.trophy { font-size: 80px; position: relative; z-index: 1; }
.trophy-glow { position: absolute; inset: -20px; border-radius: 50%; opacity: 0.3; filter: blur(30px); }

.winner-label { font-size: 14px; letter-spacing: 0.3em; color: var(--text-muted); }
.winner-avatar { width: 160px; height: 160px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 80px; overflow: hidden; border: 4px solid rgba(255,255,255,0.3); }
.winner-avatar img { width: 100%; height: 100%; object-fit: cover; }
.winner-name { font-size: 72px; letter-spacing: 0.05em; }
.winner-sub { font-size: 14px; color: rgba(255,255,255,0.5); font-weight: 600; letter-spacing: 0.1em; text-transform: uppercase; }

.final-scores { display: flex; flex-direction: column; gap: 8px; width: 100%; max-width: 380px; margin: 8px 0; }
.final-row { display: flex; align-items: center; gap: 12px; padding: 12px 16px; background: #17171d;  border: 2px solid rgba(255,255,255,0.1); }
.final-row.winner { border-width: 2px; }
.final-avatar { width: 36px; height: 36px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 18px; }
.final-place { font-size: 13px; font-weight: 900; font-family: var(--font-display); color: rgba(255,255,255,0.5); min-width: 32px; }
.final-name { flex: 1; font-size: 15px; font-weight: 700; }
.final-score { font-size: 15px; font-weight: 800; color: rgba(255,255,255,0.6); }

.win-actions { display: flex; gap: 14px; margin-top: 8px; flex-wrap: wrap; justify-content: center; }

@media (max-width: 767px) {
  .winner-name { font-size: 52px; }
  .winner-avatar { width: 120px; height: 120px; font-size: 60px; }
}

/* ══════════════════════════════════════════════════════════════════════
   STREET TREATMENT — identical block in every view. Flat printed panels
   instead of glass: no blur, square corners, 2px rules, hard offset
   shadows, halftone grain. Adds only what the sweep cannot infer.
   Lift this into src/style.css once the look is settled.
   ══════════════════════════════════════════════════════════════════════ */
.display { text-shadow: 2px 2px 0 rgba(0,0,0,0.55); }
.glass-panel::before, .panel::before, .card::before {
  content: '';
  position: absolute; inset: 0; pointer-events: none; z-index: 0;
  background-image: radial-gradient(rgba(255,255,255,0.13) 0.7px, transparent 0.7px);
  background-size: 5px 5px;
  opacity: 0.5;
}
.glass-panel > *, .panel > *, .card > * { position: relative; z-index: 1; }
.toggle-thumb { border-radius: 0; box-shadow: 1px 1px 0 rgba(0,0,0,0.5); }
</style>
