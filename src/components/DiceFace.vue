<template>
  <div
    class="die"
    :class="{ selectable, selected, held }"
    :style="sizeStyle"
    role="img"
    :aria-label="ariaLabel"
  >
    <span v-for="pip in PIP_POSITIONS[face] ?? []" :key="pip" class="pip" :class="`pip-${pip}`" />
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'

/**
 * A single die face rendered as pips rather than a numeral — at a glance across a table a
 * pip pattern reads faster than a digit, which is the whole point on a shared screen.
 */
const props = withDefaults(defineProps<{
  face: number
  size?: number
  selectable?: boolean
  selected?: boolean
  /** Claimed/locked die — styled distinctly from a live selection. */
  held?: boolean
}>(), { size: 56, selectable: false, selected: false, held: false })

// Grid cell names per face, mapped to a 3x3 layout in CSS.
const PIP_POSITIONS: Record<number, string[]> = {
  1: ['c'],
  2: ['tl', 'br'],
  3: ['tl', 'c', 'br'],
  4: ['tl', 'tr', 'bl', 'br'],
  5: ['tl', 'tr', 'c', 'bl', 'br'],
  6: ['tl', 'tr', 'ml', 'mr', 'bl', 'br'],
}

const sizeStyle = computed(() => ({ width: `${props.size}px`, height: `${props.size}px` }))
const ariaLabel = computed(() => {
  const state = props.held ? ', held' : props.selected ? ', selected' : ''
  return `Die showing ${props.face}${state}`
})
</script>

<style scoped>
.die {
  position: relative;
  border-radius: 14%;
  background: linear-gradient(155deg, #fdfdfd, #d8d8d8);
  box-shadow: 0 3px 8px rgba(0,0,0,0.5), inset 0 -2px 4px rgba(0,0,0,0.18);
  flex-shrink: 0;
  transition: transform 0.12s ease, box-shadow 0.12s ease;
}
.die.selectable { cursor: pointer; }
/* 44px minimum touch target regardless of the visual size the board asks for. */
.die.selectable::after {
  content: ''; position: absolute; inset: 50% auto auto 50%;
  transform: translate(-50%, -50%);
  min-width: 44px; min-height: 44px; width: 100%; height: 100%;
}
.die.selected {
  transform: translateY(-6px);
  box-shadow: 0 0 0 3px var(--gold), 0 8px 16px rgba(0,0,0,0.55);
}
.die.held {
  background: linear-gradient(155deg, #cfe9d0, #8fc294);
  box-shadow: 0 0 0 3px var(--green, #4caf50), 0 3px 8px rgba(0,0,0,0.5);
}

.pip {
  position: absolute;
  width: 18%; height: 18%;
  border-radius: 50%;
  background: #16161a;
}
.pip-tl { top: 16%; left: 16%; }
.pip-tr { top: 16%; right: 16%; }
.pip-ml { top: 41%; left: 16%; }
.pip-mr { top: 41%; right: 16%; }
.pip-bl { bottom: 16%; left: 16%; }
.pip-br { bottom: 16%; right: 16%; }
.pip-c  { top: 41%; left: 41%; }
</style>
