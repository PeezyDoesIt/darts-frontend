<template>
  <div v-if="roster.length === 0" class="empty-players">
    No players yet.
    <button v-ripple class="link-btn" @click="router.push(newPlayerRoute)">Add one →</button>
  </div>

  <div v-else class="player-bubble-grid">
    <button v-ripple type="button" class="player-bubble add-player-bubble" @click="router.push(newPlayerRoute)">
      <span class="bubble-avatar add-bubble-avatar" aria-hidden="true">+</span>
      <span class="bubble-name">New Player</span>
    </button>

    <button
      v-for="p in available"
      :key="p.id"
      v-ripple
      type="button"
      class="player-bubble"
      :disabled="full"
      :aria-label="full ? `${p.name} — the table is full` : `Add ${p.name}`"
      @click="$emit('pick', p)"
    >
      <span class="bubble-avatar" :style="{ background: isPhoto(p.avatarUrl) ? 'transparent' : p.color }">
        <img v-if="isPhoto(p.avatarUrl)" :src="p.avatarUrl!" alt="" />
        <template v-else>{{ avatarGlyph(p) }}</template>
      </span>
      <span class="bubble-name">{{ p.name }}</span>
      <span v-if="p.pinned" class="bubble-pin" aria-hidden="true">📌</span>
    </button>
  </div>
</template>

<script setup lang="ts">
/**
 * The one player picker, shared by every setup screen.
 *
 * There used to be three: a 4-column grid of 72px bubbles on the darts and Yahtzee screens,
 * a wrapping row of 54px bubbles on the dice and Spades screens, and a completely different
 * avatar/name/+ row list in Left Right Center. Same job, three looks, three sets of styles
 * to keep in sync — so they didn't stay in sync.
 *
 * Selected players leave the grid and appear in the caller's order list, which is where they
 * get reordered and removed.
 */
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import type { Player } from '../types/index'
import { avatarGlyph, isPhoto, sortPlayersForPicker } from '../lib/playerDisplay'

const props = withDefaults(defineProps<{
  /** Every player on the roster. Filtering and ordering happen here. */
  roster: Player[]
  /** Ids already picked — these drop out of the grid. */
  selectedIds: string[]
  /** True once the table is full, so remaining players read as unavailable. */
  full?: boolean
  /** Where "New Player" goes. The darts flow tags the route so it can return mid-setup. */
  newPlayerRoute?: string
}>(), { full: false, newPlayerRoute: '/player-setup' })

defineEmits<{ pick: [player: Player] }>()

const router = useRouter()

const available = computed(() =>
  sortPlayersForPicker(props.roster).filter(p => !props.selectedIds.includes(p.id))
)
</script>

<style scoped>
.player-bubble-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 20px 12px;
}

/* A real <button>, so the grid is reachable by keyboard and announced as actionable —
   these were <div>s with click handlers, which no keyboard or screen reader could use. */
.player-bubble {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  position: relative;
  padding: 0;
  background: none;
  border: none;
  color: inherit;
  font: inherit;
  cursor: pointer;
  -webkit-tap-highlight-color: transparent;
  transition: transform 0.2s;
}
.player-bubble:hover:not(:disabled) { transform: scale(1.05); }
.player-bubble:disabled { opacity: 0.35; cursor: default; }
.player-bubble:focus-visible {
  outline: none;
  transform: scale(1.05);
}
.player-bubble:focus-visible .bubble-avatar {
  box-shadow: 0 0 0 3px var(--gold);
}

.bubble-avatar {
  width: 72px;
  height: 72px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 36px;
  overflow: hidden;
  box-shadow: 0 0 0 2px rgba(255, 255, 255, 0.08);
  transition: box-shadow 0.2s;
}
.bubble-avatar img { width: 100%; height: 100%; object-fit: cover; }
.add-bubble-avatar {
  background: rgba(255, 255, 255, 0.06);
  border: 2px dashed rgba(255, 255, 255, 0.25);
  color: var(--text-muted);
}

.bubble-name {
  font-size: 12px;
  font-weight: 800;
  font-family: var(--font-display);
  letter-spacing: 0.04em;
  text-align: center;
  color: rgba(255, 255, 255, 0.55);
  max-width: 100%;
  overflow-wrap: anywhere;
}
.bubble-pin { position: absolute; top: -2px; right: 4px; font-size: 10px; }

/* Carried over from the darts setup screen, which was the only picker that adapted. Three
   columns keeps 72px bubbles from crowding a narrow phone; a desktop fits eight. */
@media (max-width: 480px) {
  .player-bubble-grid { grid-template-columns: repeat(3, 1fr); gap: 16px 8px; }
  .bubble-avatar { width: 60px; height: 60px; font-size: 28px; }
}
@media (min-width: 1101px) {
  .player-bubble-grid { grid-template-columns: repeat(8, 1fr); gap: 14px 10px; }
  .bubble-avatar { width: 56px; height: 56px; font-size: 26px; }
  .bubble-name { font-size: 11px; }
}

.empty-players {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 6px;
  color: var(--text-muted);
  font-size: 13px;
}
.link-btn {
  background: none;
  border: none;
  color: var(--pink);
  font-size: 14px;
  font-weight: 700;
  cursor: pointer;
  min-height: 44px;
  padding: 0;
}
</style>
