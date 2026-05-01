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

</style>
