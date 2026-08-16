<template>
  <div class="pav" :style="wrapStyle">
    <img v-if="isImage" :src="player.avatarUrl!" class="pav-img" alt="" />
    <span v-else class="pav-glyph" :style="{ fontSize: Math.round(size * 0.46) + 'px' }">{{ glyph }}</span>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { Player } from '../types/index'

const props = withDefaults(defineProps<{
  player: Player
  size?: number
  /** dark outline so overlapping avatars read as separate discs */
  stacked?: boolean
}>(), { size: 34, stacked: false })

const isImage = computed(() => {
  const a = props.player.avatarUrl
  return !!a && (a.startsWith('data:') || a.startsWith('http') || a.startsWith('/'))
})

const glyph = computed(() => {
  const a = props.player.avatarUrl
  if (a && !isImage.value) return a
  return props.player.name.trim().charAt(0).toUpperCase() || '?'
})

/** hex -> rgba, so a player's own colour drives the tint, ring and glow */
function rgba(hex: string, alpha: number) {
  const h = hex.replace('#', '')
  const full = h.length === 3 ? h.split('').map(c => c + c).join('') : h
  const n = parseInt(full, 16)
  if (Number.isNaN(n)) return `rgba(255,255,255,${alpha})`
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${alpha})`
}

const wrapStyle = computed(() => {
  const c = props.player.color || '#ff2d78'
  return {
    width: props.size + 'px',
    height: props.size + 'px',
    background: `linear-gradient(150deg, ${rgba(c, 0.5)}, ${rgba(c, 0.14)})`,
    border: `1px solid ${rgba(c, 0.62)}`,
    boxShadow: `inset 0 1px 0 rgba(255,255,255,0.3), 0 0 14px ${rgba(c, 0.45)}`,
    outline: props.stacked ? '2px solid rgba(10,10,12,0.92)' : 'none',
    outlineOffset: props.stacked ? '-1px' : '0',
  }
})
</script>

<style scoped>
.pav {
  position: relative;
  flex-shrink: 0;
  border-radius: 50%;
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
}
.pav-img { width: 100%; height: 100%; object-fit: cover; }
.pav-glyph { line-height: 1; font-weight: 800; color: #fff; }
</style>
