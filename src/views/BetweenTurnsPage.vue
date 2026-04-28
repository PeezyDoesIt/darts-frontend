<template>
  <div class="between" :style="betweenStyle">
    <div class="drip-bar" style="position:absolute;top:0;left:0;right:0" />

    <!-- Emoji watermark bottom-left -->
    <div v-if="nextPlayer.avatarUrl && !isPhoto(nextPlayer.avatarUrl)" class="between-emoji-bg" aria-hidden="true">
      {{ nextPlayer.avatarUrl }}
    </div>

    <div class="between-inner">
      <transition name="swap" mode="out-in">
        <!-- HURRY UP alert -->
        <div v-if="showAlert" key="alert" class="alert-wrap">
          <div v-if="isPhoto(nextPlayer.avatarUrl)" class="alert-avatar" :style="{ background: nextPlayer.color, boxShadow: `0 0 60px ${nextPlayer.color}` }">
            <img :src="nextPlayer.avatarUrl!" alt="" />
          </div>
          <div class="alert-name display" :style="{ color: nextPlayer.color, filter: `drop-shadow(0 0 24px ${nextPlayer.color})` }">
            {{ nextPlayer.name }}
          </div>
        </div>

        <!-- IT'S YOUR TURN announcement -->
        <div v-else key="announce" class="up-state">
          <div class="your-turn-label display">IT'S YOUR TURN</div>
          <div v-if="isPhoto(nextPlayer.avatarUrl)" class="next-avatar" :style="{ background: nextPlayer.color, boxShadow: `0 0 80px ${nextPlayer.color}80` }">
            <img :src="nextPlayer.avatarUrl!" alt="" />
          </div>
          <div class="next-name display" :style="{ color: nextPlayer.color, filter: `drop-shadow(0 0 20px ${nextPlayer.color})` }">
            {{ nextPlayer.name }}
          </div>
        </div>
      </transition>

      <!-- Timer ring — tap to pause/resume -->
      <div class="timer-wrap" @click="togglePause" :title="paused ? 'Resume' : 'Pause'">
        <svg class="timer-ring" viewBox="0 0 120 120">
          <circle cx="60" cy="60" r="52" fill="none" stroke="rgba(255,255,255,0.1)" stroke-width="6" />
          <circle cx="60" cy="60" r="52" fill="none"
            :stroke="showAlert ? '#ef4444' : nextPlayer.color" stroke-width="6" stroke-linecap="round"
            stroke-dasharray="326.7" :stroke-dashoffset="326.7 - (326.7 * progress)"
            transform="rotate(-90 60 60)" :style="{ transition: paused ? 'none' : 'stroke-dashoffset 1s linear, stroke 0.3s', filter: 'drop-shadow(0 0 8px currentColor)' }" />
        </svg>
        <span class="timer-count display" :style="showAlert ? { color: '#ef4444' } : {}">
          {{ paused ? '⏸' : timeLeft }}
        </span>
      </div>

      <button v-ripple class="btn-ready" :style="{ borderColor: nextPlayer.color, color: nextPlayer.color, boxShadow: `0 0 24px ${nextPlayer.color}40` }" @click="startTurn">
        I'M READY — START TURN
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, type CSSProperties } from 'vue'
import { useRouter } from 'vue-router'
import { useGameStore } from '../stores/game'
import { speak } from '../composables/useSpeech'

const router = useRouter()
const gameStore = useGameStore()
const game = computed(() => gameStore.game)
if (!game.value) router.push('/')
const nextPlayer = computed(() => game.value!.players[game.value!.currentPlayerIndex]!)

const betweenStyle = computed((): CSSProperties => {
  const bg = nextPlayer.value.playerBackground
  if (bg && (bg.startsWith('data:') || bg.startsWith('http'))) {
    return { backgroundImage: `url(${bg})`, backgroundSize: 'cover', backgroundPosition: 'center' }
  }
  if (bg) return { background: bg }
  return { background: `radial-gradient(ellipse at center, ${nextPlayer.value.color}50 0%, #0a0a0a 65%)` }
})

const prevPlayer = computed(() => {
  const players = game.value!.players
  const idx = (game.value!.currentPlayerIndex - 1 + players.length) % players.length
  return players[idx]!
})

const total = computed(() => game.value!.timerDuration)
const timeLeft = ref(total.value)
const showAlert = ref(false)
const paused = ref(false)
const progress = computed(() => timeLeft.value / total.value)
let interval: ReturnType<typeof setInterval> | null = null

function togglePause() { paused.value = !paused.value }

function playWhistle(): Promise<void> {
  return new Promise(resolve => {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext
    if (!AudioCtx) { resolve(); return }
    const ctx = new AudioCtx()
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.connect(gain)
    gain.connect(ctx.destination)
    osc.type = 'sine'
    osc.frequency.setValueAtTime(2800, ctx.currentTime)
    osc.frequency.linearRampToValueAtTime(3200, ctx.currentTime + 0.08)
    osc.frequency.linearRampToValueAtTime(2900, ctx.currentTime + 0.35)
    gain.gain.setValueAtTime(0, ctx.currentTime)
    gain.gain.linearRampToValueAtTime(0.35, ctx.currentTime + 0.04)
    gain.gain.setValueAtTime(0.35, ctx.currentTime + 0.3)
    gain.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.45)
    osc.start(ctx.currentTime)
    osc.stop(ctx.currentTime + 0.45)
    osc.onended = () => { ctx.close(); resolve() }
  })
}

async function handleTurnAnnouncement() {
  const nextLine = `${nextPlayer.value.name} — it's your turn.`
  if (gameStore.lastTurnWasTimeout) {
    const count = gameStore.playerTimeoutCounts[prevPlayer.value.id] ?? 0
    await speak(`${prevPlayer.value.name} missed their turn.`)
    if (count >= 3) {
      await speak(`This is why nobody wants to play darts with you, ${prevPlayer.value.name}.`)
    } else {
      await new Promise(r => setTimeout(r, 150))
      await playWhistle()
      await new Promise(r => setTimeout(r, 150))
      await playWhistle()
    }
    await new Promise(r => setTimeout(r, 300))
    speak(nextLine)
  } else if (gameStore.lastTurnWasZero) {
    await speak(`Be better, ${prevPlayer.value.name}.`)
    speak(nextLine)
  } else {
    speak(nextLine)
  }
}

onMounted(() => {
  handleTurnAnnouncement()

  interval = setInterval(() => {
    if (paused.value) return
    if (timeLeft.value <= 0) { clearInterval(interval!); startTurn(); return }
    timeLeft.value--
    if (timeLeft.value <= 30 && !showAlert.value) {
      showAlert.value = true
      speak(`${nextPlayer.value.name}. Hurry the fuck up. It's your turn. This is why nobody wants to play darts with you.`)
    }
  }, 1000)
})

onUnmounted(() => {
  if (interval) clearInterval(interval)
  window.speechSynthesis.cancel()
})

function startTurn() { gameStore.startNextTurn(); router.push('/game') }
function isPhoto(url: string | null): boolean { return !!(url?.startsWith('data:') || url?.startsWith('http')) }
</script>

<style scoped>
.between {
  width: 100vw; height: 100dvh; display: flex; align-items: center; justify-content: center;
  position: relative; overflow: hidden;
  padding-top: env(safe-area-inset-top);
  padding-bottom: env(safe-area-inset-bottom);
}
.between::before { content: ''; position: absolute; inset: 0; background: rgba(0,0,0,0.55); z-index: 0; }
.between-inner { display: flex; flex-direction: column; align-items: center; justify-content: space-evenly; width: 100%; height: 100%; padding: 32px 24px; position: relative; z-index: 2; }

.your-turn-label { font-size: 28px; letter-spacing: 0.35em; color: rgba(255,255,255,0.5); text-transform: uppercase; }
.next-avatar { width: 220px; height: 220px; border-radius: 8px; display: flex; align-items: center; justify-content: center; font-size: 120px; border: 3px solid rgba(255,255,255,0.2); overflow: hidden; }
.next-avatar img { width: 100%; height: 100%; object-fit: cover; }
.next-name { font-size: 96px; letter-spacing: 0.04em; line-height: 1; }

.alert-wrap { display: flex; flex-direction: column; align-items: center; gap: 14px; text-align: center; max-width: 700px; }
.alert-avatar { width: 140px; height: 140px; border-radius: 8px; display: flex; align-items: center; justify-content: center; font-size: 72px; border: 3px solid rgba(255,255,255,0.2); overflow: hidden; }
.alert-avatar img { width: 100%; height: 100%; object-fit: cover; }
.alert-name { font-size: 80px; letter-spacing: 0.04em; line-height: 1; }

.timer-wrap { position: relative; width: 320px; height: 320px; cursor: pointer; user-select: none; -webkit-tap-highlight-color: transparent; }
.timer-wrap:active { transform: scale(0.95); }
.timer-ring { width: 320px; height: 320px; }
.timer-count { position: absolute; inset: 0; display: flex; align-items: center; justify-content: center; font-size: 110px; color: #fff; transition: color 0.3s; }

.btn-ready {
  padding: 22px 0; font-size: 22px; font-weight: 900; border-radius: 6px; width: 100%; max-width: 480px;
  background: rgba(255,255,255,0.05); backdrop-filter: blur(12px); -webkit-backdrop-filter: blur(12px);
  border: 2px solid; cursor: pointer; transition: all 0.15s; letter-spacing: 0.1em;
  font-family: var(--font-display); position: relative; overflow: hidden;
}
.btn-ready:hover { background: rgba(255,255,255,0.1); }
.btn-ready:active { transform: scale(0.97); }

.swap-enter-active, .swap-leave-active { transition: opacity 0.35s, transform 0.35s; }
.swap-enter-from { opacity: 0; transform: scale(0.94); }
.swap-leave-to { opacity: 0; transform: scale(1.04); }

.between-emoji-bg {
  position: absolute; bottom: calc(24px + env(safe-area-inset-bottom)); left: 24px;
  font-size: 180px; line-height: 1; opacity: 0.15; pointer-events: none; user-select: none; z-index: 1;
}

@media (orientation: landscape) and (max-height: 900px) {
  .between-inner { flex-direction: row; flex-wrap: wrap; padding: 16px 32px; gap: 16px; align-content: center; justify-content: center; }
  .up-state { display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 8px; }
  .your-turn-label { font-size: 16px; }
  .next-name, .alert-name { font-size: 52px; }
  .next-avatar { width: 80px; height: 80px; font-size: 40px; }
  .alert-avatar { width: 80px; height: 80px; font-size: 40px; }
  .timer-wrap, .timer-ring { width: 180px; height: 180px; }
  .timer-count { font-size: 64px; }
  .btn-ready { font-size: 16px; padding: 14px 0; max-width: 360px; }
}

@media (max-width: 768px) {
  .between-inner { padding: 24px 20px; }
  .your-turn-label { font-size: 20px; }
  .next-name, .alert-name { font-size: 72px; }
  .timer-wrap, .timer-ring { width: 240px; height: 240px; }
  .timer-count { font-size: 84px; }
  .btn-ready { font-size: 18px; padding: 18px 0; }
}
</style>
