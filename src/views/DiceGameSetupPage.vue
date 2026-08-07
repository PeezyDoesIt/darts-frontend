<template>
  <div class="setup-page">
    <div class="drip-bar" />

    <div class="setup-header">
      <button v-ripple class="btn btn-outline btn-sm header-back" @click="goBack(router, '/')">← Back</button>
      <h1 class="setup-title display">{{ config.title }}</h1>
      <div class="header-spacer" />
    </div>

    <div class="setup-body">
      <section class="ng-section">
        <span class="label">SELECT PLAYERS</span>

        <div v-if="playersStore.players.length === 0" class="empty-players">
          No players yet.
          <button v-ripple class="link-btn" @click="router.push('/player-setup')">Add one →</button>
        </div>

        <div v-else class="player-bubble-grid">
          <div v-ripple class="player-bubble add-player-bubble" @click="router.push('/player-setup')">
            <div class="bubble-avatar add-bubble-avatar"><span>+</span></div>
            <span class="bubble-name">New Player</span>
          </div>
          <div
            v-for="p in sortedPlayers.filter(p => !isSelected(p.id))"
            :key="p.id"
            v-ripple
            class="player-bubble"
            @click="togglePlayer(p)"
          >
            <div class="bubble-avatar" :style="{ background: p.color }">
              <img v-if="isPhoto(p.avatarUrl)" :src="p.avatarUrl!" alt="" />
              <span v-else>{{ p.avatarUrl ?? '🎲' }}</span>
            </div>
            <span class="bubble-name">{{ p.name }}</span>
            <span v-if="p.pinned" class="bubble-pin">📌</span>
          </div>
        </div>
      </section>

      <section v-if="selectedPlayers.length > 0" class="ng-section">
        <span class="label">PLAY ORDER</span>
        <div class="order-list">
          <div v-for="(p, i) in selectedPlayers" :key="p.id" class="order-row" :style="{ borderLeftColor: p.color }">
            <span class="order-num display" :style="{ color: p.color }">{{ i + 1 }}</span>
            <div class="order-avatar" :style="{ background: p.color }">
              <img v-if="isPhoto(p.avatarUrl)" :src="p.avatarUrl!" alt="" />
              <span v-else>{{ p.avatarUrl ?? '🎲' }}</span>
            </div>
            <span class="order-name">{{ p.name }}</span>
            <div class="order-btns">
              <button v-ripple :disabled="i === 0" class="btn btn-sm btn-surface" aria-label="Move up" @click="moveUp(i)">↑</button>
              <button v-ripple :disabled="i === selectedPlayers.length - 1" class="btn btn-sm btn-surface" aria-label="Move down" @click="moveDown(i)">↓</button>
              <button v-ripple class="btn btn-sm btn-surface remove-btn" aria-label="Remove" @click="removePlayer(p.id)">✕</button>
            </div>
          </div>
        </div>
      </section>

      <section class="ng-section">
        <span class="label">{{ config.targetLabel }}</span>
        <div class="target-btns">
          <button
            v-for="t in config.targets"
            :key="t"
            v-ripple
            class="target-btn"
            :class="{ active: target === t }"
            @click="target = t"
          >{{ t }}</button>
        </div>
      </section>

      <section class="ng-section">
        <span class="label">HOW TO PLAY</span>
        <ul class="rules-list">
          <li v-for="(r, i) in config.rules" :key="i">{{ r }}</li>
        </ul>
      </section>
    </div>

    <div class="setup-footer">
      <button
        v-ripple
        class="btn btn-spray btn-lg start-btn"
        :disabled="selectedPlayers.length < config.minPlayers"
        @click="start"
      >
        {{ selectedPlayers.length < config.minPlayers
          ? `Select ${config.minPlayers} or more players`
          : 'START GAME →' }}
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { usePlayersStore } from '../stores/players'
import { useFarkleStore } from '../stores/farkle'
import { useSCCStore } from '../stores/shipCaptainCrew'
import { usePigStore, PIG_RULES } from '../stores/pig'
import { RULES as FARKLE_RULES, FARKLE_TARGET } from '../lib/farkle'
import { RULES as SCC_RULES } from '../lib/shipCaptainCrew'
import { goBack } from '../router/goBack'
import type { Player } from '../types/index'

/**
 * One setup screen for all three dice games. They differ only in title, target and rules
 * text, so three near-identical copies of this page would be three places for the player
 * list and ordering controls to drift apart.
 */
type Variant = 'farkle' | 'scc' | 'pig'

interface VariantConfig {
  title: string
  minPlayers: number
  targetLabel: string
  targets: number[]
  defaultTarget: number
  rules: string[]
  route: string
}

const CONFIG: Record<Variant, VariantConfig> = {
  farkle: {
    title: 'FARKLE',
    minPlayers: 2,
    targetLabel: 'PLAY TO',
    targets: [2000, 5000, FARKLE_TARGET],
    defaultTarget: FARKLE_TARGET,
    rules: FARKLE_RULES,
    route: '/dice/farkle',
  },
  scc: {
    title: 'SHIP CAPTAIN CREW',
    minPlayers: 2,
    targetLabel: 'ROUNDS TO WIN',
    targets: [1, 3, 5],
    defaultTarget: 3,
    rules: SCC_RULES,
    route: '/dice/scc',
  },
  pig: {
    title: 'PIG',
    minPlayers: 2,
    targetLabel: 'PLAY TO',
    targets: [50, 100, 200],
    defaultTarget: 100,
    rules: PIG_RULES,
    route: '/dice/pig',
  },
}

const route = useRoute()
const router = useRouter()
const playersStore = usePlayersStore()
const farkleStore = useFarkleStore()
const sccStore = useSCCStore()
const pigStore = usePigStore()

const variant = computed<Variant>(() => {
  const v = String(route.params.variant ?? '')
  return (v in CONFIG ? v : 'farkle') as Variant
})
const config = computed(() => CONFIG[variant.value])

const selectedPlayers = ref<Player[]>([])
const target = ref<number>(CONFIG[variant.value].defaultTarget)

const sortedPlayers = computed(() =>
  [...playersStore.players].sort((a, b) => {
    if (a.pinned && !b.pinned) return -1
    if (!a.pinned && b.pinned) return 1
    return b.gamesPlayed - a.gamesPlayed
  })
)

function isSelected(id: string) { return selectedPlayers.value.some(p => p.id === id) }
function isPhoto(url: string | null) { return !!url && (url.startsWith('data:') || url.startsWith('http')) }
function togglePlayer(p: Player) { if (!isSelected(p.id)) selectedPlayers.value.push(p) }
function removePlayer(id: string) { selectedPlayers.value = selectedPlayers.value.filter(p => p.id !== id) }
function moveUp(i: number) {
  const arr = [...selectedPlayers.value]
  ;[arr[i - 1], arr[i]] = [arr[i]!, arr[i - 1]!]
  selectedPlayers.value = arr
}
function moveDown(i: number) {
  const arr = [...selectedPlayers.value]
  ;[arr[i], arr[i + 1]] = [arr[i + 1]!, arr[i]!]
  selectedPlayers.value = arr
}

function start() {
  const players = [...selectedPlayers.value]
  if (players.length < config.value.minPlayers) return
  if (variant.value === 'farkle') farkleStore.startGame(players, target.value)
  else if (variant.value === 'scc') sccStore.startGame(players, target.value)
  else pigStore.startGame(players, target.value)
  router.push(config.value.route)
}
</script>

<style scoped>
.setup-page {
  display: flex; flex-direction: column; width: 100vw; height: 100dvh;
  overflow: hidden; background: #0a0a0a;
}
.setup-header {
  display: flex; align-items: center; justify-content: space-between;
  padding: 14px 20px; padding-top: calc(14px + env(safe-area-inset-top));
  border-bottom: 1px solid rgba(255,255,255,0.08); background: rgba(0,0,0,0.6);
  backdrop-filter: blur(20px); -webkit-backdrop-filter: blur(20px); flex-shrink: 0;
}
.header-back, .header-spacer { min-width: 72px; }
.setup-title {
  font-size: 24px; letter-spacing: 0.12em; margin: 0; text-align: center;
  background: linear-gradient(135deg, var(--gold), var(--orange));
  -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text;
}
/* Owns its own scroll — the app shell is fixed and overflow:hidden, so a page that
   relies on the document scrolling silently clips everything below the fold. */
.setup-body {
  flex: 1; min-height: 0; overflow-y: auto; -webkit-overflow-scrolling: touch;
  overscroll-behavior: contain; padding: 20px 16px; display: flex;
  flex-direction: column; gap: 22px;
}
.ng-section { display: flex; flex-direction: column; gap: 10px; }
.label {
  font-size: 10px; font-weight: 800; letter-spacing: 0.16em; text-transform: uppercase;
  color: var(--text-muted);
}
.empty-players { color: var(--text-muted); font-size: 14px; display: flex; align-items: center; gap: 8px; }
.link-btn { background: none; border: none; color: var(--pink); font-weight: 700; cursor: pointer; min-height: 44px; }

.player-bubble-grid { display: flex; flex-wrap: wrap; gap: 12px; }
.player-bubble {
  display: flex; flex-direction: column; align-items: center; gap: 6px;
  width: 78px; cursor: pointer; position: relative; padding: 6px 0;
}
.bubble-avatar {
  width: 54px; height: 54px; border-radius: 50%; display: flex; align-items: center;
  justify-content: center; font-size: 26px; overflow: hidden;
  box-shadow: 0 0 0 2px rgba(255,255,255,0.08);
}
.bubble-avatar img { width: 100%; height: 100%; object-fit: cover; }
.add-bubble-avatar { background: rgba(255,255,255,0.06); border: 2px dashed rgba(255,255,255,0.25); color: var(--text-muted); }
.bubble-name { font-size: 11px; font-weight: 600; text-align: center; overflow-wrap: anywhere; }
.bubble-pin { position: absolute; top: 0; right: 10px; font-size: 12px; }

.order-list { display: flex; flex-direction: column; gap: 8px; }
.order-row {
  display: flex; align-items: center; gap: 12px; padding: 10px 12px;
  background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.08);
  border-left: 3px solid; border-radius: 8px;
}
.order-num { font-size: 18px; min-width: 20px; }
.order-avatar {
  width: 34px; height: 34px; border-radius: 50%; display: flex; align-items: center;
  justify-content: center; font-size: 17px; overflow: hidden; flex-shrink: 0;
}
.order-avatar img { width: 100%; height: 100%; object-fit: cover; }
.order-name { flex: 1; font-size: 14px; font-weight: 600; overflow-wrap: anywhere; }
.order-btns { display: flex; gap: 6px; }
.order-btns .btn { min-width: 44px; min-height: 44px; }
.remove-btn { color: var(--pink); }

.target-btns { display: flex; gap: 10px; flex-wrap: wrap; }
.target-btn {
  flex: 1; min-width: 84px; min-height: 48px; border-radius: 10px;
  background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.12);
  color: var(--text); font-weight: 800; font-size: 15px; cursor: pointer;
  font-family: var(--font-display); letter-spacing: 0.04em;
}
.target-btn.active { background: linear-gradient(135deg, var(--gold), var(--orange)); color: #000; border-color: transparent; }

.rules-list {
  margin: 0; padding-left: 18px; display: flex; flex-direction: column; gap: 6px;
  color: var(--text-muted); font-size: 13px; line-height: 1.45;
}

.setup-footer {
  flex-shrink: 0; padding: 14px 16px;
  padding-bottom: calc(14px + env(safe-area-inset-bottom));
  border-top: 1px solid rgba(255,255,255,0.08); background: rgba(0,0,0,0.6);
  backdrop-filter: blur(20px); -webkit-backdrop-filter: blur(20px);
}
.start-btn { width: 100%; min-height: 56px; }
.start-btn:disabled { opacity: 0.45; }
</style>
