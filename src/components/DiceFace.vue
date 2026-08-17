<template>
  <div
    class="die-stage"
    :class="{ selectable, selected, held }"
    :style="stageStyle"
    role="img"
    :aria-label="ariaLabel"
  >
    <span class="die-shadow" :style="shadowStyle" />
    <div class="die-cube" :style="cubeStyle">
      <div v-for="f in FACES" :key="f.v" class="die-face" :style="faceStyle(f)">
        <span
          v-if="glyphs"
          class="glyph"
          :style="{ color: glyphColors?.[f.v - 1] ?? pipColor, textShadow: glyphGlow?.[f.v - 1] }"
        >{{ glyphs[f.v - 1] }}</span>
        <template v-else>
          <span
            v-for="(p, i) in f.pips" :key="i"
            class="pip"
            :style="{ left: `${p[0]}%`, top: `${p[1]}%`, background: pipColor }"
          />
        </template>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from 'vue'

/**
 * A die as a real cube — six built faces, tumbling on both axes and landing on the value.
 *
 * It replaced a flat pip square. The flat one read as a score marker rather than something
 * thrown, which is the whole feeling a dice game runs on. The API is unchanged so the games
 * that already use it did not have to move: face, size, selectable, selected, held.
 *
 * The surface is a prop rather than a constant so Yahtzee's thirty-four colourways can ride
 * the same cube — geometry here, colour from the caller. The defaults are "Cast": the app's
 * own flat stock, ink pips and a hard rule on every edge. No halftone: Street prints it on
 * panels, but at die size the 6px dot grid sits on top of the pips and reads as dirt.
 */
const props = withDefaults(defineProps<{
  face: number
  /** Omit to size the die from CSS instead — set --die-size on any ancestor. */
  size?: number
  selectable?: boolean
  selected?: boolean
  /** Claimed/locked die — styled distinctly from a live selection. */
  held?: boolean
  /** Any CSS background: a flat colour or one of the gradient themes. */
  faceBg?: string
  pipColor?: string
  /** Colour of the printed rule on every edge. Themes carry their own. */
  edgeColor?: string
  /**
   * Six characters, one per face, for dice that are marked rather than pipped — LRC's
   * L / C / R and its three dots. `face` then selects which of the six is showing.
   */
  glyphs?: string[]
  glyphColors?: string[]
  glyphGlow?: (string | undefined)[]
}>(), {
  selectable: false, selected: false, held: false,
  faceBg: '#f6f4ee', pipColor: '#101014', edgeColor: '#101014',
})

/** Pip positions as percentages of the face, centred on the point. */
const PIPS: Record<number, [number, number][]> = {
  1: [[50, 50]],
  2: [[27, 27], [73, 73]],
  3: [[27, 27], [50, 50], [73, 73]],
  4: [[27, 27], [73, 27], [27, 73], [73, 73]],
  5: [[27, 27], [73, 27], [50, 50], [27, 73], [73, 73]],
  6: [[27, 24], [73, 24], [27, 50], [73, 50], [27, 76], [73, 76]],
}
/** Where each face sits on the cube. Opposite faces sum to seven, as on a real die. */
const FACE_ROT: Record<number, string> = {
  1: 'rotateY(0deg)', 6: 'rotateY(180deg)',
  2: 'rotateY(90deg)', 5: 'rotateY(-90deg)',
  3: 'rotateX(90deg)', 4: 'rotateX(-90deg)',
}
const FACES = [1, 6, 2, 5, 3, 4].map(v => ({ v, rot: FACE_ROT[v], pips: PIPS[v] }))
/** The cube rotation that brings a given face to the front. */
const SHOW: Record<number, [number, number]> = {
  1: [0, 0], 2: [0, -90], 3: [-90, 0], 4: [90, 0], 5: [0, 90], 6: [0, 180],
}

const start = SHOW[props.face] ?? SHOW[1]
const rx = ref(start[0])
const ry = ref(start[1])
const lift = ref(0)
const tween = ref('none')
let dropTimer: ReturnType<typeof setTimeout> | undefined

watch(() => props.face, (v) => {
  const [tx, ty] = SHOW[v] ?? SHOW[1]
  // Whole turns are added on top of the landing angle so the cube always spins forward and
  // never snaps backwards to reach a face it happens to be showing already.
  rx.value = Math.ceil((rx.value - tx) / 360) * 360 + tx + 360 * (1 + Math.floor(Math.random() * 2))
  ry.value = Math.ceil((ry.value - ty) / 360) * 360 + ty + 360 * (2 + Math.floor(Math.random() * 2))
  lift.value = 1
  tween.value = 'transform 0.52s cubic-bezier(0.16, 0.84, 0.3, 1)'
  clearTimeout(dropTimer)
  // The drop is its own faster leg: a single tween reads as a hover, and a thrown die comes
  // down harder than it goes up.
  dropTimer = setTimeout(() => {
    lift.value = 0
    tween.value = 'transform 0.22s cubic-bezier(0.5, 0, 0.9, 0.55)'
  }, 400)
})
onBeforeUnmount(() => clearTimeout(dropTimer))

/*
 * Everything geometric is expressed against --die-size rather than a number, so a caller can
 * size the die from CSS — Yahtzee changes its dice at five breakpoints and cannot pass a
 * number down. Passing `size` just sets the same variable inline.
 */
const stageStyle = computed(() => (
  props.size == null ? {} : { '--die-size': `${props.size}px` }
))
const cubeStyle = computed(() => ({
  transform: `translateY(calc(var(--die-size, 56px) * -0.44 * ${lift.value})) `
    + `rotateX(${rx.value}deg) rotateY(${ry.value}deg)`,
  transition: tween.value,
}))
const shadowStyle = computed(() => ({
  transform: `translateX(-50%) scale(${1 - 0.4 * lift.value})`,
  opacity: String(1 - 0.55 * lift.value),
}))
function faceStyle(f: { rot: string }) {
  return {
    transform: `${f.rot} translateZ(calc(var(--die-size, 56px) / 2))`,
    background: props.faceBg,
    // A cube with no edge has no shape, so a theme asking for none still gets a faint one.
    borderColor: props.edgeColor === 'transparent' ? 'rgba(0,0,0,0.45)' : props.edgeColor,
  }
}

const ariaLabel = computed(() => {
  const state = props.held ? ', held' : props.selected ? ', selected' : ''
  return `Die showing ${props.face}${state}`
})
</script>

<style scoped>
.die-stage {
  position: relative;
  flex-shrink: 0;
  width: var(--die-size, 56px);
  height: var(--die-size, 56px);
  perspective: calc(var(--die-size, 56px) * 8);
  display: flex; align-items: center; justify-content: center;
}
.die-stage.selectable { cursor: pointer; }
/* 44px minimum touch target regardless of the visual size the board asks for. */
.die-stage.selectable::after {
  content: ''; position: absolute; inset: 50% auto auto 50%;
  transform: translate(-50%, -50%);
  min-width: 44px; min-height: 44px; width: 100%; height: 100%;
  z-index: 4;
}
.die-shadow {
  position: absolute; left: 50%; bottom: -9%;
  width: 78%; height: 11%;
  background: rgba(0,0,0,0.7);
  filter: blur(4px);
  transition: transform 0.42s ease, opacity 0.42s ease;
  pointer-events: none;
}
.die-cube {
  position: relative;
  width: 100%; height: 100%;
  transform-style: preserve-3d;
}
.die-face {
  position: absolute; inset: 0;
  box-sizing: border-box;
  border: 2px solid #101014;
  backface-visibility: hidden;
}
.glyph {
  font-size: calc(var(--die-size, 56px) * 0.46);
  font-weight: 900;
  font-family: var(--font-display, system-ui);
  line-height: 1;
  user-select: none;
}
.die-face { display: flex; align-items: center; justify-content: center; }
.pip {
  position: absolute;
  width: 17%; height: 17%;
  margin: -8.5% 0 0 -8.5%;
  border-radius: 50%;
}

/* Selection and hold are rings on the whole die, never a colour change to the face: the face
   is the theme's, and the games run several themes at once on a shared screen. The ring sits
   on the stage rather than the cube, or it would rotate away with the first tumble. */
.die-stage.selected { outline: 3px solid var(--gold); outline-offset: 5px; }
.die-stage.held { outline: 3px solid var(--green, #4caf50); outline-offset: 5px; }
</style>
