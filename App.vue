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
   the vh line stays as the fallback for anything that predates dvh.

   100vw is width INCLUDING the scrollbar gutter, which overflows the body by
   the scrollbar width and lets the whole layout drift sideways. */
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
  /* The notch and the home-indicator bar are handled once here rather than in every
     screen — eleven screens had no allowance for them at all, so their top row sat
     under the notch and their bottom row under the swipe bar. Screens that already
     add their own insets still work: this only reserves the area, it does not
     double up on anything measured from inside. */
  padding-top: env(safe-area-inset-top, 0px);
  padding-bottom: env(safe-area-inset-bottom, 0px);
  padding-left: env(safe-area-inset-left, 0px);
  padding-right: env(safe-area-inset-right, 0px);
  box-sizing: border-box;
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
@media (max-width: 767px) {
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
