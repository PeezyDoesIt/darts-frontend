<template>
  <div class="history-page">
    <div class="drip-bar" />

    <div class="hist-header">
      <button v-ripple class="btn btn-outline btn-sm" @click="goBack(router, '/')">← Back</button>
      <h1 class="hist-title display">GAME HISTORY</h1>
      <div class="hist-spacer" />
    </div>

    <div class="hist-body">
      <p v-if="state === 'loading'" class="hist-note">Loading…</p>

      <!-- History lives against the account, so this is a state to explain, not an error. -->
      <div v-else-if="state === 'signed-out'" class="hist-empty">
        <p class="hist-note">Games are recorded to your account.</p>
        <p class="hist-sub">Sign in from the main menu and every game you finish is kept here.</p>
      </div>

      <div v-else-if="state === 'failed'" class="hist-empty">
        <p class="hist-note">Couldn't load your games.</p>
        <p class="hist-sub">{{ failure }}</p>
        <button v-ripple class="btn btn-spray" @click="load">Try again</button>
      </div>

      <div v-else-if="days.length === 0" class="hist-empty">
        <p class="hist-note">No games recorded yet.</p>
        <p class="hist-sub">Finish a game and it shows up here.</p>
      </div>

      <div v-for="day in days" v-else :key="day.key" class="hist-day">
        <div class="hist-day-head">
          <span class="hist-day-label display">{{ day.label }}</span>
          <span class="hist-day-count">{{ day.games.length }} game{{ day.games.length === 1 ? '' : 's' }}</span>
        </div>

        <div v-for="g in day.games" :key="g.id" class="glass-panel hist-row">
          <div class="hist-row-main">
            <span class="hist-game display">{{ label(g.gameType) }}</span>
            <span class="hist-players">{{ playerLine(g, nameOf) }}</span>
          </div>
          <div class="hist-row-meta">
            <span class="hist-time">{{ time(g.finishedAt) }}</span>
            <span v-if="g.roundCount" class="hist-rounds">{{ g.roundCount }} rounds</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { fetchGameHistory } from '../api/gameHistory'
import { groupByDay, playerLine, type HistoryGame } from '../lib/gameHistory'
import { usePlayersStore } from '../stores/players'
import { GAME_TYPE_LABELS } from '../types/index'
import { goBack } from '../router/goBack'

const router = useRouter()
const playersStore = usePlayersStore()

const state = ref<'loading' | 'ok' | 'signed-out' | 'failed'>('loading')
const failure = ref('')
const games = ref<HistoryGame[]>([])

const days = computed(() => groupByDay(games.value, new Date()))

/** A recorded game_type may be a mode the labels map does not carry, so fall back to it. */
function label(type: string): string {
  return (GAME_TYPE_LABELS as Record<string, string>)[type] ?? type
}

/** Players can be deleted after a game; a missing one is skipped rather than shown as an id. */
function nameOf(id: string): string | null {
  return playersStore.players.find(p => p.id === id)?.name ?? null
}

function time(iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(Number(d))) return ''
  return d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })
}

async function load() {
  state.value = 'loading'
  const res = await fetchGameHistory({ limit: 100 })

  if (res.status === 'signed-out') { state.value = 'signed-out'; return }
  if (res.status === 'failed') { failure.value = res.reason; state.value = 'failed'; return }

  games.value = res.games
  state.value = 'ok'
}

onMounted(load)
</script>

<style scoped>
.history-page { min-height: 100dvh; display: flex; flex-direction: column; background: #0a0a0a; }
.hist-header {
  display: flex; align-items: center; justify-content: space-between; gap: 12px;
  padding: 14px 16px; padding-top: calc(14px + env(safe-area-inset-top));
  border-bottom: 1px solid rgba(255,255,255,0.08);
}
.hist-title { font-size: 22px; letter-spacing: 0.12em; margin: 0; color: #fff; }
.hist-spacer { width: 64px; }

.hist-body {
  flex: 1; display: flex; flex-direction: column; gap: 20px;
  padding: 18px 16px calc(28px + env(safe-area-inset-bottom));
  max-width: 720px; width: 100%; margin: 0 auto;
}

.hist-day { display: flex; flex-direction: column; gap: 8px; }
.hist-day-head { display: flex; align-items: baseline; justify-content: space-between; }
.hist-day-label { font-size: 15px; letter-spacing: 0.14em; color: var(--gold); }
.hist-day-count { font-size: 11px; font-weight: 700; color: rgba(255,255,255,0.4); }

.hist-row {
  display: flex; align-items: center; justify-content: space-between; gap: 14px;
  padding: 13px 15px; border-radius: 14px;
}
.hist-row-main { display: flex; flex-direction: column; gap: 3px; min-width: 0; }
.hist-game { font-size: 17px; letter-spacing: 0.05em; color: #fff; }
.hist-players { font-size: 12.5px; font-weight: 600; color: rgba(255,255,255,0.62); overflow-wrap: anywhere; }
.hist-row-meta { display: flex; flex-direction: column; align-items: flex-end; gap: 3px; flex-shrink: 0; }
.hist-time { font-size: 12px; font-weight: 700; color: rgba(255,255,255,0.5); }
.hist-rounds { font-size: 10px; font-weight: 700; color: rgba(255,255,255,0.32); }

.hist-empty {
  flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: center;
  gap: 10px; text-align: center; padding: 40px 20px;
}
.hist-note { margin: 0; font-size: 16px; font-weight: 700; color: #fff; }
.hist-sub { margin: 0; font-size: 13px; color: rgba(255,255,255,0.5); line-height: 1.6; max-width: 380px; }
</style>
