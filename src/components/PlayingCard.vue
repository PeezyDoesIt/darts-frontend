<template>
  <button
    v-if="card"
    class="card"
    :class="[
      isJoker ? (jokerKind === 'big' ? 'joker-high' : 'joker-low') : suitClass,
      { playable, dimmed: !playable && interactive, faceDown },
    ]"
    :style="sizeStyle"
    :disabled="interactive && !playable"
    :aria-label="ariaLabel"
    @click="interactive && playable && $emit('play', card)"
  >
    <template v-if="faceDown">
      <span class="back-mark">♠</span>
    </template>
    <template v-else-if="isJoker">
      <!-- The two jokers must be distinguishable at a glance across a table: the high one
           is colored, the low one is greyscale, and both carry an explicit H / L. -->
      <span class="corner tl">{{ label }}</span>
      <span class="joker-face">★</span>
      <span class="joker-word">{{ jokerKind === 'big' ? 'HIGH' : 'LOW' }}</span>
      <span class="corner br">{{ label }}</span>
    </template>
    <template v-else>
      <span class="corner tl">{{ label }}<em>{{ symbol }}</em></span>
      <span class="pip-big">{{ symbol }}</span>
      <span class="corner br">{{ label }}<em>{{ symbol }}</em></span>
    </template>
  </button>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { SUIT_SYMBOL, cardLabel, effectiveSuit, rankLabel, type Card } from '../lib/spades'

const props = withDefaults(defineProps<{
  card: Card | null
  width?: number
  /** Emits `play` and renders disabled styling when not playable. */
  interactive?: boolean
  playable?: boolean
  faceDown?: boolean
}>(), { width: 62, interactive: false, playable: true, faceDown: false })

defineEmits<{ play: [card: Card] }>()

const isJoker = computed(() => props.card?.kind === 'joker')
// The template cannot narrow the Card union, so the discriminant is resolved here.
const jokerKind = computed(() => (props.card?.kind === 'joker' ? props.card.joker : null))
const label = computed(() => (props.card ? cardLabel(props.card) : ''))
const symbol = computed(() =>
  props.card && props.card.kind === 'pip' ? SUIT_SYMBOL[props.card.suit] : ''
)
const suitClass = computed(() => {
  if (!props.card || props.card.kind !== 'pip') return ''
  const s = props.card.suit
  return s === 'hearts' || s === 'diamonds' ? 'red' : 'black'
})
const sizeStyle = computed(() => ({
  width: `${props.width}px`,
  height: `${Math.round(props.width * 1.45)}px`,
}))
const ariaLabel = computed(() => {
  const c = props.card
  if (!c) return ''
  if (props.faceDown) return 'Face-down card'
  if (c.kind === 'joker') return `${c.joker === 'big' ? 'High' : 'Low'} joker, counts as a spade`
  return `${rankLabel(c.rank)} of ${effectiveSuit(c)}`
})
</script>

<style scoped>
.card {
  position: relative;
  flex-shrink: 0;
  border-radius: 7%/5%;
  border: 1px solid rgba(0,0,0,0.35);
  background: linear-gradient(160deg, #fffefb, #eceae4);
  box-shadow: 0 2px 6px rgba(0,0,0,0.45);
  padding: 0;
  cursor: default;
  font-family: var(--font-display, system-ui);
  transition: transform 0.12s ease, box-shadow 0.12s ease, opacity 0.12s ease;
}
.card.playable { cursor: pointer; }
.card.playable:hover, .card.playable:focus-visible {
  transform: translateY(-10px);
  box-shadow: 0 10px 18px rgba(0,0,0,0.55);
  outline: none;
}
.card.playable:focus-visible { box-shadow: 0 0 0 3px var(--gold), 0 10px 18px rgba(0,0,0,0.55); }
/* An illegal card stays visible but is clearly out of play, so the rule teaches itself. */
.card.dimmed { opacity: 0.34; filter: grayscale(0.6); }
.card.faceDown {
  background: repeating-linear-gradient(45deg, #1d2b53, #1d2b53 5px, #24357a 5px, #24357a 10px);
  display: flex; align-items: center; justify-content: center;
}
.back-mark { color: rgba(255,255,255,0.4); font-size: 20px; }

.corner {
  position: absolute; font-weight: 800; line-height: 1;
  font-size: clamp(11px, 22cqw, 17px); display: flex; flex-direction: column; align-items: center;
}
.corner em { font-style: normal; font-size: 0.85em; }
.tl { top: 5%; left: 7%; }
.br { bottom: 5%; right: 7%; transform: rotate(180deg); }

.pip-big {
  position: absolute; inset: 0; display: flex; align-items: center; justify-content: center;
  font-size: clamp(20px, 46cqw, 32px); opacity: 0.9;
}
.card { container-type: inline-size; }

.red  { color: #d1122c; }
.black { color: #17171b; }

/* High joker — full colour. */
.joker-high {
  background: linear-gradient(150deg, #ffd166, #ff5fa2 55%, #6f5cff);
  color: #1a0f2e;
  border-color: rgba(255,255,255,0.5);
}
/* Low joker — deliberately greyscale, matching the physical card. */
.joker-low {
  background: linear-gradient(150deg, #fbfbfb, #b9b9b9);
  color: #17171b;
}
.joker-face {
  position: absolute; inset: 0; display: flex; align-items: center; justify-content: center;
  font-size: clamp(18px, 40cqw, 28px);
}
.joker-word {
  position: absolute; bottom: 21%; left: 0; right: 0; text-align: center;
  font-size: clamp(7px, 15cqw, 10px); font-weight: 900; letter-spacing: 0.12em;
  opacity: 0.85;
}
</style>
