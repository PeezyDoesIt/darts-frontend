<template>
  <div class="between" :style="betweenStyle">
    <div class="drip-bar" style="position:absolute;top:0;left:0;right:0" />

    <!-- Avatar watermark: always bottom-left, so it does not move between game types. -->
    <div class="between-avatar-bg" aria-hidden="true">
      <img v-if="isPhoto(nextPlayer.avatarUrl)" :src="nextPlayer.avatarUrl!" alt="" />
      <span v-else-if="nextPlayer.avatarUrl">{{ nextPlayer.avatarUrl }}</span>
    </div>

    <!-- Cricket layout: name + timer circle + start button -->
    <div v-if="isCricket" class="between-inner cricket-layout">
      <div class="name-highlight-wrap">
        <div class="cricket-player-name display"
          :style="{ color: showAlert ? '#ef4444' : nextPlayer.color, textShadow: showAlert ? '0 0 32px #ef4444, -4px -4px 0 #000, 4px -4px 0 #000, -4px 4px 0 #000, 4px 4px 0 #000' : `-4px -4px 0 #000, 4px -4px 0 #000, -4px 4px 0 #000, 4px 4px 0 #000, 0 0 40px ${nextPlayer.color}` }">
          {{ nextPlayer.name }}
        </div>
      </div>

      <div v-if="game?.bonusTurnActive" class="bonus-badge display">BONUS THROW</div>

      <svg v-if="!timerOff" class="circle-timer-svg" :class="{ 'timer-alert': showAlert }" viewBox="0 0 160 160" @click="togglePause" :title="settingsStore.disableTimerPause ? 'Pause locked' : paused ? 'Resume' : 'Pause'">
        <circle cx="80" cy="80" r="68" class="circle-track" />
        <circle cx="80" cy="80" r="68" class="circle-progress"
          :class="{ urgent: showAlert, paused: paused }"
          :stroke="showAlert ? '#ef4444' : nextPlayer.color"
          :stroke-dasharray="427"
          :stroke-dashoffset="427 * (1 - progress)"
          :style="{ transition: paused ? 'none' : 'stroke-dashoffset 1s linear' }"
        />
        <text x="80" y="80" class="circle-timer-text" text-anchor="middle" dominant-baseline="middle">
          {{ showPauseLocked ? '🔒' : (!settingsStore.disableTimerPause && paused ? '⏸' : timeLeft) }}
        </text>
      </svg>
    </div>

    <!-- Cricket START button — bottom-right -->
    <button v-if="isCricket" v-ripple class="btn-cricket-start" @click="startTurn">
      START
    </button>


    <!-- Default layout (non-cricket): name → circle with count inside → button -->
    <div v-else class="between-inner default-layout">
      <div class="default-content">

        <div class="name-highlight-wrap">
          <div class="default-name display"
            :style="{ color: showAlert ? '#ef4444' : nextPlayer.color, textShadow: showAlert ? '0 0 32px #ef4444, -4px -4px 0 #000, 4px -4px 0 #000, -4px 4px 0 #000, 4px 4px 0 #000' : `-4px -4px 0 #000, 4px -4px 0 #000, -4px 4px 0 #000, 4px 4px 0 #000, 0 0 40px ${nextPlayer.color}` }">
            {{ nextPlayer.name }}
          </div>
        </div>

        <!-- Circular countdown timer -->
        <svg v-if="!timerOff" class="circle-timer-svg" :class="{ 'timer-alert': showAlert }" viewBox="0 0 160 160" @click="togglePause" :title="settingsStore.disableTimerPause ? 'Pause locked' : paused ? 'Resume' : 'Pause'">
          <circle cx="80" cy="80" r="68" class="circle-track" />
          <circle cx="80" cy="80" r="68" class="circle-progress"
            :class="{ urgent: showAlert, paused: paused }"
            :stroke="showAlert ? '#ef4444' : nextPlayer.color"
            :stroke-dasharray="427"
            :stroke-dashoffset="427 * (1 - progress)"
            :style="{ transition: paused ? 'none' : 'stroke-dashoffset 1s linear' }"
          />
          <text x="80" y="80" class="circle-timer-text" text-anchor="middle" dominant-baseline="middle">
            {{ showPauseLocked ? '🔒' : (!settingsStore.disableTimerPause && paused ? '⏸' : timeLeft) }}
          </text>
        </svg>

        <button v-ripple class="btn-ready" @click="startTurn">
          START
        </button>

      </div>
    </div>

    <!--
      A hold set on the board stays set here, and this screen is where the walk-up countdown
      would otherwise run the next player's time away. Resume is offered here too, so nobody
      has to start a turn just to reach the control that stops the clock.

      Placed after both layouts rather than between them: the default layout is chained by
      v-else to the cricket START button above it, and anything inserted in between breaks
      that pair.
    -->
    <Transition name="fade">
      <div v-if="isHeld" class="hold-overlay">
        <div class="hold-panel">
          <div class="hold-icon">⏸</div>
          <div class="hold-title display">ON HOLD</div>
          <p class="hold-sub">Every timer is stopped. Nobody loses their turn.</p>
          <button v-ripple class="btn btn-spray btn-xl hold-resume" @click="gameStore.setHeld(false)">Resume</button>
        </div>
      </div>
    </Transition>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, type CSSProperties } from 'vue'
import { useRouter } from 'vue-router'
import { isPhoto } from '../lib/playerDisplay'
import { isCricketGame } from '../types/index'
import { useGameStore } from '../stores/game'
import { useSettingsStore } from '../stores/settings'
import { cancelPendingSpeak } from '../composables/useSpeech'
import { useNarrator } from '../composables/useNarrator'
import type { LineContext, NarratorEvent } from '../lib/narrator'
import { playShotgun, playThemedBuzzer, playThemedTick, playThemedChime, unlockAudio } from '../composables/useSounds'

const router = useRouter()
const gameStore = useGameStore()
const settingsStore = useSettingsStore()
const { narrate: speakEvent } = useNarrator()
const game = computed(() => gameStore.game)
if (!game.value) router.push('/')
const nextPlayer = computed(() => game.value!.players[game.value!.currentPlayerIndex]!)
/*
 * Speed Cricket belongs here too.
 *
 * It is grouped with cricket at every other decision in the app — the board's marks column,
 * the wild-number row, the setup screen's cricket sections — but this screen's own copy of
 * the list was written without it, so its walk-up quietly used the 01 games' layout instead.
 * That is why the membership lives in one predicate now rather than at each decision.
 */
const isCricket = computed(() => isCricketGame(game.value?.gameType))
/** The whole game is stopped, not just this screen's countdown. */
const isHeld = computed(() => game.value?.heldSince != null)

const betweenStyle = computed((): CSSProperties => {
  // The walk-up pick wins, then the player's default. No game theme here: this screen is
  // about whose turn it is, and the game's own backdrop belongs to the board they walk up to.
  const bg = nextPlayer.value.walkupBackground ?? nextPlayer.value.playerBackground
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

/*
 * Tapping the circle while pausing is locked used to do nothing, silently. The countdown
 * says so for a moment instead — this screen is where a stalling player reaches for the
 * timer, so it is where the lock has to explain itself.
 */
const showPauseLocked = ref(false)
let pauseLockedTimeout: ReturnType<typeof setTimeout> | null = null
function togglePause() {
  if (settingsStore.disableTimerPause) {
    showPauseLocked.value = true
    if (pauseLockedTimeout) clearTimeout(pauseLockedTimeout)
    pauseLockedTimeout = setTimeout(() => { showPauseLocked.value = false }, 1400)
    return
  }
  paused.value = !paused.value
}

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

/**
 * Speak one narrator event: one alternative per utterance, in order.
 *
 * The view no longer knows what any personality sounds like, nor which events count as
 * commentary. That knowledge lived at each call site before, which is why GamePage never
 * consulted quietNarrator and clean mode had a hole for savage.
 */
function narrate(event: NarratorEvent, extra: Partial<LineContext> = {}) {
  return speakEvent(event, {
    name: nextPlayer.value.name,
    prevName: prevPlayer.value.name,
    ...extra,
  })
}

async function handleTurnAnnouncement() {
  const p = settingsStore.narratorPersonality

  if (game.value?.bonusTurnActive) { await narrate('bonusTurn'); return }

  if (gameStore.lastTurnWasZero) {
    await narrate('zeroRoast')
    await narrate('walkUp')
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
    await narrate('timeout', { count })

    // The default voice gets whistles instead of the third-offence roast. Skipped in quiet
    // mode along with the lines they punctuate, since a jeer is commentary too.
    const jeering = !settingsStore.quietNarrator && !settingsStore.cleanMode
    if (jeering && p === 'default' && count < 3) {
      await new Promise(r => setTimeout(r, 150))
      await playWhistle()
      await new Promise(r => setTimeout(r, 150))
      await playWhistle()
    }
    await new Promise(r => setTimeout(r, 300))
  }

  await narrate('walkUp')
}

onMounted(() => {
  handleTurnAnnouncement()

  if (timerOff.value) return  // no timer — wait for manual tap

  interval = setInterval(() => {
    if (paused.value || isHeld.value) return
    if (timeLeft.value <= 0) { clearInterval(interval!); playThemedBuzzer(settingsStore.soundTheme); startTurn(); return }
    timeLeft.value--
    if (timeLeft.value > 0 && timeLeft.value <= 3) playThemedTick(settingsStore.soundTheme)
    if (timeLeft.value === 20 && settingsStore.announceWalkupAt20) {
      void narrate('twentySecondWalkUp')
    }
    if (timeLeft.value <= 30 && !showAlert.value) {
      showAlert.value = true
      playThemedChime(settingsStore.soundTheme)
      const hurryCount = gameStore.playerHurryUpCounts[nextPlayer.value.id] ?? 0
      gameStore.recordHurryUp(nextPlayer.value.id)
      setTimeout(() => { void narrate('hurryUp', { count: hurryCount }) }, 500)
    }
  }, 1000)
})

onUnmounted(() => {
  if (interval) clearInterval(interval)
  if (pauseLockedTimeout) { clearTimeout(pauseLockedTimeout); pauseLockedTimeout = null }
  cancelPendingSpeak()
})

function startTurn() { unlockAudio(); gameStore.startNextTurn(); router.push('/game') }
</script>

<style scoped>
.between {
  width: 100vw; height: 100dvh; display: flex; align-items: center; justify-content: center;
  position: relative; overflow: clip;
  padding-top: env(safe-area-inset-top, 0px);
  padding-bottom: env(safe-area-inset-bottom, 0px);
}
.between::before { content: ''; position: absolute; inset: 0; background: rgba(0,0,0,0.20); z-index: 0; }
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
  font-size: clamp(100px, 20vmin, 225px);
  letter-spacing: 0.04em; line-height: 1;
  text-align: center; transition: color 0.3s;
  -webkit-text-stroke: 8px #000;
  paint-order: stroke fill;
}


.bonus-badge {
  font-size: clamp(28px, 5dvh, 52px);
  letter-spacing: 0.12em;
  color: #fbbf24;
  filter: drop-shadow(0 0 16px #fbbf24);
  text-align: center;
  animation: bonus-pulse 0.7s ease-in-out infinite alternate;
}
@keyframes bonus-pulse {
  from { opacity: 0.8; transform: scale(0.97); }
  to   { opacity: 1;   transform: scale(1.03); }
}

/* Circular SVG timer */
.circle-timer-svg {
  width: clamp(140px, 28vmin, 220px);
  height: clamp(140px, 28vmin, 220px);
  cursor: pointer; user-select: none; -webkit-tap-highlight-color: transparent;
  flex-shrink: 0; overflow: visible;
  filter: drop-shadow(0 0 8px rgba(0,0,0,0.6));
  transition: filter 0.3s;
}
.circle-timer-svg.timer-alert {
  animation: circle-alert-pulse 0.75s ease-in-out infinite alternate;
}
@keyframes circle-alert-pulse {
  from { filter: drop-shadow(0 0 8px rgba(239,68,68,0.3)); }
  to   { filter: drop-shadow(0 0 20px rgba(239,68,68,0.7)); }
}
.circle-track {
  fill: rgba(255,255,255,0.06);
  stroke: rgba(255,255,255,0.12);
  stroke-width: 10;
}
.circle-progress {
  fill: none;
  stroke-width: 10;
  stroke-linecap: round;
  transform: rotate(-90deg);
  transform-origin: 50% 50%;
  transition: stroke 0.3s;
}
.circle-progress.urgent { animation: progress-flash 0.75s ease-in-out infinite alternate; }
@keyframes progress-flash {
  from { opacity: 0.75; }
  to   { opacity: 1; }
}
.circle-progress.paused { opacity: 0.4; animation: none; }
.circle-timer-text {
  font-family: var(--font-display);
  font-size: 52px;
  font-weight: 900;
  fill: #ffffff;
  letter-spacing: 0.02em;
}


/* Transparent wrapper — outline is handled by text-stroke on the name itself */
.name-highlight-wrap {
  display: inline-flex;
  justify-content: center;
}

/* Cricket layout */
.cricket-layout {
  justify-content: center;
  gap: clamp(8px, 2dvh, 24px);
  padding-top: calc(24px + env(safe-area-inset-top));
  padding-bottom: calc(100px + env(safe-area-inset-bottom));
  width: 100%; max-width: 760px; align-self: center;
}
.cricket-player-name {
  font-size: clamp(120px, 28dvh, 340px);
  letter-spacing: 0.04em;
  line-height: 1;
  text-align: center;
  transition: color 0.3s, text-shadow 0.3s;
  -webkit-text-stroke: 8px #000;
  paint-order: stroke fill;
}


.btn-ready {
  padding: clamp(15px, 2.25dvh, 28px) 0; font-size: clamp(33px, 4.75dvh, 53px); font-weight: 900; border-radius: 999px; width: 100%; max-width: 600px;
  background: #dc2626; border: none; color: #fff;
  cursor: pointer; transition: all 0.15s; letter-spacing: 0.14em;
  font-family: var(--font-display); position: relative; overflow: hidden;
  box-shadow: 0 4px 24px rgba(220,38,38,0.45);
  flex-shrink: 0;
}
.btn-ready:hover { background: #ef4444; }
.btn-ready:active { transform: scale(0.97); }

.fade-enter-active, .fade-leave-active { transition: opacity 0.2s; }
.fade-enter-from, .fade-leave-to { opacity: 0; }

/* Same panel as the board's, so a hold looks like one thing across both screens. */
.hold-overlay {
  position: absolute; inset: 0; z-index: 20;
  display: flex; align-items: center; justify-content: center;
  padding: 24px;
  background: rgba(0,0,0,0.88);
  backdrop-filter: blur(10px); -webkit-backdrop-filter: blur(10px);
}
.hold-panel {
  display: flex; flex-direction: column; align-items: center; gap: 14px;
  text-align: center; max-width: 420px; width: 100%;
}
.hold-icon { font-size: clamp(48px, 12vmin, 88px); line-height: 1; }
.hold-title {
  font-size: clamp(40px, 11vmin, 84px); letter-spacing: 0.12em; line-height: 1;
  color: var(--gold, #f59e0b);
  text-shadow: 0 0 28px rgba(245,158,11,0.45);
}
.hold-sub { margin: 0; font-size: clamp(13px, 3.4vmin, 17px); color: rgba(255,255,255,0.65); line-height: 1.5; }
.hold-resume { width: 100%; max-width: 320px; margin-top: 8px; }

.swap-enter-active, .swap-leave-active { transition: opacity 0.35s, transform 0.35s; }
.swap-enter-from { opacity: 0; transform: scale(0.94); }
.swap-leave-to { opacity: 0; transform: scale(1.04); }

/*
 * Bottom-left on every game type.
 *
 * It used to sit bottom-right and flip to the left only for some game types, dodging the
 * floating START button that those two render in that corner. Nothing else on this screen is
 * anchored bottom-left and both layouts centre their content, so the left corner is free
 * whatever the game is — and a watermark that changes sides between games reads as a bug.
 */
.between-avatar-bg {
  position: absolute; bottom: calc(14px + env(safe-area-inset-bottom)); left: 0;
  pointer-events: none; user-select: none; z-index: 3;
  display: flex; align-items: flex-end; justify-content: flex-start;
}
.between-avatar-bg img {
  height: clamp(140px, 35vmin, 420px);
  width: auto;
  max-width: clamp(140px, 35vmin, 420px);
  object-fit: contain;
  /* Square against the screen edge it sits on, rounded on the side facing the content. */
  opacity: 0.55; border-radius: 0 12px 12px 0;
}
.between-avatar-bg span {
  font-size: clamp(140px, 35vmin, 420px); line-height: 1; opacity: 0.75;
  filter: drop-shadow(0 0 32px rgba(0,0,0,0.5));
}

/* Cricket START button — fixed bottom-right, solid red bubble */
.btn-cricket-start {
  position: absolute;
  bottom: calc(24px + env(safe-area-inset-bottom));
  right: 24px;
  width: clamp(125px, 25vmin, 225px);
  height: clamp(125px, 25vmin, 225px);
  border-radius: 50%;
  background: #dc2626;
  border: none;
  color: #fff;
  font-family: var(--font-display);
  font-size: clamp(30px, 5dvh, 55px);
  font-weight: 900;
  letter-spacing: 0.1em;
  line-height: 1;
  cursor: pointer;
  transition: all 0.15s;
  z-index: 4;
  -webkit-tap-highlight-color: transparent;
  overflow: hidden;
  box-shadow: 0 4px 32px rgba(220,38,38,0.55);
}
.btn-cricket-start:hover { background: #ef4444; }
.btn-cricket-start:active { transform: scale(0.93); }

/* Phone landscape only (max-width: 767px excludes tablets) */
@media (orientation: landscape) and (max-height: 900px) and (max-width: 767px) {
  .default-name { font-size: clamp(45px, 11vmin, 100px); }
  .default-content { gap: clamp(8px, 2vmin, 18px); padding: 0 16px; }
  .btn-ready { font-size: clamp(22px, 5vmin, 35px); padding: 10px 0; max-width: 375px; }
  .walkup-timer-bar { height: clamp(40px, 7dvh, 60px); }
  .walkup-timer-text { font-size: clamp(36px, 6dvh, 60px); }
  .cricket-layout { flex-direction: column; gap: 12px; padding: 12px 32px; align-items: center; justify-content: center; padding-top: calc(16px + env(safe-area-inset-top)); padding-bottom: calc(80px + env(safe-area-inset-bottom)); }
  .cricket-player-name { font-size: clamp(80px, 17dvh, 150px); }
  .btn-cricket-start { width: clamp(95px, 19vmin, 150px); height: clamp(95px, 19vmin, 150px); font-size: clamp(22px, 4dvh, 35px); bottom: calc(12px + env(safe-area-inset-bottom)); right: 16px; }
}

/* Phone portrait and small screens */
@media (max-width: 767px) {
  .between-inner { padding: 24px 20px; }
  .default-name { font-size: clamp(75px, 16vmin, 150px); }
  .btn-ready { font-size: clamp(28px, 6vmin, 40px); padding: 12px 0; max-width: 475px; }
  .cricket-layout { gap: clamp(4px, 1.5dvh, 16px); }
  .cricket-player-name { font-size: clamp(138px, 25dvh, 275px); }
}

/* iPad and tablets (both portrait and landscape) — centered, symmetrical spacing */
@media (min-width: 768px) {
  .cricket-layout {
    justify-content: center;
    gap: clamp(8px, 2dvh, 24px);
    padding: calc(48px + env(safe-area-inset-top)) 64px calc(120px + env(safe-area-inset-bottom));
  }
  .cricket-player-name { font-size: clamp(150px, 21dvh, 300px); }
  .btn-cricket-start { width: clamp(138px, 22vmin, 200px); height: clamp(138px, 22vmin, 200px); font-size: clamp(30px, 4.75dvh, 50px); }
  .walkup-timer-bar { height: clamp(60px, 9dvh, 90px); }
}
</style>
