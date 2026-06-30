<template>
  <div class="between" :style="betweenStyle">
    <div class="drip-bar" style="position:absolute;top:0;left:0;right:0" />

    <!-- Avatar watermark: bottom-left for cricket, bottom-right otherwise -->
    <div class="between-avatar-bg" :class="{ 'avatar-left': isCricket }" aria-hidden="true">
      <img v-if="isPhoto(nextPlayer.avatarUrl)" :src="nextPlayer.avatarUrl!" alt="" />
      <span v-else-if="nextPlayer.avatarUrl">{{ nextPlayer.avatarUrl }}</span>
    </div>

    <!-- Cricket layout: name + timer only (button is the circle below) -->
    <div v-if="isCricket" class="between-inner cricket-layout">
      <div class="cricket-player-name display"
        :style="{ color: showAlert ? '#ef4444' : '#ffffff', filter: showAlert ? `drop-shadow(0 0 24px #ef4444)` : 'drop-shadow(0 0 24px rgba(255,255,255,0.4))' }">
        {{ nextPlayer.name }}
      </div>
      <div class="name-bar" :style="{ background: showAlert ? '#ef4444' : nextPlayer.color, boxShadow: `0 0 18px ${showAlert ? '#ef4444' : nextPlayer.color}` }" />

      <div v-if="!timerOff" class="timer-wrap timer-center" @click="togglePause" :title="settingsStore.disableTimerPause ? 'Pause locked' : paused ? 'Resume' : 'Pause'">
        <svg class="timer-ring" viewBox="0 0 120 120">
          <circle cx="60" cy="60" r="52" fill="none" stroke="rgba(255,255,255,0.15)" stroke-width="6" />
          <circle cx="60" cy="60" r="52" fill="none"
            :stroke="showAlert ? '#ef4444' : '#ffffff'" stroke-width="6" stroke-linecap="round"
            stroke-dasharray="326.7" :stroke-dashoffset="326.7 - (326.7 * progress)"
            transform="rotate(-90 60 60)" :style="{ transition: paused ? 'none' : 'stroke-dashoffset 1s linear, stroke 0.3s', filter: 'drop-shadow(0 0 10px currentColor)' }" />
        </svg>
        <span class="timer-count display" :style="showAlert ? { color: '#ef4444' } : { color: '#ffffff' }">
          {{ !settingsStore.disableTimerPause && paused ? 'II' : timeLeft }}
        </span>
      </div>
    </div>

    <!-- Cricket circle START TURN button — bottom-right -->
    <button v-if="isCricket" v-ripple class="btn-cricket-start"
      :style="{ borderColor: nextPlayer.color, boxShadow: `0 0 28px ${nextPlayer.color}60` }"
      @click="startTurn">
      START<br>TURN
    </button>

    <!-- Default layout (non-cricket): name → circle with count inside → button -->
    <div v-else class="between-inner default-layout">
      <div class="default-content">

        <div class="default-name display"
          :style="{ color: showAlert ? '#ef4444' : nextPlayer.color, filter: `drop-shadow(0 0 ${showAlert ? 28 : 20}px ${showAlert ? '#ef4444' : nextPlayer.color})` }">
          {{ nextPlayer.name }}
        </div>
        <div class="name-bar" :style="{ background: showAlert ? '#ef4444' : nextPlayer.color, boxShadow: `0 0 18px ${showAlert ? '#ef4444' : nextPlayer.color}` }" />

        <!-- Timer circle with countdown centered inside -->
        <div v-if="!timerOff" class="timer-bg" @click="togglePause" :title="settingsStore.disableTimerPause ? 'Pause locked' : paused ? 'Resume' : 'Pause'">
          <svg class="timer-bg-svg" viewBox="0 0 120 120">
            <circle cx="60" cy="60" r="54" fill="rgba(0,0,0,0.52)" stroke="rgba(255,255,255,0.07)" stroke-width="1.5" />
            <circle cx="60" cy="60" r="54" fill="none"
              :stroke="showAlert ? '#ef4444' : nextPlayer.color" stroke-width="4.5" stroke-linecap="round"
              stroke-dasharray="339.3" :stroke-dashoffset="339.3 - (339.3 * progress)"
              transform="rotate(-90 60 60)" :style="{ transition: paused ? 'none' : 'stroke-dashoffset 1s linear, stroke 0.3s', filter: 'drop-shadow(0 0 10px currentColor)' }" />
          </svg>
          <span class="timer-bg-count display" :style="showAlert ? { color: '#ef4444', filter: 'drop-shadow(0 0 16px #ef4444)' } : { color: '#ffffff', filter: `drop-shadow(0 0 16px ${nextPlayer.color})` }">
            {{ !settingsStore.disableTimerPause && paused ? 'II' : timeLeft }}
          </span>
        </div>

        <button v-ripple class="btn-ready" :style="{ borderColor: nextPlayer.color, color: '#fff', boxShadow: `0 0 24px ${nextPlayer.color}40` }" @click="startTurn">
          START TURN
        </button>

      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, type CSSProperties } from 'vue'
import { useRouter } from 'vue-router'
import { useGameStore } from '../stores/game'
import { useSettingsStore } from '../stores/settings'
import { speak, cancelPendingSpeak } from '../composables/useSpeech'
import { playShotgun, playThemedBuzzer, playThemedTick, playThemedChime, unlockAudio } from '../composables/useSounds'

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
const timerOff = computed(() => total.value === 0 || settingsStore.disableWalkUpTimer)
const timeLeft = ref(total.value)
const showAlert = ref(false)
const paused = ref(false)
const progress = computed(() => timerOff.value ? 0 : timeLeft.value / total.value)
let interval: ReturnType<typeof setInterval> | null = null

function togglePause() { if (!settingsStore.disableTimerPause) paused.value = !paused.value }

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
  if (settingsStore.cleanMode) {
    speak(nextPlayer.value.name)
    return
  }
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
    await playThemedBuzzer(settingsStore.soundTheme)
    await new Promise(r => setTimeout(r, 200))
    await speak(`Missed their turn.`)
    await speak(`Be better.`)
    if (count >= 3) {
      await speak(`This is why nobody wants to play darts with you.`)
    } else {
      await new Promise(r => setTimeout(r, 150))
      await playWhistle()
      await new Promise(r => setTimeout(r, 150))
      await playWhistle()
    }
    await new Promise(r => setTimeout(r, 300))
    speak(nextLine)
  } else if (gameStore.lastTurnWasZero) {
    const zeroPhrases = [`Be better.`, `You suck.`, `This is gonna be a long one.`]
    await speak(zeroPhrases[Math.floor(Math.random() * zeroPhrases.length)]!)
    speak(nextLine)
  } else {
    speak(nextLine)
  }
}

onMounted(() => {
  handleTurnAnnouncement()

  if (timerOff.value) return  // no timer — wait for manual tap

  interval = setInterval(() => {
    if (paused.value) return
    if (timeLeft.value <= 0) { clearInterval(interval!); playThemedBuzzer(settingsStore.soundTheme); startTurn(); return }
    timeLeft.value--
    if (timeLeft.value > 0 && timeLeft.value <= 5) playThemedTick(settingsStore.soundTheme)
    if (timeLeft.value <= 30 && !showAlert.value) {
      showAlert.value = true
      if (!settingsStore.cleanMode) {
        const hurryCount = gameStore.playerHurryUpCounts[nextPlayer.value.id] ?? 0
        gameStore.recordHurryUp(nextPlayer.value.id)
        const line = hurryCount > 0
          ? `${nextPlayer.value.name}. Hurry the fuck up. It's your turn. This is why nobody wants to play darts with you.`
          : `${nextPlayer.value.name}. Hurry the fuck up. It's your turn.`
        speak(line)
      }
    }
  }, 1000)
})

onUnmounted(() => {
  if (interval) clearInterval(interval)
  cancelPendingSpeak()
})

function startTurn() { unlockAudio(); playThemedChime(settingsStore.soundTheme); gameStore.startNextTurn(); router.push('/game') }
function isPhoto(url: string | null): boolean { return !!(url?.startsWith('data:') || url?.startsWith('http')) }
</script>

<style scoped>
.between {
  width: 100vw; height: 100dvh; display: flex; align-items: center; justify-content: center;
  position: relative; overflow: hidden;
  padding-top: env(safe-area-inset-top, 0px);
  padding-bottom: env(safe-area-inset-bottom, 0px);
}
.between::before { content: ''; position: absolute; inset: 0; background: rgba(0,0,0,0.55); z-index: 0; }
.between-inner { display: flex; flex-direction: column; align-items: center; justify-content: space-evenly; width: 100%; height: 100%; padding: 32px 24px; position: relative; z-index: 2; }

/* Default layout — stacked column: name → circle → button */
.default-layout {
  justify-content: center;
  align-items: center;
  padding: clamp(24px, 4dvh, 48px) 24px;
}

.default-content {
  display: flex; flex-direction: column; align-items: center;
  gap: clamp(12px, 3vmin, 36px);
  width: 100%; max-width: 560px;
}

.default-name {
  font-size: clamp(64px, 12vmin, 140px);
  letter-spacing: 0.04em; line-height: 1;
  text-align: center; transition: color 0.3s;
}

.name-bar {
  width: clamp(120px, 60%, 400px);
  height: 12px;
  border-radius: 6px;
  transition: background 0.3s, box-shadow 0.3s;
}

.timer-bg {
  position: relative;
  width: clamp(200px, 52vmin, 440px); height: clamp(200px, 52vmin, 440px);
  flex-shrink: 0;
  cursor: pointer; user-select: none; -webkit-tap-highlight-color: transparent;
}
.timer-bg:active { transform: scale(0.995); }

.timer-bg-svg {
  position: absolute; inset: 0; width: 100%; height: 100%;
}

.timer-bg-count {
  position: absolute; inset: 0;
  display: flex; align-items: center; justify-content: center;
  font-size: clamp(72px, 15vmin, 180px);
  line-height: 1; transition: color 0.3s;
}

/* Cricket layout */
.cricket-layout {
  justify-content: center;
  gap: clamp(8px, 2dvh, 24px);
  padding-top: calc(24px + env(safe-area-inset-top));
  padding-bottom: calc(100px + env(safe-area-inset-bottom));
}
.cricket-player-name {
  font-size: clamp(120px, 24dvh, 280px);
  letter-spacing: 0.04em;
  line-height: 1;
  text-align: center;
  transition: color 0.3s;
}
.timer-center {
  position: relative;
  width: clamp(220px, 30dvh, 340px); height: clamp(220px, 30dvh, 340px);
}
.timer-center .timer-ring { position: absolute; inset: 0; width: 100%; height: 100%; }
.timer-count {
  position: absolute; inset: 0;
  display: flex; align-items: center; justify-content: center;
  color: #fff; transition: color 0.3s;
}
.timer-center .timer-count { font-size: clamp(88px, 12dvh, 140px); }


.btn-ready {
  padding: clamp(12px, 1.8dvh, 22px) 0; font-size: clamp(26px, 3.8dvh, 42px); font-weight: 900; border-radius: 8px; width: 100%; max-width: 480px;
  background: rgba(255,255,255,0.05); backdrop-filter: blur(12px); -webkit-backdrop-filter: blur(12px);
  border: 2px solid; cursor: pointer; transition: all 0.15s; letter-spacing: 0.14em;
  font-family: var(--font-display); position: relative; overflow: hidden;
}
.btn-ready:hover { background: rgba(255,255,255,0.1); }
.btn-ready:active { transform: scale(0.97); }

.swap-enter-active, .swap-leave-active { transition: opacity 0.35s, transform 0.35s; }
.swap-enter-from { opacity: 0; transform: scale(0.94); }
.swap-leave-to { opacity: 0; transform: scale(1.04); }

.between-avatar-bg {
  position: absolute; bottom: calc(0px + env(safe-area-inset-bottom)); right: 0;
  width: 31vmin; height: 31vmin;
  pointer-events: none; user-select: none; z-index: 3;
  display: flex; align-items: flex-end; justify-content: flex-end;
}
.between-avatar-bg.avatar-left {
  right: auto; left: 0;
  justify-content: flex-start;
}
.between-avatar-bg img {
  width: 100%; height: 100%; object-fit: cover; object-position: center top;
  opacity: 0.55; border-radius: 12px 0 0 0;
}
.between-avatar-bg.avatar-left img { border-radius: 0 12px 0 0; }
.between-avatar-bg span {
  font-size: 31vmin; line-height: 1; opacity: 0.75;
  filter: drop-shadow(0 0 32px rgba(0,0,0,0.5));
}

/* Cricket circle START TURN button — fixed bottom-right */
.btn-cricket-start {
  position: absolute;
  bottom: calc(24px + env(safe-area-inset-bottom));
  right: 24px;
  width: 27vmin;
  height: 27vmin;
  border-radius: 50%;
  background: rgba(255,255,255,0.06);
  backdrop-filter: blur(12px); -webkit-backdrop-filter: blur(12px);
  border: 2px solid;
  color: #fff;
  font-family: var(--font-display);
  font-size: clamp(26px, 4.5dvh, 48px);
  font-weight: 900;
  letter-spacing: 0.08em;
  line-height: 1.3;
  cursor: pointer;
  transition: all 0.15s;
  z-index: 4;
  position: absolute;
  -webkit-tap-highlight-color: transparent;
  overflow: hidden;
}
.btn-cricket-start:hover { background: rgba(255,255,255,0.12); }
.btn-cricket-start:active { transform: scale(0.95); }

/* Phone landscape only (max-width: 767px excludes tablets) */
@media (orientation: landscape) and (max-height: 900px) and (max-width: 767px) {
  .timer-bg { width: clamp(120px, 44vmin, 220px); height: clamp(120px, 44vmin, 220px); }
  .timer-bg-count { font-size: clamp(44px, 11vmin, 88px); }
  .default-name { font-size: clamp(32px, 8vmin, 72px); }
  .default-content { gap: clamp(8px, 2vmin, 18px); padding: 0 16px; }
  .btn-ready { font-size: clamp(18px, 4vmin, 28px); padding: 8px 0; max-width: 300px; }
  .cricket-layout { flex-direction: column; gap: 16px; padding: 16px 32px; align-items: center; justify-content: center; padding-top: calc(20px + env(safe-area-inset-top)); }
  .cricket-layout .timer-center { width: 140px; height: 140px; }
  .cricket-layout .timer-center .timer-ring { width: 140px; height: 140px; }
  .cricket-layout .timer-center .timer-count { font-size: 56px; }
  .cricket-player-name { font-size: 72px; }
}

/* Phone portrait and small screens */
@media (max-width: 767px) {
  .between-inner { padding: 24px 20px; }
  .timer-bg { width: clamp(180px, 58vmin, 320px); height: clamp(180px, 58vmin, 320px); }
  .timer-bg-count { font-size: clamp(60px, 14vmin, 120px); }
  .default-name { font-size: clamp(56px, 12vmin, 110px); }
  .btn-ready { font-size: clamp(22px, 5vmin, 32px); padding: 10px 0; max-width: 380px; }
  .cricket-layout { gap: clamp(4px, 1.5dvh, 16px); }
  .cricket-layout .timer-center { width: clamp(180px, 26dvh, 260px); height: clamp(180px, 26dvh, 260px); }
  .cricket-layout .timer-center .timer-ring { width: clamp(180px, 26dvh, 260px); height: clamp(180px, 26dvh, 260px); }
  .cricket-layout .timer-center .timer-count { font-size: clamp(72px, 10dvh, 110px); }
  .cricket-player-name { font-size: clamp(100px, 17dvh, 180px); }
}

/* iPad and tablets (both portrait and landscape) — centered, symmetrical spacing */
@media (min-width: 768px) {
  .cricket-layout {
    justify-content: center;
    gap: clamp(8px, 2dvh, 24px);
    padding: calc(48px + env(safe-area-inset-top)) 64px calc(120px + env(safe-area-inset-bottom));
  }
  .cricket-player-name { font-size: clamp(100px, 14dvh, 200px); }
  .timer-center { width: clamp(180px, 22dvh, 270px); height: clamp(180px, 22dvh, 270px); }
  .timer-center .timer-ring { width: clamp(180px, 22dvh, 270px); height: clamp(180px, 22dvh, 270px); }
  .timer-center .timer-count { font-size: clamp(72px, 9dvh, 112px); }
  .btn-cricket-start { font-size: clamp(26px, 4.5dvh, 48px); }
}
</style>
