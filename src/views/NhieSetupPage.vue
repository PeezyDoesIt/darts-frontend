<template>
  <div class="nhie-setup">
    <div class="drip-bar" />

    <header class="ns-header">
      <button v-ripple class="ns-chrome" @click="goBack(router, '/')">← BACK</button>
      <h1 class="ns-title">NEVER HAVE I EVER</h1>
      <div class="ns-spacer" />
    </header>

    <div class="ns-body">
      <section class="ns-section">
        <span class="ns-label">WHO'S PLAYING</span>
        <PlayerPicker
          :roster="playersStore.players"
          :selected-ids="selected.map(p => p.id)"
          @pick="pickFromRoster"
        />
      </section>

      <!--
        A bar is full of people who are not in anyone's roster. Typing a name has to be as fast
        as tapping one, or the game stops being playable with whoever is actually there.
      -->
      <section class="ns-section">
        <span class="ns-label">ADD SOMEONE</span>
        <div class="ns-guest-row">
          <button v-ripple class="ns-emoji" @click="cycleEmoji">{{ guestEmoji }}</button>
          <input
            v-model="guestName"
            class="ns-guest-input"
            placeholder="Name..."
            maxlength="20"
            autocomplete="off"
            @keydown.enter="addGuest"
          />
          <button v-ripple class="ns-add" :disabled="!guestName.trim()" @click="addGuest">ADD</button>
        </div>
      </section>

      <section v-if="selected.length" class="ns-section">
        <span class="ns-label">AT THE TABLE · {{ selected.length }}</span>
        <div class="ns-chips">
          <button
            v-for="p in selected"
            :key="p.id"
            v-ripple
            class="ns-chip"
            :style="{ borderColor: p.color }"
            @click="remove(p.id)"
          >
            <span class="ns-chip-name">{{ p.name }}</span>
            <span class="ns-chip-x">✕</span>
          </button>
        </div>
        <p class="ns-hint">Tap a name to take them out.</p>
      </section>

      <!--
        Tiers stack, and the hotter ones are off until somebody turns them on. The room opts in
        rather than opting out after a card has already been read aloud — which is the whole
        reason these are separate packs instead of one shuffled pile.
      -->
      <section class="ns-section">
        <span class="ns-label">PACKS</span>
        <div class="ns-tiers">
          <button
            v-for="t in TIERS"
            :key="t"
            v-ripple
            class="ns-tier"
            :class="{ on: tiers.includes(t), locked: t === 'bar' }"
            @click="toggleTier(t)"
          >
            <span class="ns-tier-name">{{ TIER_LABELS[t] }}</span>
            <span class="ns-tier-blurb">{{ TIER_BLURBS[t] }}</span>
            <span class="ns-tier-count">{{ countFor(t) }} cards</span>
          </button>
        </div>
        <p class="ns-hint">Bar is always in. The others stack on top.</p>
      </section>
    </div>

    <footer class="ns-footer">
      <span class="ns-deck">{{ deckSize }} cards</span>
      <button v-ripple class="ns-start" :disabled="selected.length < 2" @click="start">
        {{ selected.length < 2 ? 'ADD TWO PEOPLE' : 'START →' }}
      </button>
    </footer>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import PlayerPicker from '../components/PlayerPicker.vue'
import { usePlayersStore } from '../stores/players'
import { useNhieStore, type NhiePlayer } from '../stores/nhie'
import { PROMPTS, TIERS, TIER_LABELS, TIER_BLURBS, deckFor, type NhieTier } from '../lib/nhiePrompts'
import { goBack } from '../router/goBack'
import type { Player } from '../types/index'

const router = useRouter()
const playersStore = usePlayersStore()
const nhie = useNhieStore()

const selected = ref<NhiePlayer[]>([])
const tiers = ref<NhieTier[]>(['bar'])

const GUEST_EMOJIS = ['😎', '🍻', '🔥', '💀', '🎯', '👑', '🦊', '🌶️']
const GUEST_COLORS = ['#ff2d78', '#00d4ff', '#aaff00', '#bf5fff', '#ff6b1a', '#ffd700']
const guestName = ref('')
const guestEmojiIdx = ref(0)
const guestEmoji = computed(() => GUEST_EMOJIS[guestEmojiIdx.value]!)
function cycleEmoji() { guestEmojiIdx.value = (guestEmojiIdx.value + 1) % GUEST_EMOJIS.length }

function pickFromRoster(p: Player) {
  if (selected.value.some(s => s.id === p.id)) return
  selected.value.push({ id: p.id, name: p.name, avatarUrl: p.avatarUrl, color: p.color })
}

function addGuest() {
  const name = guestName.value.trim()
  if (!name) return
  selected.value.push({
    id: `guest-${Date.now()}`,
    name,
    avatarUrl: guestEmoji.value,
    color: GUEST_COLORS[selected.value.length % GUEST_COLORS.length]!,
    isGuest: true,
  })
  guestName.value = ''
  cycleEmoji()
}

function remove(id: string) { selected.value = selected.value.filter(p => p.id !== id) }

function toggleTier(t: NhieTier) {
  // Bar cannot be turned off: with nothing selected the deck would be empty, and an empty
  // screen is a worse answer than the safe pack.
  if (t === 'bar') return
  tiers.value = tiers.value.includes(t)
    ? tiers.value.filter(x => x !== t)
    : [...tiers.value, t]
}

function countFor(t: NhieTier) { return PROMPTS.filter(p => p.tier === t).length }

/** What will actually be dealt: the chosen packs, minus anything hidden on this device. */
const deckSize = computed(() =>
  deckFor(new Set(tiers.value), new Set(nhie.hidden)).length
)

function start() {
  if (selected.value.length < 2) return
  nhie.startGame([...selected.value], [...tiers.value])
  router.push('/nhie')
}
</script>

<style scoped>
.nhie-setup {
  display: flex; flex-direction: column; width: 100vw; height: 100dvh; overflow: hidden;
  background: #0d0d11;
  background-image: radial-gradient(rgba(255,255,255,0.11) 0.7px, transparent 0.7px);
  background-size: 5px 5px;
  font-family: var(--font-body, Inter, system-ui, sans-serif);
}
.ns-header {
  flex-shrink: 0; display: flex; align-items: center; gap: 16px; min-height: 78px; padding: 0 22px;
  padding-top: env(safe-area-inset-top);
  background: #101014; border-bottom: 3px solid var(--pink, #ff2d78);
}
.ns-chrome {
  background: transparent; border: 2px solid rgba(255,255,255,0.22); color: #fff;
  font-family: var(--font-display, 'Bebas Neue', sans-serif); font-size: 18px; letter-spacing: 0.14em;
  padding: 9px 14px; cursor: pointer; flex-shrink: 0;
  position: relative; overflow: hidden; -webkit-tap-highlight-color: transparent;
}
.ns-title {
  margin: 0; font-family: var(--font-display, 'Bebas Neue', sans-serif); font-size: 34px; line-height: 1;
  background: var(--pink, #ff2d78); color: #101014; padding: 5px 14px 3px;
  transform: rotate(-0.8deg); box-shadow: 4px 4px 0 rgba(0,0,0,0.55);
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
}
.ns-spacer { margin-left: auto; }

.ns-body {
  flex: 1; min-height: 0; overflow-y: auto; -webkit-overflow-scrolling: touch;
  padding: 20px 22px 24px; display: flex; flex-direction: column; gap: 22px;
}
.ns-section { display: flex; flex-direction: column; gap: 10px; }
.ns-label { font-size: 12px; font-weight: 900; letter-spacing: 0.18em; color: rgba(255,255,255,0.45); }
.ns-hint { font-size: 13px; color: rgba(255,255,255,0.45); margin: 0; }

.ns-guest-row { display: flex; gap: 10px; align-items: stretch; }
.ns-emoji {
  width: 58px; flex-shrink: 0; font-size: 26px; background: #17171d;
  border: 2px solid #2a2a34; cursor: pointer; color: #fff;
  position: relative; overflow: hidden; -webkit-tap-highlight-color: transparent;
}
.ns-guest-input {
  flex: 1; min-width: 0; background: #17171d; border: 2px solid #2a2a34; color: #fff;
  padding: 12px 14px; font-size: 17px; font-family: inherit; outline: none; -webkit-appearance: none;
}
.ns-guest-input:focus { border-color: var(--pink, #ff2d78); }
.ns-add {
  flex-shrink: 0; background: var(--lime, #aaff00); color: #101014; border: 2px solid #101014;
  font-family: var(--font-display, 'Bebas Neue', sans-serif); font-size: 22px; letter-spacing: 0.1em;
  padding: 0 20px; cursor: pointer; box-shadow: 4px 4px 0 rgba(0,0,0,0.6);
  position: relative; overflow: hidden; -webkit-tap-highlight-color: transparent;
}
.ns-add:disabled { opacity: 0.35; cursor: not-allowed; }

.ns-chips { display: flex; flex-wrap: wrap; gap: 8px; }
.ns-chip {
  display: flex; align-items: center; gap: 8px; padding: 8px 12px;
  background: #17171d; border: 2px solid; color: #fff; cursor: pointer;
  position: relative; overflow: hidden; -webkit-tap-highlight-color: transparent;
}
.ns-chip-name { font-family: var(--font-display, 'Bebas Neue', sans-serif); font-size: 21px; line-height: 1; }
.ns-chip-x { font-size: 12px; color: rgba(255,255,255,0.5); }

.ns-tiers { display: flex; flex-direction: column; gap: 10px; }
.ns-tier {
  display: flex; flex-direction: column; align-items: flex-start; gap: 3px; text-align: left;
  padding: 14px 16px; background: #141419; border: 2px solid #2a2a34; color: #fff; cursor: pointer;
  position: relative; overflow: hidden; -webkit-tap-highlight-color: transparent;
}
.ns-tier.on { border-color: var(--lime, #aaff00); background: rgba(170,255,0,0.08); }
/* Bar is on and stays on, so it does not offer a tap that would do nothing. */
.ns-tier.locked { cursor: default; opacity: 0.9; }
.ns-tier-name { font-family: var(--font-display, 'Bebas Neue', sans-serif); font-size: 26px; line-height: 1; }
.ns-tier-blurb { font-size: 13px; color: rgba(255,255,255,0.6); }
.ns-tier-count { font-size: 11px; font-weight: 900; letter-spacing: 0.14em; color: rgba(255,255,255,0.4); }

.ns-footer {
  flex-shrink: 0; display: flex; align-items: center; gap: 16px; min-height: 104px; padding: 0 22px;
  padding-bottom: env(safe-area-inset-bottom);
  background: #141419; border-top: 4px solid var(--pink, #ff2d78);
}
.ns-deck { font-family: var(--font-display, 'Bebas Neue', sans-serif); font-size: 28px; color: rgba(255,255,255,0.55); }
.ns-start {
  margin-left: auto; background: var(--lime, #aaff00); color: #101014; border: 3px solid #101014;
  box-shadow: 6px 6px 0 rgba(0,0,0,0.6);
  font-family: var(--font-display, 'Bebas Neue', sans-serif); font-size: 34px; letter-spacing: 0.1em;
  min-height: 76px; padding: 0 34px; cursor: pointer; white-space: nowrap;
  position: relative; overflow: hidden; -webkit-tap-highlight-color: transparent;
}
.ns-start:disabled { opacity: 0.4; cursor: not-allowed; }

@media (max-width: 767px) {
  .ns-title { font-size: 24px; }
  .ns-header { min-height: 64px; padding: 8px 14px; gap: 10px; }
  .ns-body { padding: 16px 14px 20px; gap: 18px; }
  .ns-footer { min-height: 88px; padding: 0 14px; }
  .ns-start { font-size: 26px; padding: 0 22px; min-height: 62px; border-width: 2px; }
  .ns-deck { font-size: 21px; }
}
</style>
