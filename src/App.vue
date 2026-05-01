<template>
  <div class="app-shell">
    <!-- Background glow blobs — make glass effect visible -->
    <div class="blob blob-pink" />
    <div class="blob blob-blue" />
    <div class="blob blob-purple" />
    <Transition :name="activeTransition" mode="out-in" @before-leave="onBeforeLeave" @after-enter="onAfterEnter">
      <router-view :key="$route.path" />
    </Transition>
    <EffectCanvas ref="effectCanvas" />
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import { useGameStore } from './stores/game'
import EffectCanvas from './components/EffectCanvas.vue'
import { registerEffectCanvas } from './composables/useEffectCanvas'

const gameStore = useGameStore()
const activeTransition = ref('fx-fade')
const effectCanvas = ref<InstanceType<typeof EffectCanvas> | null>(null)

watch(effectCanvas, c => registerEffectCanvas(c), { immediate: true })

function onBeforeLeave() {
  // Canvas effects are played before navigation in GamePage; only CSS transitions handled here
  const fx = gameStore.consumeTransition()
  activeTransition.value = fx
}
function onAfterEnter() {
  activeTransition.value = 'fx-fade'
}
</script>

<style>
.app-shell {
  position: relative;
  width: 100vw;
  height: 100vh;
  overflow: hidden;
  background: #0a0a0a;
}

.blob {
  position: absolute;
  border-radius: 50%;
  filter: blur(80px);
  pointer-events: none;
  z-index: 0;
}

.blob-pink {
  width: 600px;
  height: 600px;
  background: rgba(255, 45, 120, 0.18);
  top: -200px;
  left: -100px;
}

.blob-blue {
  width: 500px;
  height: 500px;
  background: rgba(0, 212, 255, 0.12);
  bottom: -150px;
  right: -100px;
}

.blob-purple {
  width: 400px;
  height: 400px;
  background: rgba(191, 95, 255, 0.1);
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
}

/* All direct children of app-shell need z-index to sit above blobs */
.app-shell > *:not(.blob) {
  position: relative;
  z-index: 1;
}

/* ── Transition effects ── */

/* Fade (default fallback) */
.fx-fade-leave-active { transition: opacity 0.3s; }
.fx-fade-leave-to { opacity: 0; }
.fx-fade-enter-active { transition: opacity 0.3s; }
.fx-fade-enter-from { opacity: 0; }

/* Slide Up */
.fx-slide-up-leave-active { transition: transform 0.35s ease-in, opacity 0.35s; }
.fx-slide-up-leave-to { transform: translateY(-100%); opacity: 0; }
.fx-slide-up-enter-active { transition: transform 0.35s ease-out, opacity 0.35s; }
.fx-slide-up-enter-from { transform: translateY(100%); opacity: 0; }

/* Slide Left */
.fx-slide-left-leave-active { transition: transform 0.35s ease-in, opacity 0.35s; }
.fx-slide-left-leave-to { transform: translateX(-100%); opacity: 0; }
.fx-slide-left-enter-active { transition: transform 0.35s ease-out, opacity 0.35s; }
.fx-slide-left-enter-from { transform: translateX(100%); opacity: 0; }

/* Zoom Out */
.fx-zoom-out-leave-active { transition: transform 0.35s ease-in, opacity 0.35s; }
.fx-zoom-out-leave-to { transform: scale(0.4); opacity: 0; }
.fx-zoom-out-enter-active { transition: transform 0.35s ease-out, opacity 0.35s; }
.fx-zoom-out-enter-from { transform: scale(1.4); opacity: 0; }

/* Flash */
@keyframes fx-flash-out {
  0%   { opacity: 1; filter: brightness(1); }
  40%  { opacity: 1; filter: brightness(8); }
  100% { opacity: 0; filter: brightness(8); }
}
.fx-flash-leave-active { animation: fx-flash-out 0.3s ease-out forwards; }
.fx-flash-enter-active { transition: opacity 0.3s; }
.fx-flash-enter-from { opacity: 0; }

/* Glitch */
@keyframes fx-glitch-out {
  0%   { transform: translate(0,0);    clip-path: inset(0 0 0 0);    filter: none; }
  15%  { transform: translate(-6px,3px);  clip-path: inset(10% 0 50% 0); filter: hue-rotate(60deg); }
  30%  { transform: translate(6px,-3px);  clip-path: inset(55% 0 10% 0); filter: hue-rotate(120deg); }
  50%  { transform: translate(-4px,6px);  clip-path: inset(30% 0 35% 0); filter: hue-rotate(180deg); }
  70%  { transform: translate(5px,-5px);  clip-path: inset(70% 0 5% 0);  filter: hue-rotate(240deg); }
  85%  { transform: translate(-8px,2px);  clip-path: inset(5% 0 80% 0);  filter: brightness(3); }
  100% { transform: translate(0,0);    clip-path: inset(0 0 100% 0); opacity: 0; }
}
.fx-glitch-leave-active { animation: fx-glitch-out 0.45s steps(1) forwards; }
.fx-glitch-enter-active { transition: opacity 0.25s; }
.fx-glitch-enter-from { opacity: 0; }

/* Spin */
.fx-spin-leave-active { transition: transform 0.4s ease-in, opacity 0.4s; }
.fx-spin-leave-to { transform: rotate(270deg) scale(0); opacity: 0; }
.fx-spin-enter-active { transition: transform 0.4s ease-out, opacity 0.4s; }
.fx-spin-enter-from { transform: rotate(-90deg) scale(0); opacity: 0; }

/* Flip */
.fx-flip-leave-active { transition: transform 0.3s ease-in; perspective: 1200px; }
.fx-flip-leave-to { transform: rotateY(90deg) scale(0.8); }
.fx-flip-enter-active { transition: transform 0.3s ease-out; perspective: 1200px; }
.fx-flip-enter-from { transform: rotateY(-90deg) scale(0.8); }

/* Wipe */
.fx-wipe-leave-active { transition: clip-path 0.4s ease-in; }
.fx-wipe-leave-to { clip-path: inset(0 100% 0 0); }
.fx-wipe-enter-active { transition: clip-path 0.4s ease-out; }
.fx-wipe-enter-from { clip-path: inset(0 0 0 100%); }
</style>
