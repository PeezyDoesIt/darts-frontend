<template>
  <div class="between" :style="betweenStyle">
    <div class="drip-bar" style="position:absolute;top:0;left:0;right:0" />

    <!-- Avatar watermark bottom-right -->
    <div class="between-avatar-bg" aria-hidden="true">
      <img v-if="isPhoto(nextPlayer.avatarUrl)" :src="nextPlayer.avatarUrl!" alt="" />
      <span v-else-if="nextPlayer.avatarUrl">{{ nextPlayer.avatarUrl }}</span>
    </div>

    <!-- Cricket layout: name, timer, button stacked top-aligned -->
    <div v-if="isCricket" class="between-inner cricket-layout">
      <div class="cricket-player-name display"
        :style="{ color: showAlert ? '#ef4444' : '#ffffff', filter: showAlert ? `drop-shadow(0 0 24px #ef4444)` : 'drop-shadow(0 0 24px rgba(255,255,255,0.4))' }">
        {{ nextPlayer.name }}
      </div>

      <div class="timer-wrap timer-center" @click="togglePause" :title="paused ? 'Resume' : 'Pause'">
        <svg class="timer-ring" viewBox="0 0 120 120">
          <circle cx="60" cy="60" r="52" fill="none" stroke="rgba(255,255,255,0.15)" stroke-width="6" />
          <circle cx="60" cy="60" r="52" fill="none"
            :stroke="showAlert ? '#ef4444' : '#ffffff'" stroke-width="6" stroke-linecap="round"
            stroke-dasharray="326.7" :stroke-dashoffset="326.7 - (326.7 * progress)"
            transform="rotate(-90 60 60)" :style="{ transition: paused ? 'none' : 'stroke-dashoffset 1s linear, stroke 0.3s', filter: 'drop-shadow(0 0 10px currentColor)' }" />
        </svg>
        <span class="timer-count display" :style="showAlert ? { color: '#ef4444' } : { color: '#ffffff' }">
          {{ paused ? '⏸' : timeLeft }}
        </span>
      </div>

      <button v-ripple class="btn-ready" :style="{ borderColor: nextPlayer.color, color: '#fff', boxShadow: `0 0 24px ${nextPlayer.color}40` }" @click="startTurn">
        START TURN
      </button>
    </div>

    <!-- Default layout (non-cricket) -->
    <div v-else class="between-inner">
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

      <button v-ripple class="btn-ready" :style="{ borderColor: nextPlayer.color, color: '#fff', boxShadow: `0 0 24px ${nextPlayer.color}40` }" @click="startTurn">
        START TURN
      </button>
    </div>

    <!-- Timer ring — absolutely positioned top-left (non-cricket only) -->
    <div v-if="!isCricket" class="timer-wrap" @click="togglePause" :title="paused ? 'Resume' : 'Pause'">
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
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, type CSSProperties } from 'vue'
import { useRouter } from 'vue-router'
import { useGameStore } from '../stores/game'
import { useSettingsStore } from '../stores/settings'
import { speak } from '../composables/useSpeech'
import { playShotgun, playBuzzer } from '../composables/useSounds'

const router = useRouter()
const gameStore = useGameStore()
const settingsStore = useSettingsStore()
const game = computed(() => gameStore.game)
if (!game.value) router.push('/')
const nextPlayer = computed(() => game.value!.players[game.value!.currentPlayerIndex]!)
const isCricket = computed(() => game.value?.gameType === 'cricket' || game.value?.gameType === 'cutThroat')

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
  if (settingsStore.quietNarrator) {
    speak(nextLine)
    return
  }
  if (gameStore.lastTurnHadBull) {
    await playShotgun()
    await new Promise(r => setTimeout(r, 200))
  }
  if (gameStore.lastTurnWasTimeout) {
    const count = gameStore.playerTimeoutCounts[prevPlayer.value.id] ?? 0
    await playBuzzer()
    await new Promise(r => setTimeout(r, 200))
    await speak(`${prevPlayer.value.name} missed their turn.`)
    await speak(`Be better.`)
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
    const zeroPhrases = [
      `Be better, ${prevPlayer.value.name}.`,
      `You suck, ${prevPlayer.value.name}.`,
      `This is going to be a long one, ${prevPlayer.value.name}.`,
    ]
    await speak(zeroPhrases[Math.floor(Math.random() * zeroPhrases.length)]!)
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
      const hurryCount = gameStore.playerHurryUpCounts[nextPlayer.value.id] ?? 0
      gameStore.recordHurryUp(nextPlayer.value.id)
      const line = hurryCount > 0
        ? `${nextPlayer.value.name}. Hurry the fuck up. It's your turn. This is why nobody wants to play darts with you.`
        : `${nextPlayer.value.name}. Hurry the fuck up. It's your turn.`
      speak(line)
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

/* Cricket layout */
.cricket-layout {
  justify-content: center;
  gap: 36px;
  padding-top: calc(48px + env(safe-area-inset-top));
  padding-bottom: calc(48px + env(safe-area-inset-bottom));
}
.cricket-player-name {
  font-size: clamp(72px, 14dvh, 130px);
  letter-spacing: 0.04em;
  line-height: 1;
  text-align: center;
  transition: color 0.3s;
}
.timer-center {
  position: relative !important;
  top: auto !important; left: auto !important;
  width: 220px; height: 220px;
}
.timer-center .timer-ring { width: 220px; height: 220px; }
.timer-center .timer-count { font-size: 88px; }

/* Default (non-cricket) absolute timer */
.timer-wrap {
  position: absolute;
  top: calc(28px + env(safe-area-inset-top));
  left: 28px;
  width: 148px; height: 148px;
  cursor: pointer; user-select: none; -webkit-tap-highlight-color: transparent;
  z-index: 3;
}
.timer-wrap:active { transform: scale(0.93); }
.timer-ring { width: 148px; height: 148px; }
.timer-count { position: absolute; inset: 0; display: flex; align-items: center; justify-content: center; font-size: 58px; color: #fff; transition: color 0.3s; }

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

.between-avatar-bg {
  position: absolute; bottom: calc(0px + env(safe-area-inset-bottom)); right: 0;
  width: 36vmin; height: 36vmin;
  pointer-events: none; user-select: none; z-index: 1;
  display: flex; align-items: flex-end; justify-content: flex-end;
}
.between-avatar-bg img {
  width: 100%; height: 100%; object-fit: cover; object-position: center top;
  opacity: 0.55; border-radius: 12px 0 0 0;
}
.between-avatar-bg span {
  font-size: 36vmin; line-height: 1; opacity: 0.35;
  filter: drop-shadow(0 0 32px rgba(0,0,0,0.5));
}

@media (orientation: landscape) and (max-height: 900px) {
  .between-inner { flex-direction: row; flex-wrap: wrap; padding: 16px 32px; gap: 16px; align-content: center; justify-content: center; }
  .up-state { display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 8px; }
  .your-turn-label { font-size: 16px; }
  .next-name, .alert-name { font-size: 52px; }
  .next-avatar { width: 80px; height: 80px; font-size: 40px; }
  .alert-avatar { width: 80px; height: 80px; font-size: 40px; }
  .timer-wrap { top: calc(16px + env(safe-area-inset-top)); left: 16px; width: 110px; height: 110px; }
  .timer-ring { width: 110px; height: 110px; }
  .timer-count { font-size: 42px; }
  .btn-ready { font-size: 16px; padding: 14px 0; max-width: 360px; }
  .cricket-layout { flex-direction: column; gap: 20px; padding: 16px 32px; align-items: center; justify-content: flex-start; padding-top: calc(28px + env(safe-area-inset-top)); }
  .cricket-layout .timer-center { width: 130px; height: 130px; }
  .cricket-layout .timer-center .timer-ring { width: 130px; height: 130px; }
  .cricket-layout .timer-center .timer-count { font-size: 52px; }
  .cricket-player-name { font-size: 52px; }
}

@media (max-width: 768px) {
  .between-inner { padding: 24px 20px; }
  .your-turn-label { font-size: 20px; }
  .next-name, .alert-name { font-size: 72px; }
  .timer-wrap { top: calc(20px + env(safe-area-inset-top)); left: 20px; width: 124px; height: 124px; }
  .timer-ring { width: 124px; height: 124px; }
  .timer-count { font-size: 48px; }
  .btn-ready { font-size: 18px; padding: 18px 0; }
  .cricket-layout { gap: 28px; }
  .cricket-layout .timer-center { width: 180px; height: 180px; }
  .cricket-layout .timer-center .timer-ring { width: 180px; height: 180px; }
  .cricket-layout .timer-center .timer-count { font-size: 72px; }
  .cricket-player-name { font-size: clamp(60px, 11dvh, 100px); }
}

@media (orientation: portrait) {
  .cricket-layout {
    justify-content: center;
    padding-top: calc(48px + env(safe-area-inset-top));
  }
}
</style>
