<template>
  <div class="win-page" :style="{ background: `radial-gradient(ellipse at center, ${winner?.color}40 0%, #0a0a0a 70%)` }">
    <div class="drip-bar" style="position:absolute;top:0;left:0;right:0" />

    <div class="win-scroll">
      <div class="win-inner">
        <div class="trophy-wrap">
          <span class="trophy">🏆</span>
          <div class="trophy-glow" :style="{ background: winner?.color }" />
        </div>

        <div class="winner-label display">WINNER</div>

        <div class="winner-avatar" :style="{ background: winner?.color, boxShadow: `0 0 60px ${winner?.color}` }">
          <img v-if="isPhoto(winner?.avatarUrl)" :src="winner!.avatarUrl!" alt="" />
          <span v-else>{{ winner?.avatarUrl ?? '🎯' }}</span>
        </div>

        <div class="winner-name display" :style="{ color: winner?.color, filter: `drop-shadow(0 0 20px ${winner?.color})` }">
          {{ winner?.name }}
        </div>
        <div class="winner-sub">takes the glory</div>

        <div class="final-scores">
          <div v-for="p in game?.players" :key="p.id" class="final-row"
            :class="{ winner: p.id === winner?.id }"
            :style="p.id === winner?.id ? { borderColor: p.color, background: `${p.color}20` } : {}">
            <div class="final-avatar" :style="{ background: p.color, boxShadow: `0 0 10px ${p.color}80` }">{{ p.avatarUrl ?? '🎯' }}</div>
            <span class="final-name">{{ p.name }}</span>
            <span class="final-score" :style="p.id === winner?.id ? { color: p.color } : {}">{{ displayScore(p.id) }}</span>
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
import { useGameStore } from '../stores/game'
import { usePlayersStore } from '../stores/players'
import { speak } from '../composables/useSpeech'

const router = useRouter()
const gameStore = useGameStore()
const playersStore = usePlayersStore()
const game = computed(() => gameStore.game)
const winner = computed(() => game.value?.players.find(p => p.id === game.value!.winnerId) ?? null)

onMounted(() => {
  if (!game.value) return
  for (const p of game.value.players) {
    if (p.id === game.value.winnerId) playersStore.recordWin(p.id)
    else playersStore.recordGame(p.id)
  }
  if (winner.value) {
    speak(`${winner.value.name} wins! Well played.`)
  }
})

function displayScore(playerId: string) {
  const s = game.value?.scores[playerId]
  if (!s) return '—'
  if (s.kind === 'ohOne') return `${s.data.remaining} left`
  if (s.kind === 'cricket') return `${s.data.points} pts`
  if (s.kind === 'simple') return String(s.data.total)
  return '—'
}
function isPhoto(url: string | null | undefined) { return url?.startsWith('data:') || url?.startsWith('http') }
function playAgain() { gameStore.endGame(); router.push('/new-game') }
function goHome() { gameStore.endGame(); router.push('/') }
</script>

<style scoped>
.win-page {
  width: 100vw; height: 100dvh; display: flex; align-items: center; justify-content: center;
  position: relative; overflow: hidden;
}
.win-scroll {
  width: 100%; height: 100vh; height: 100dvh; overflow-y: auto;
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
.final-row { display: flex; align-items: center; gap: 12px; padding: 12px 16px; background: rgba(255,255,255,0.05); backdrop-filter: blur(12px); -webkit-backdrop-filter: blur(12px); border-radius: 10px; border: 1px solid rgba(255,255,255,0.1); }
.final-row.winner { border-width: 2px; }
.final-avatar { width: 36px; height: 36px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 18px; }
.final-name { flex: 1; font-size: 15px; font-weight: 700; }
.final-score { font-size: 15px; font-weight: 800; color: rgba(255,255,255,0.6); }

.win-actions { display: flex; gap: 14px; margin-top: 8px; flex-wrap: wrap; justify-content: center; }

@media (max-width: 768px) {
  .winner-name { font-size: 52px; }
  .winner-avatar { width: 120px; height: 120px; font-size: 60px; }
}
</style>
