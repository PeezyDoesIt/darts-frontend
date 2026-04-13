<template>
  <div class="home">
    <div class="drip-bar" />

    <!-- Left: Branding -->
    <div class="home-left">
      <div class="brand">
        <div class="brand-tag">🎯 EST. TONIGHT</div>
        <h1 class="brand-title">DARTS</h1>
        <div class="brand-sub">WHO'S UP. WHO'S DOWN. WHO'S NEXT.</div>
      </div>

      <div class="home-actions">
        <button class="btn btn-spray btn-xl w-full" @click="router.push('/new-game')">
          START NEW GAME
        </button>
        <div class="home-secondary">
          <button class="btn btn-outline btn-lg" @click="router.push('/leaderboard')">
            Leaderboard
          </button>
          <button class="btn btn-outline btn-lg" @click="router.push('/player-setup')">
            + Add Player
          </button>
        </div>
      </div>

      <!-- Paint splatter decoration -->
      <div class="splatter" aria-hidden="true">
        <span class="dot" style="--c:var(--pink);   --x:12%; --y:20%; --s:18px" />
        <span class="dot" style="--c:var(--blue);   --x:80%; --y:10%; --s:12px" />
        <span class="dot" style="--c:var(--lime);   --x:60%; --y:80%; --s:20px" />
        <span class="dot" style="--c:var(--orange); --x:25%; --y:70%; --s:14px" />
        <span class="dot" style="--c:var(--purple); --x:90%; --y:55%; --s:10px" />
        <span class="dot" style="--c:var(--pink);   --x:45%; --y:15%; --s:8px" />
        <span class="dot" style="--c:var(--blue);   --x:70%; --y:40%; --s:16px" />
      </div>
    </div>

    <!-- Right: Leaderboard -->
    <div class="home-right">
      <div class="lb-head">
        <span class="lb-title display">TOP PLAYERS</span>
      </div>

      <div v-if="topPlayers.length === 0" class="lb-empty">
        <span style="font-size:48px">🎯</span>
        <p>No players yet.</p>
        <button class="btn btn-outline" @click="router.push('/player-setup')">Add your first player</button>
      </div>

      <div v-else class="lb-list scroll">
        <div
          v-for="(p, i) in topPlayers"
          :key="p.id"
          class="lb-row"
        >
          <!-- Rank -->
          <div class="lb-rank" :style="{ color: rankColor(i) }">
            {{ i === 0 ? '👑' : i === 1 ? '②' : i === 2 ? '③' : i + 1 }}
          </div>

          <!-- Avatar -->
          <div class="lb-avatar" :style="{ background: p.color, boxShadow: `0 0 12px ${p.color}80` }">
            <img v-if="isPhoto(p.avatarUrl)" :src="p.avatarUrl!" alt="" />
            <span v-else>{{ p.avatarUrl ?? '🎯' }}</span>
          </div>

          <!-- Info -->
          <div class="lb-info">
            <span class="lb-name">{{ p.name }}</span>
            <div class="lb-bar-wrap">
              <div class="lb-bar" :style="{ width: winRate(p) + '%', background: p.color }" />
            </div>
          </div>

          <!-- Stats -->
          <div class="lb-stats">
            <span class="lb-wins" :style="{ color: p.color }">{{ p.wins }}W</span>
            <span class="lb-games">{{ p.gamesPlayed }}G</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import { usePlayersStore } from '../stores/players'
import type { Player } from '../types/index'

const router = useRouter()
const playersStore = usePlayersStore()

const topPlayers = computed(() =>
  [...playersStore.players].sort((a, b) => b.wins - a.wins).slice(0, 8)
)

function rankColor(i: number) {
  return ['var(--gold)', '#aaa', '#cd7f32'][i] ?? 'var(--text-muted)'
}

function winRate(p: Player) {
  return p.gamesPlayed > 0 ? Math.round((p.wins / p.gamesPlayed) * 100) : 0
}

function isPhoto(url: string | null) {
  return url?.startsWith('data:') || url?.startsWith('http')
}
</script>

<style scoped>
.home {
  display: flex;
  width: 100vw;
  height: 100vh;
  overflow: hidden;
  position: relative;
  flex-direction: column;
}

.home {
  flex-direction: row;
}

.home-left {
  width: 46%;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  justify-content: center;
  padding: 64px 56px;
  border-right: 1px solid var(--border);
  position: relative;
  overflow: hidden;
  gap: 48px;
}

/* Subtle grunge texture */
.home-left::before {
  content: '';
  position: absolute;
  inset: 0;
  background-image:
    radial-gradient(ellipse at 20% 50%, rgba(255,45,120,0.06) 0%, transparent 60%),
    radial-gradient(ellipse at 80% 20%, rgba(0,212,255,0.05) 0%, transparent 50%),
    radial-gradient(ellipse at 60% 80%, rgba(191,95,255,0.05) 0%, transparent 50%);
  pointer-events: none;
}

.brand { position: relative; z-index: 1; }

.brand-tag {
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.2em;
  color: var(--text-muted);
  text-transform: uppercase;
  margin-bottom: 8px;
}

.brand-title {
  font-family: var(--font-display);
  font-size: 120px;
  line-height: 0.9;
  letter-spacing: 0.05em;
  background: linear-gradient(135deg, var(--pink) 0%, var(--purple) 40%, var(--blue) 80%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  filter: drop-shadow(0 0 40px rgba(255,45,120,0.3));
}

.brand-sub {
  font-size: 12px;
  font-weight: 800;
  letter-spacing: 0.25em;
  color: var(--text-muted);
  text-transform: uppercase;
  margin-top: 16px;
}

.home-actions {
  display: flex;
  flex-direction: column;
  gap: 14px;
  width: 100%;
  max-width: 380px;
  position: relative;
  z-index: 1;
}

.home-secondary {
  display: flex;
  gap: 12px;
}

.w-full { width: 100%; }

/* Paint splatter dots */
.splatter {
  position: absolute;
  inset: 0;
  pointer-events: none;
}
.dot {
  position: absolute;
  left: var(--x);
  top: var(--y);
  width: var(--s);
  height: var(--s);
  border-radius: 50%;
  background: var(--c);
  opacity: 0.5;
  filter: blur(1px);
}

/* Right: Leaderboard */
.home-right {
  flex: 1;
  display: flex;
  flex-direction: column;
  padding: 40px 40px;
  gap: 24px;
  overflow: hidden;
}

.lb-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.lb-title {
  font-size: 32px;
  color: var(--text-muted);
  letter-spacing: 0.1em;
}

.lb-empty {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 16px;
  color: var(--text-muted);
  font-size: 15px;
}

.lb-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
  flex: 1;
}

.lb-row {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 16px;
  background: rgba(255,255,255,0.04);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  border: 1px solid rgba(255,255,255,0.08);
  border-radius: 10px;
  transition: border-color 0.15s, background 0.15s;
}
.lb-row:hover { background: rgba(255,255,255,0.07); border-color: rgba(255,255,255,0.15); }

.lb-rank {
  font-size: 22px;
  font-family: var(--font-display);
  width: 36px;
  text-align: center;
  flex-shrink: 0;
}

.lb-avatar {
  width: 46px;
  height: 46px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 22px;
  flex-shrink: 0;
  overflow: hidden;
}
.lb-avatar img { width: 100%; height: 100%; object-fit: cover; }

.lb-info {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 6px;
  min-width: 0;
}
.lb-name { font-size: 16px; font-weight: 700; }

.lb-bar-wrap {
  height: 3px;
  background: var(--border);
  border-radius: 2px;
  overflow: hidden;
}
.lb-bar {
  height: 100%;
  border-radius: 2px;
  transition: width 0.6s ease;
  min-width: 4px;
}

.lb-stats {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 2px;
  flex-shrink: 0;
}
.lb-wins { font-size: 20px; font-weight: 900; font-family: var(--font-display); }
.lb-games { font-size: 12px; color: var(--text-muted); }
</style>
