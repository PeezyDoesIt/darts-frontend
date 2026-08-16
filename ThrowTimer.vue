<template>
  <!--
    The throw clock, in one place.

    The fill and the label were written out identically in five spots across four entry
    components, but each carried its own container — so cricket's was a full-width bar whose
    red fill drains away, while 1001 and the simple games boxed the same thing into a fixed
    90px rounded tile. An 80px "PAUSED" does not fit in 90px, which is what it looked like.

    The container lives here now, so the clock cannot look like a different feature depending
    on which game you happen to be playing. Callers that need layout of their own pass a class
    — Vue merges it onto this root.
  -->
  <div class="throw-timer" @click="duration ? emit('toggle') : null">
    <template v-if="duration">
      <div
        class="throw-timer-fill"
        :class="{ warning: left <= 30, urgent: left <= 10, paused }"
        :style="{ width: `${(left / duration) * 100}%`, transition: paused ? 'none' : 'width 1s linear' }"
      />
      <span class="throw-timer-text" :class="{ urgent: left <= 10 }">{{ label }}</span>
    </template>
    <!-- What the space says when there is no clock running — cricket puts the round here. -->
    <slot v-else />
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'

const props = defineProps<{
  /** Seconds remaining. */
  timeLeft?: number
  /** Seconds the timer started from. Zero or undefined means there is no clock. */
  duration?: number
  paused?: boolean
  /** Set for a moment when the timer is tapped while pausing is locked. */
  locked?: boolean
}>()

const emit = defineEmits<{ toggle: [] }>()

const left = computed(() => props.timeLeft ?? 0)

const label = computed(() =>
  props.locked ? 'LOCKED' : props.paused ? 'PAUSED' : `${left.value}s`)
</script>

<style scoped>
/*
 * `align-self: stretch` rather than `min-height: 100%`.
 *
 * The height used to come from the parent's line box, which works in a row and does the wrong
 * thing in a column: Horse lays the clock under the NEXT button, and there the same rule grew
 * it into a red slab a third of the screen tall. Stretching to the row's cross axis gives the
 * same result where it worked before, and nothing where it did not.
 */
.throw-timer {
  flex: 1;
  align-self: stretch;
  position: relative;
  overflow: hidden;
  display: flex;
  align-items: center;
  padding: 0 4px;
  cursor: pointer;
}

/*
 * The bar drains left to right rather than a number counting down in a box: at a glance from
 * the oche, the width is the reading.
 */
.throw-timer-fill {
  position: absolute; left: 0; top: 0; bottom: 0;
  pointer-events: none;
  background: #ff0000;
  transition: width 1s linear, background 0.3s;
  z-index: 0;
}
.throw-timer-fill.warning { background: #ff0000; }
.throw-timer-fill.urgent { background: #ff3333; }
.throw-timer-fill.paused { background: rgba(120, 120, 120, 0.6); }

/*
 * Sized through a custom property so a caller can shrink it without reaching inside.
 *
 * Horse in landscape needs a much smaller clock than the cricket board does, and scoped CSS
 * cannot style a child of another component — only its root. Setting the property on the root
 * is how that override survives the extraction.
 */
.throw-timer-text {
  position: relative; z-index: 1;
  font-size: var(--throw-timer-size, clamp(46px, 7dvh, 80px));
  font-weight: 900;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: #fff;
  font-family: var(--font-display);
}
</style>
