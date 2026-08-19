<template>
  <div class="bgplace-block">
    <div
      class="bgplace"
      :class="{ dragging, fitted: isFitted }"
      @pointerdown="startDrag"
    >
      <div v-if="showsBlurFill" class="bgplace-blur" :style="{ backgroundImage: `url(${image})` }" />
      <div class="bgplace-photo" :style="photoStyle" />

      <!-- The furniture of the screen being framed, so "clear of the score" means something. -->
      <div class="bgplace-ui">
        <template v-if="chrome === 'throw'">
          <span class="bgplace-name">{{ displayName }}</span>
          <span class="bgplace-score">301</span>
          <span class="bgplace-darts"><i /><i /><i class="empty" /></span>
        </template>
        <template v-else>
          <span class="bgplace-up">UP NEXT</span>
          <span class="bgplace-bigname">{{ displayName }}</span>
          <span class="bgplace-count">12</span>
        </template>
      </div>

      <div class="bgplace-grid" :class="{ show: dragging }"><i /><i /><b /><b /></div>
      <span v-if="!placed && !isFitted" class="bgplace-hint">DRAG TO PLACE</span>
    </div>

    <div v-if="!isFitted" class="bgzoom-row">
      <span class="bgzoom-label">Zoom</span>
      <button v-ripple class="bgzoom-btn" :disabled="zoomValue <= 100" @click="bump(-10)">–</button>
      <div class="bgzoom-bar"><i :style="{ width: zoomPct }" /></div>
      <button v-ripple class="bgzoom-btn" :disabled="zoomValue >= 210" @click="bump(10)">+</button>
    </div>

    <div class="bgplace-foot">
      <p class="field-hint">{{ readout }}</p>
      <button v-if="placed || zoomValue > 100" v-ripple class="btn btn-outline btn-sm" @click="reset">
        Reset placement
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch, type CSSProperties } from 'vue'

/**
 * Drag a photo to choose what stays on screen once it is cropped.
 *
 * This replaced Centre / Top / Bottom. Three stops rarely landed on the part of a photo
 * anyone meant, and the thumbnail beside them was always centre-cropped, so the buttons
 * changed nothing you could see. Here the preview IS the screen — the same shape, with the
 * same furniture in the same corners — and the photo moves under it.
 *
 * It is a component rather than three copies because the player screen frames three separate
 * photos: the default, the throw screen's own, and the walk-up's. `chrome` is what differs —
 * a throw screen is a score and three darts, a walk-up is a name and a countdown — and
 * framing a face "clear of the score" only means anything if the score is where it will be.
 *
 * Placement is reported as a CSS background-position pair, or null when the photo has never
 * been moved. Null is every screen's own default, so a player who never opens this is left
 * exactly as they were and nothing needs backfilling.
 */
const props = withDefaults(defineProps<{
  /** The photo being framed. The block renders nothing useful without one. */
  image: string
  /** Player name, for the mock plate — so you are framing against your own screen. */
  name?: string
  /** Which screen's furniture to draw. */
  chrome?: 'throw' | 'walkup'
  /** Crop or fit. A fitted photo shows whole, so there is nothing to drag and no zoom. */
  size?: 'cover' | 'contain' | null
  /** Only meaningful when fitted: what sits behind the parts the photo does not cover. */
  fill?: 'black' | 'blur' | null
  position: string | null
  zoom: number | null
}>(), {
  name: '', chrome: 'throw', size: null, fill: null,
})

const emit = defineEmits<{
  (e: 'update:position', v: string | null): void
  (e: 'update:zoom', v: number | null): void
}>()

const ZOOM_MIN = 100
const ZOOM_MAX = 210

/*
 * The dragged spot is held as two numbers rather than a CSS string so the drag can do
 * arithmetic on it; it becomes a pair only on the way out. `placed` is what keeps an
 * untouched photo reporting null rather than "50% 50%" — the two render identically, but one
 * of them is a choice the player made and the other is not, and only the first should
 * survive a later change to what the default means.
 */
const focusX = ref(50)
const focusY = ref(50)
const zoomValue = ref(100)
const placed = ref(false)
const dragging = ref(false)

const isFitted = computed(() => props.size === 'contain')
const showsBlurFill = computed(() => isFitted.value && props.fill === 'blur')
const zoomPct = computed(() => `${((zoomValue.value - ZOOM_MIN) / (ZOOM_MAX - ZOOM_MIN)) * 100}%`)
const displayName = computed(() => props.name.trim().toUpperCase() || 'PLAYER')

const photoStyle = computed((): CSSProperties => ({
  backgroundImage: `url(${props.image})`,
  backgroundSize: isFitted.value ? 'contain' : 'cover',
  backgroundPosition: `${Math.round(focusX.value)}% ${Math.round(focusY.value)}%`,
  transform: isFitted.value || zoomValue.value === 100 ? undefined : `scale(${zoomValue.value / 100})`,
}))

const readout = computed(() => {
  if (isFitted.value) {
    return props.fill === 'blur' ? 'Whole photo, blurred edges.' : 'Whole photo, black edges.'
  }
  const spot = `across ${Math.round(focusX.value)}% · down ${Math.round(focusY.value)}%`
  return zoomValue.value === 100 ? `Keeping ${spot}.` : `Keeping ${spot}, zoomed ${zoomValue.value}%.`
})

/**
 * Reads whatever is stored back into the drag.
 *
 * A percentage pair is this component's own format. 'top' / 'center' / 'bottom' are what
 * players saved before it existed and still mean exactly what they meant, so they load as the
 * same framing rather than being discarded — which is why the column needed no backfill.
 */
function load(stored: string | null, zoom: number | null) {
  zoomValue.value = Math.max(ZOOM_MIN, Math.min(ZOOM_MAX, zoom ?? 100))
  const pair = stored?.match(/^(\d+(?:\.\d+)?)%\s+(\d+(?:\.\d+)?)%$/)
  if (pair) {
    focusX.value = Number(pair[1]); focusY.value = Number(pair[2]); placed.value = true
    return
  }
  const stops: Record<string, [number, number]> = { top: [50, 0], center: [50, 50], bottom: [50, 100] }
  const stop = stored ? stops[stored] : undefined
  focusX.value = stop?.[0] ?? 50
  focusY.value = stop?.[1] ?? 50
  placed.value = !!stop && stored !== 'center'
}
load(props.position, props.zoom)

/*
 * Only re-read when the incoming values are not the ones just emitted. Without the guard the
 * parent echoing a change straight back would reset `placed` mid-drag, and the hint would
 * flash back on under the finger.
 */
watch(() => [props.position, props.zoom] as const, ([p, z]) => {
  if (p === emittedPosition && z === emittedZoom) return
  load(p, z)
})

let emittedPosition: string | null = props.position
let emittedZoom: number | null = props.zoom

function publish() {
  emittedPosition = placed.value ? `${Math.round(focusX.value)}% ${Math.round(focusY.value)}%` : null
  emittedZoom = zoomValue.value === 100 || isFitted.value ? null : zoomValue.value
  emit('update:position', emittedPosition)
  emit('update:zoom', emittedZoom)
}

/*
 * Dragging moves the photo the way a finger expects: push left and the photo goes left, which
 * means the kept spot moves right. 130 rather than 100 because a percentage of the box is not
 * a percentage of the photo — only the overhang travels, so a straight 1:1 mapping feels
 * stuck. Move and release are listened for on the window so the drag survives a finger
 * sliding off the preview, which on an iPad it constantly does.
 */
function startDrag(e: PointerEvent) {
  if (isFitted.value) return
  const box = (e.currentTarget as HTMLElement).getBoundingClientRect()
  const startX = e.clientX, startY = e.clientY
  const fromX = focusX.value, fromY = focusY.value
  const clamp = (v: number) => Math.max(0, Math.min(100, v))
  dragging.value = true
  placed.value = true
  const move = (ev: PointerEvent) => {
    focusX.value = clamp(fromX - ((ev.clientX - startX) / box.width) * 130)
    focusY.value = clamp(fromY - ((ev.clientY - startY) / box.height) * 130)
    publish()
  }
  const up = () => {
    window.removeEventListener('pointermove', move)
    window.removeEventListener('pointerup', up)
    window.removeEventListener('pointercancel', up)
    dragging.value = false
    publish()
  }
  window.addEventListener('pointermove', move)
  window.addEventListener('pointerup', up)
  window.addEventListener('pointercancel', up)
}

function bump(step: number) {
  zoomValue.value = Math.max(ZOOM_MIN, Math.min(ZOOM_MAX, zoomValue.value + step))
  publish()
}
function reset() {
  focusX.value = 50; focusY.value = 50; zoomValue.value = 100; placed.value = false
  publish()
}

/* Fitting a photo whole makes zoom meaningless, so it is dropped rather than left stored and
   silently ignored — a saved value nothing reads is the fault the three stops had. */
watch(isFitted, (fitted) => { if (fitted && zoomValue.value !== 100) { zoomValue.value = 100; publish() } })
</script>

<style scoped>
/*
 * The preview holds the real 1194 x 834 shape, so what is framed here is what is framed
 * there, and its furniture is sized in container units so the mock stays in proportion at
 * any column width.
 */
.bgplace {
  position: relative; width: 100%; aspect-ratio: 1194 / 834;
  container-type: size;
  overflow: hidden;
  border: 2px solid rgba(255,255,255,0.18);
  background: #000; cursor: grab; touch-action: none;
  -webkit-tap-highlight-color: transparent;
}
.bgplace.dragging { cursor: grabbing; border-color: var(--pink); }
.bgplace.fitted { cursor: default; }
.bgplace-photo, .bgplace-blur { position: absolute; inset: 0; background-repeat: no-repeat; }
.bgplace-blur { background-size: cover; background-position: center; filter: blur(24px); transform: scale(1.12); }

.bgplace-ui { position: absolute; inset: 0; pointer-events: none; }

/* Throw screen: taped name, score, three darts. */
.bgplace-name {
  position: absolute; left: 3cqw; top: 3cqw;
  font-family: var(--font-display); font-size: 5cqw; letter-spacing: 0.08em;
  color: #101014; background: #f6f4ee; padding: 0.6cqw 2cqw;
  transform: rotate(-1.4deg); box-shadow: 0.8cqw 0.8cqw 0 rgba(0,0,0,0.6);
}
.bgplace-score {
  position: absolute; right: 3.5cqw; top: 8cqw;
  font-family: var(--font-display); font-size: 22cqw; line-height: 0.85;
  color: #fff; text-shadow: 1cqw 1cqw 0 rgba(0,0,0,0.8);
}
.bgplace-darts { position: absolute; left: 3cqw; bottom: 3cqw; display: flex; gap: 1.6cqw; }
.bgplace-darts i {
  width: 11cqw; height: 11cqw; border: 0.5cqw solid #f6f4ee; background: #101014;
  box-shadow: 0.7cqw 0.7cqw 0 rgba(0,0,0,0.6);
}
.bgplace-darts i.empty { background: rgba(16,16,20,0.45); border-style: dashed; box-shadow: none; }

/* Walk-up: the name is the screen, so the mock is centred and large. */
.bgplace-up {
  position: absolute; left: 50%; top: 9cqw; transform: translateX(-50%) rotate(-1deg);
  font-family: var(--font-display); font-size: 3.4cqw; letter-spacing: 0.18em;
  color: #38000f; background: var(--pink); padding: 0.6cqw 2cqw;
  box-shadow: 0.6cqw 0.6cqw 0 rgba(0,0,0,0.6);
}
.bgplace-bigname {
  position: absolute; left: 50%; top: 50%; transform: translate(-50%, -50%);
  font-family: var(--font-display); font-size: 11cqw; line-height: 1; white-space: nowrap;
  color: #fff; text-shadow: 0.8cqw 0.8cqw 0 rgba(0,0,0,0.85);
}
.bgplace-count {
  position: absolute; left: 50%; bottom: 6cqw; transform: translateX(-50%);
  font-family: var(--font-display); font-size: 9cqw; line-height: 1;
  color: rgba(255,255,255,0.85); text-shadow: 0.6cqw 0.6cqw 0 rgba(0,0,0,0.8);
}

/* Thirds, shown only while dragging: enough to line a face up, gone once the finger lifts. */
.bgplace-grid { position: absolute; inset: 0; pointer-events: none; opacity: 0; transition: opacity 0.15s; }
.bgplace-grid.show { opacity: 1; }
.bgplace-grid i, .bgplace-grid b { position: absolute; background: rgba(255,255,255,0.3); }
.bgplace-grid i { top: 0; bottom: 0; width: 1px; }
.bgplace-grid i:first-child { left: 33.33%; }
.bgplace-grid i:nth-child(2) { left: 66.66%; }
.bgplace-grid b { left: 0; right: 0; height: 1px; }
.bgplace-grid b:nth-child(3) { top: 33.33%; }
.bgplace-grid b:nth-child(4) { top: 66.66%; }

.bgplace-hint {
  position: absolute; left: 50%; bottom: 3cqw; transform: translateX(-50%) rotate(-0.8deg);
  padding: 1cqw 2.6cqw; background: var(--pink); color: #38000f;
  font-family: var(--font-display); font-size: 4cqw; letter-spacing: 0.1em;
  box-shadow: 0.7cqw 0.7cqw 0 rgba(0,0,0,0.6); pointer-events: none;
}

.bgzoom-row { display: flex; align-items: center; gap: 10px; margin-top: 10px; }
.bgzoom-label { font-size: 15px; color: var(--text-muted); width: 52px; }
.bgzoom-btn {
  width: 48px; height: 48px; flex-shrink: 0;
  border: 2px solid #ffffff; background: transparent; color: #fff;
  font-size: 24px; line-height: 1; cursor: pointer; position: relative; overflow: hidden;
  -webkit-tap-highlight-color: transparent;
}
.bgzoom-btn:disabled { opacity: 0.3; cursor: default; }
.bgzoom-bar { flex: 1; height: 8px; background: rgba(255,255,255,0.12); overflow: hidden; }
.bgzoom-bar i { display: block; height: 100%; background: var(--pink); }

.bgplace-foot { display: flex; align-items: center; justify-content: space-between; gap: 12px; margin-top: 10px; }
.field-hint { margin: 0; font-size: 14px; color: var(--text-muted); }

/* Hover belongs to a mouse: on the iPad these are touched, and a stuck hover reads as active. */
@media (hover: hover) and (pointer: fine) {
  .bgzoom-btn:hover:not(:disabled) { border-color: var(--pink); color: var(--pink); }
}
</style>
