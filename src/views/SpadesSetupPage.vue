<template>
  <div class="setup-page">
    <div class="drip-bar" />

    <div class="setup-header">
      <button v-ripple class="btn btn-outline btn-sm header-back" @click="goBack(router, '/')">← Back</button>
      <h1 class="setup-title display">SPADES</h1>
      <div class="header-spacer" />
    </div>

    <div class="setup-body">
      <section class="ng-section">
        <span class="label">WHO'S PLAYING</span>
        <p class="hint">Pick one to four people — the computer fills the rest of the table.</p>

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
            :class="{ disabled: selected.length >= 4 }"
            @click="add(p)"
          >
            <div class="bubble-avatar" :style="{ background: p.color }">
              <img v-if="isPhoto(p.avatarUrl)" :src="p.avatarUrl!" alt="" />
              <span v-else>{{ p.avatarUrl ?? '🂡' }}</span>
            </div>
            <span class="bubble-name">{{ p.name }}</span>
          </div>
        </div>
      </section>

      <section class="ng-section">
        <span class="label">TABLE</span>
        <p class="hint">
          {{ botCount === 0
            ? 'Four people, passing the device between turns.'
            : `${selected.length} playing, ${botCount} computer ${botCount === 1 ? 'seat' : 'seats'} — no passing for those.` }}
        </p>
        <div class="seats">
          <div v-for="(s, i) in table" :key="s.id" class="seat" :class="[`team-${i % 2}`, { bot: s.isBot }]">
            <span class="seat-num">SEAT {{ i + 1 }}</span>
            <div class="seat-avatar" :style="{ background: s.color }">
              <img v-if="!s.isBot && isPhoto(s.avatarUrl)" :src="s.avatarUrl!" alt="" />
              <span v-else>{{ s.isBot ? '🤖' : (s.avatarUrl ?? '🂡') }}</span>
            </div>
            <span class="seat-name">{{ s.name }}</span>
            <div class="seat-btns">
              <template v-if="!s.isBot">
                <button v-ripple :disabled="i === 0" class="btn btn-sm btn-surface" aria-label="Move up" @click="move(i, -1)">↑</button>
                <button v-ripple :disabled="i >= selected.length - 1" class="btn btn-sm btn-surface" aria-label="Move down" @click="move(i, 1)">↓</button>
                <button v-ripple class="btn btn-sm btn-surface remove-btn" aria-label="Remove" @click="remove(s.id)">✕</button>
              </template>
              <span v-else class="bot-tag">COMPUTER</span>
            </div>
          </div>
        </div>
        <p class="partner-note">
          Partners sit opposite: <strong>{{ table[0]?.name }} &amp; {{ table[2]?.name }}</strong>
          against <strong>{{ table[1]?.name }} &amp; {{ table[3]?.name }}</strong>.
        </p>
      </section>

      <section class="ng-section">
        <span class="label">STYLE</span>
        <div class="variant-btns">
          <button
            v-for="v in (['classic', 'wild'] as const)"
            :key="v"
            v-ripple
            class="variant-btn"
            :class="{ active: variant === v }"
            @click="variant = v"
          >
            <span class="vb-name">{{ VARIANT_LABELS[v] }}</span>
            <span class="vb-deck">{{ v === 'wild' ? '50 cards + 2 jokers' : 'standard 52' }}</span>
          </button>
        </div>
        <p class="variant-blurb">{{ VARIANT_BLURBS[variant] }}</p>

        <div v-if="variant === 'wild'" class="joker-preview">
          <PlayingCard :card="{ kind: 'joker', joker: 'big' }" :width="58" />
          <PlayingCard :card="{ kind: 'joker', joker: 'little' }" :width="58" />
          <p class="jp-note">
            <strong>H</strong> is the high joker (colored), <strong>L</strong> the low one
            (black &amp; white). Both play as spades and beat the ace.
          </p>
        </div>
      </section>

      <section class="ng-section">
        <span class="label">HOW TO PLAY</span>
        <ul class="rules-list"><li v-for="(r, i) in rules" :key="i">{{ r }}</li></ul>
      </section>
    </div>

    <div class="setup-footer">
      <button v-ripple class="btn btn-spray btn-lg start-btn" :disabled="selected.length === 0" @click="start">
        {{ selected.length === 0 ? 'Pick at least one player' : 'DEAL →' }}
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import PlayingCard from '../components/PlayingCard.vue'
import { usePlayersStore } from '../stores/players'
import { useSpadesStore } from '../stores/spades'
import { VARIANT_BLURBS, VARIANT_LABELS, rulesFor, type SpadesVariant } from '../lib/spades'
import { botName } from '../lib/spadesBot'
import { goBack } from '../router/goBack'
import type { Player } from '../types/index'

const router = useRouter()
const playersStore = usePlayersStore()
const spades = useSpadesStore()

const selected = ref<Player[]>([])
const variant = ref<SpadesVariant>('wild')
const rules = computed(() => rulesFor(variant.value))

const BOT_COLORS = ['#9aa0b5', '#8f7bff', '#5fd0ff', '#7ee68a']

/**
 * Humans take the low seats and bots fill the rest, so seat order stays predictable as
 * people are added and removed. Partners are seats 0/2 against 1/3, which the note under
 * the table spells out — with two humans that means they are opponents, not partners,
 * unless a bot is moved between them.
 */
const table = computed(() => {
  const humans = selected.value.map(p => ({
    id: p.id, name: p.name, color: p.color, avatarUrl: p.avatarUrl, isBot: false as const,
  }))
  const bots = Array.from({ length: 4 - humans.length }, (_, i) => {
    const seat = humans.length + i
    return {
      id: `bot-${seat}`, name: botName(seat), color: BOT_COLORS[seat % BOT_COLORS.length]!,
      avatarUrl: null, isBot: true as const,
    }
  })
  return [...humans, ...bots]
})
const botCount = computed(() => 4 - selected.value.length)

const sortedPlayers = computed(() =>
  [...playersStore.players].sort((a, b) => {
    if (a.pinned && !b.pinned) return -1
    if (!a.pinned && b.pinned) return 1
    return b.gamesPlayed - a.gamesPlayed
  })
)

function isSelected(id: string) { return selected.value.some(p => p.id === id) }
function isPhoto(url: string | null) { return !!url && (url.startsWith('data:') || url.startsWith('http')) }
function add(p: Player) { if (selected.value.length < 4 && !isSelected(p.id)) selected.value.push(p) }
function remove(id: string) { selected.value = selected.value.filter(p => p.id !== id) }
function move(i: number, dir: number) {
  const arr = [...selected.value]
  const j = i + dir
  if (j < 0 || j >= arr.length) return
  ;[arr[i], arr[j]] = [arr[j]!, arr[i]!]
  selected.value = arr
}

function start() {
  if (selected.value.length === 0) return
  const seats = table.value.map(s =>
    s.isBot
      ? { id: s.id, name: s.name, color: s.color, isBot: true as const }
      : selected.value.find(p => p.id === s.id)!
  )
  spades.startGame(seats, variant.value)
  router.push('/spades')
}
</script>

<style scoped>
.setup-page { display: flex; flex-direction: column; width: 100vw; height: 100dvh; overflow: hidden; background: #0a0a0a; }
.setup-header {
  display: flex; align-items: center; justify-content: space-between; padding: 14px 20px;
  padding-top: calc(14px + env(safe-area-inset-top)); border-bottom: 1px solid rgba(255,255,255,0.08);
  background: rgba(0,0,0,0.6); backdrop-filter: blur(20px); -webkit-backdrop-filter: blur(20px); flex-shrink: 0;
}
.header-back, .header-spacer { min-width: 72px; }
.setup-title {
  font-size: 26px; letter-spacing: 0.14em; margin: 0;
  background: linear-gradient(135deg, #cfd4ff, #8f7bff);
  -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text;
}
.setup-body {
  flex: 1; min-height: 0; overflow-y: auto; -webkit-overflow-scrolling: touch;
  overscroll-behavior: contain; padding: 20px 16px; display: flex; flex-direction: column; gap: 22px;
}
.ng-section { display: flex; flex-direction: column; gap: 10px; }
.label { font-size: 10px; font-weight: 800; letter-spacing: 0.16em; text-transform: uppercase; color: var(--text-muted); }
.hint { font-size: 12.5px; color: var(--text-muted); margin: 0; }
.empty-players { color: var(--text-muted); font-size: 14px; display: flex; align-items: center; gap: 8px; }
.link-btn { background: none; border: none; color: var(--pink); font-weight: 700; cursor: pointer; min-height: 44px; }

.player-bubble-grid { display: flex; flex-wrap: wrap; gap: 12px; }
.player-bubble { display: flex; flex-direction: column; align-items: center; gap: 6px; width: 78px; cursor: pointer; padding: 6px 0; }
.player-bubble.disabled { opacity: 0.35; pointer-events: none; }
.bubble-avatar {
  width: 54px; height: 54px; border-radius: 50%; display: flex; align-items: center;
  justify-content: center; font-size: 26px; overflow: hidden; box-shadow: 0 0 0 2px rgba(255,255,255,0.08);
}
.bubble-avatar img { width: 100%; height: 100%; object-fit: cover; }
.add-bubble-avatar { background: rgba(255,255,255,0.06); border: 2px dashed rgba(255,255,255,0.25); color: var(--text-muted); }
.bubble-name { font-size: 11px; font-weight: 600; text-align: center; overflow-wrap: anywhere; }

.seats { display: flex; flex-direction: column; gap: 8px; }
.seat {
  display: grid; grid-template-columns: auto auto 1fr auto; align-items: center; gap: 10px;
  padding: 10px 12px; border-radius: 8px; background: rgba(255,255,255,0.04);
  border: 1px solid rgba(255,255,255,0.08); border-left: 4px solid;
}
.seat.team-0 { border-left-color: #7ee68a; }
.seat.team-1 { border-left-color: #5fd0ff; }
.seat-num { font-size: 9px; font-weight: 800; letter-spacing: 0.1em; color: var(--text-muted); }
.seat-avatar {
  width: 34px; height: 34px; border-radius: 50%; display: flex; align-items: center;
  justify-content: center; font-size: 17px; overflow: hidden;
}
.seat-avatar img { width: 100%; height: 100%; object-fit: cover; }
.seat-name { font-size: 14px; font-weight: 700; overflow-wrap: anywhere; }
.seat.bot { opacity: 0.82; border-style: dashed; }
.bot-tag { font-size: 9px; font-weight: 800; letter-spacing: 0.12em; color: var(--text-muted); }
.partner-note { font-size: 12.5px; color: var(--text-muted); margin: 4px 0 0; line-height: 1.5; }
.partner-note strong { color: var(--text); }
.seat-btns { display: flex; gap: 6px; grid-column: 1 / -1; justify-content: flex-end; }
.seat-btns .btn { min-width: 44px; min-height: 44px; }
.remove-btn { color: var(--pink); }

.rules-list {
  margin: 0; padding-left: 18px; display: flex; flex-direction: column; gap: 6px;
  color: var(--text-muted); font-size: 13px; line-height: 1.45;
}
.variant-btns { display: flex; gap: 10px; }
.variant-btn {
  flex: 1; min-height: 62px; border-radius: 10px; display: flex; flex-direction: column;
  align-items: center; justify-content: center; gap: 3px; padding: 8px;
  background: rgba(255,255,255,0.05); border: 2px solid rgba(255,255,255,0.12);
  color: var(--text); cursor: pointer;
}
.variant-btn.active { border-color: var(--gold); background: rgba(255,200,87,0.14); }
.vb-name { font-size: 14px; font-weight: 800; font-family: var(--font-display); letter-spacing: 0.06em; }
.vb-deck { font-size: 10.5px; color: var(--text-muted); }
.variant-blurb { font-size: 12.5px; color: var(--text-muted); margin: 0; line-height: 1.5; }

.joker-preview {
  display: flex; align-items: center; gap: 12px; padding: 12px;
  background: rgba(255,255,255,0.04); border-radius: 10px; flex-wrap: wrap;
}
.jp-note { flex: 1; min-width: 170px; font-size: 12.5px; color: var(--text-muted); margin: 0; line-height: 1.45; }
.jp-note strong { color: var(--gold); }

.setup-footer {
  flex-shrink: 0; padding: 14px 16px; padding-bottom: calc(14px + env(safe-area-inset-bottom));
  border-top: 1px solid rgba(255,255,255,0.08); background: rgba(0,0,0,0.6);
  backdrop-filter: blur(20px); -webkit-backdrop-filter: blur(20px);
}
.start-btn { width: 100%; min-height: 56px; }
.start-btn:disabled { opacity: 0.45; }
</style>
