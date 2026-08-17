<template>
  <div
    class="die-stage"
    :class="{ selectable, selected, held }"
    :style="stageStyle"
    role="img"
    :aria-label="ariaLabel"
  >
    <span class="die-shadow" :style="shadowStyle" />
    <div class="die-cube" :class="{ tumbling: rolling }" :style="cubeStyle">
      <!--
        An inked inner cube, slightly smaller than the outer one. The pillow corners leave a
        gap at every corner of the die; without something solid behind them you see straight
        through the cube and it reads as broken rather than as a bevelled casino die.
      -->
      <div v-for="f in FACES" :key="`core-${f.v}`" class="die-core" :style="coreStyle(f)" />
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
            :style="pipStyle(p)"
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
 *
 * The shape is casino: pillow corners at ~24% of the face over an inked inner cube, and pips
 * raised off the face as beads rather than printed flat or drilled in as holes.
 */
const props = withDefaults(defineProps<{
  face: number
  /** Omit to size the die from CSS instead — set --die-size on any ancestor. */
  size?: number
  selectable?: boolean
  selected?: boolean
  /** Claimed/locked die — styled distinctly from a live selection. */
  held?: boolean
  /**
   * Keep tumbling. A cube that turns until it is told to stop is the honest version of "the
   * dice are still going": while this is true the die spins on both axes and shows no settled
   * value, and the moment it goes false it lands on `face` with the usual throw — which is what
   * lets a caller decide the value AT the stop rather than before the spin. A caller that never
   * sets it gets the single throw per value change, which is what the other games use.
   */
  rolling?: boolean
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
  /**
   * Bump on every roll. Farkle, Pig, SCC and LRC throw without ever setting `rolling`, so
   * `face` is all they change — and a die that re-rolls the number it was already showing
   * would sit still while the others tumble. Games that drive `rolling` do not need this.
   */
  roll?: number
}>(), {
  selectable: false, selected: false, held: false, rolling: false,
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

function land(v: number) {
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
}

// While a die is rolling its value is meaningless, so a value change is ignored until it stops
// — otherwise the cube would try to land mid-spin every time the numbers were re-rolled.
watch(() => [props.face, props.roll] as const, () => { if (!props.rolling) land(props.face) })
watch(() => props.rolling, (isRolling) => { if (!isRolling) land(props.face) })
onBeforeUnmount(() => clearTimeout(dropTimer))

/*
 * Everything geometric is expressed against --die-size rather than a number, so a caller can
 * size the die from CSS — Yahtzee changes its dice at five breakpoints and cannot pass a
 * number down. Passing `size` just sets the same variable inline.
 */
const stageStyle = computed(() => (
  props.size == null ? {} : { '--die-size': `${props.size}px` }
))
const cubeStyle = computed(() => {
  // A spinning cube is driven by the keyframes below, so no inline transform is set — an
  // inline one would win and the die would sit still.
  if (props.rolling) return {}
  return {
    transform: `translateY(calc(var(--die-size, 56px) * -0.44 * ${lift.value})) `
      + `rotateX(${rx.value}deg) rotateY(${ry.value}deg)`,
    transition: tween.value,
  }
})
const shadowStyle = computed(() => {
  const up = props.rolling ? 0.65 : lift.value
  return {
    transform: `translateX(-50%) scale(${1 - 0.4 * up})`,
    opacity: String(1 - 0.55 * up),
  }
})
function faceStyle(f: { rot: string }) {
  return {
    transform: `${f.rot} translateZ(calc(var(--die-size, 56px) / 2))`,
    background: props.faceBg,
    // A cube with no edge has no shape, so a theme asking for none still gets a faint one.
    borderColor: props.edgeColor === 'transparent' ? 'rgba(0,0,0,0.45)' : props.edgeColor,
  }
}
/** Same six rotations, pulled in far enough to fill the corners the pillow radius opens up. */
function coreStyle(f: { rot: string }) {
  return {
    transform: `${f.rot} translateZ(calc(var(--die-size, 56px) / 2 - var(--die-inset)))`,
    background: props.edgeColor === 'transparent' ? '#101014' : props.edgeColor,
  }
}

/**
 * Is the stock dark? The bead shading is drawn for light stock — a white top highlight and a
 * dark underside. On a near-black face that highlight is the brightest thing on the die and
 * the beads go muddy, so dark themes get the opposite: a dark rim and a much fainter top.
 * Read off the first hex in the background, which covers both flat colours and the gradients.
 */
const faceIsDark = computed(() => {
  const hex = /#([0-9a-f]{6}|[0-9a-f]{3})/i.exec(props.faceBg ?? '')?.[1]
  if (!hex) return false
  const full = hex.length === 3 ? hex.split('').map(ch => ch + ch).join('') : hex
  const r = parseInt(full.slice(0, 2), 16)
  const g = parseInt(full.slice(2, 4), 16)
  const b = parseInt(full.slice(4, 6), 16)
  return (0.299 * r + 0.587 * g + 0.114 * b) < 120
})

/*
 * A pip as a bead sitting on the face, not ink printed into it and not a drilled hole: a
 * sphere lit from the top left, its own small drop shadow underneath, and a rim that reads as
 * the bead meeting the stock.
 */
function pipStyle(p: [number, number]) {
  const lit = `color-mix(in srgb, ${props.pipColor} 68%, #ffffff)`
  return {
    left: `${p[0]}%`,
    top: `${p[1]}%`,
    background: `radial-gradient(circle at 33% 27%, ${lit}, ${props.pipColor} 62%)`,
    boxShadow: faceIsDark.value
      ? '0 0 0 1px rgba(0,0,0,0.55), 0 2px 3px rgba(0,0,0,0.6),'
        + ' inset 0 -2px 3px rgba(0,0,0,0.55), inset 0 2px 2px rgba(255,255,255,0.10)'
      : '0 2px 3px rgba(0,0,0,0.5),'
        + ' inset 0 -2px 3px rgba(0,0,0,0.5), inset 0 2px 2px rgba(255,255,255,0.22)',
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
  /* How far the inner cube is pulled in behind the pillow corners. */
  --die-inset: calc(var(--die-size, 56px) * 0.032);
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
/* Both axes, and not a whole number of turns per cycle, so it never looks like it is repeating. */
.die-cube.tumbling { animation: die-tumble 0.72s linear infinite; }
@keyframes die-tumble {
  from { transform: translateY(calc(var(--die-size, 56px) * -0.16)) rotateX(0deg) rotateY(0deg); }
  to   { transform: translateY(calc(var(--die-size, 56px) * -0.16)) rotateX(360deg) rotateY(720deg); }
}
.die-core {
  position: absolute;
  inset: var(--die-inset);
  backface-visibility: hidden;
}
.die-face {
  position: absolute; inset: 0;
  box-sizing: border-box;
  border: 2px solid #101014;
  /* Casino pillow corner. Squaring it would be wrong here: a die is a physical object, and the
     Street treatment squares panels, not dice. */
  border-radius: 24%;
  box-shadow: inset 0 0 16px rgba(150,138,110,0.22);
  backface-visibility: hidden;
  display: flex; align-items: center; justify-content: center;
}
.glyph {
  position: relative;
  z-index: 1;
  font-size: calc(var(--die-size, 56px) * 0.46);
  font-weight: 900;
  font-family: var(--font-display, system-ui);
  line-height: 1;
  user-select: none;
}
.pip {
  position: absolute;
  z-index: 1;
  width: 19%; height: 19%;
  margin: -9.5% 0 0 -9.5%;
  border-radius: 50%;
}

/* Selection and hold are rings on the whole die, never a colour change to the face: the face
   is the theme's, and the games run several themes at once on a shared screen. The ring sits
   on the stage rather than the cube, or it would rotate away with the first tumble. */
.die-stage.selected { outline: 3px solid var(--gold); outline-offset: 5px; }
.die-stage.held { outline: 3px solid var(--green, #4caf50); outline-offset: 5px; }
</style>
