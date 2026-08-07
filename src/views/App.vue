<template>
  <div class="app-shell">
    <!-- Background glow blobs — make glass effect visible -->
    <div class="blob blob-pink" />
    <div class="blob blob-blue" />
    <div class="blob blob-purple" />
    <router-view :key="$route.path" />
  </div>
</template>

<script setup lang="ts">
import { onMounted } from 'vue'
import { useAuthStore } from './stores/auth'

const authStore = useAuthStore()

onMounted(() => {
  authStore.init()
})
</script>

<style>
/* Mobile browsers report 100vh as the viewport WITHOUT the URL bar, so a
   100vh shell with overflow:hidden pushes the bottom of every page — footers,
   Done / Submit / Next — under the browser chrome where it can't be tapped.
   dvh tracks the *visible* height (and shrinks when the keyboard opens);
   the vh line stays as the fallback for anything that predates dvh. */
.app-shell {
  position: relative;
  width: 100%;
  height: 100vh;
  height: 100dvh;
  overflow: hidden;
  background: #0a0a0a;
  /* stop iOS rubber-band dragging the fixed shell away from the viewport */
  overscroll-behavior: none;
  -webkit-text-size-adjust: 100%;
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

/* On a phone the blobs are wider than the screen; without this they add
   horizontal scroll and the layout drifts sideways under your thumb. */
@media (max-width: 700px) {
  .blob-pink { width: 340px; height: 340px; top: -120px; left: -80px; }
  .blob-blue { width: 300px; height: 300px; bottom: -110px; right: -80px; }
  .blob-purple { width: 260px; height: 260px; }
}

/* All direct children of app-shell need z-index to sit above blobs */
.app-shell > *:not(.blob) {
  position: relative;
  z-index: 1;
}
</style>
