<template>
  <div class="between" :style="betweenStyle">
    <div class="drip-bar" style="position:absolute;top:0;left:0;right:0" />

    <!-- Avatar watermark: bottom-left for cricket, bottom-right otherwise -->
    <div class="between-avatar-bg" :class="{ 'avatar-left': isCricket }" aria-hidden="true">
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
          {{ !settingsStore.disableTimerPause && paused ? '⏸' : timeLeft }}
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
            {{ !settingsStore.disableTimerPause && paused ? '⏸' : timeLeft }}
          </text>
        </svg>

        <button v-ripple class="btn-ready" @click="startTurn">
          START
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
  const name = nextPlayer.value.name
  const prev = prevPlayer.value.name
  const p = settingsStore.narratorPersonality
  const term = settingsStore.narratorGender === 'male' ? 'brother' : 'baby'

  if (game.value?.bonusTurnActive) {
    const line = p === 'hype'      ? `${name} — BONUS THROW! Let's go!`
               : p === 'savage'    ? `${name} — bonus throw. Don't waste it.`
               : p === 'announcer' ? `And ${name} earns a bonus throw! The crowd goes wild!`
               : p === 'sarcastic' ? `Oh, lucky you. A bonus throw. Wow.`
               : p === 'smooth'    ? `Ooh, bonus throw for ${name}. Go ahead, ${term}.`
               : `${name} — bonus throw!`
    speak(line); return
  }

  if (settingsStore.cleanMode) {
    const line = p === 'hype'      ? `${name}! Let's GO!`
               : p === 'announcer' ? `Now throwing — ${name}.`
               : p === 'sarcastic' ? `${name}. I guess.`
               : p === 'smooth'    ? `${name}, you're up.`
               : name
    speak(line); return
  }

  const nextLine = p === 'hype'      ? `LET'S GO! ${name}, get up here — it's your time!`
                : p === 'savage'    ? `${name}. Get up there.`
                : p === 'announcer' ? `Now stepping up to the oche — ${name}! The crowd falls silent.`
                : p === 'sarcastic' ? `${name} — it's your turn. Try not to embarrass yourself.`
                : p === 'smooth'    ? `Alright ${name}, it's your turn. Make it smooth.`
                : `${name} — it's your turn.`

  if (settingsStore.quietNarrator) { speak(nextLine); return }

  if (gameStore.lastTurnHadBull) {
    await playShotgun()
    await new Promise(r => setTimeout(r, 200))
  }

  if (gameStore.lastTurnWasTimeout) {
    const count = gameStore.playerTimeoutCounts[prevPlayer.value.id] ?? 0
    await playThemedBuzzer(settingsStore.soundTheme)
    await new Promise(r => setTimeout(r, 200))
    if (p === 'hype') {
      await speak(`${prev} missed their turn! Unacceptable!`)
      await speak(`Step your game up!`)
      if (count >= 3) await speak(`This is getting ridiculous! Do better!`)
    } else if (p === 'savage') {
      await speak(`${prev} missed their turn. Pathetic.`)
      if (count >= 3) await speak(`This is why nobody invites you to darts night.`)
    } else if (p === 'announcer') {
      await speak(`${prev} has timed out! A costly mistake in tonight's competition!`)
      await speak(`The crowd is stunned.`)
      if (count >= 3) await speak(`This could have serious implications for the standings!`)
    } else if (p === 'sarcastic') {
      await speak(`${prev} missed their turn. Shocking. Truly.`)
      if (count >= 3) await speak(`At this point I'm not even surprised.`)
    } else if (p === 'smooth') {
      await speak(`${prev}, that's not a good look, ${term}.`)
      if (count >= 3) await speak(`Come on now. Pull it together.`)
    } else {
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
    }
    await new Promise(r => setTimeout(r, 300))
    speak(nextLine)
  } else if (gameStore.lastTurnWasZero) {
    const zeroPhrases = p === 'hype'
      ? [`Zero?! Come ON! We need better than that!`, `Shake it off — next turn!`, `That wasn't it, but you got this!`]
      : p === 'savage'
      ? [`Zero. Next.`, `Did you even try?`, `Yikes.`]
      : p === 'announcer'
      ? [`A scoreless round! The commentators are at a loss for words.`, `Zero points! An unusual turn of events.`, `Difficult conditions out there.`]
      : p === 'sarcastic'
      ? [`Zero. Outstanding.`, `A big fat zero. Inspiring.`, `Zero points. Truly a historic performance.`]
      : p === 'smooth'
      ? [`Mmm, zero, but we keep it moving.`, `Shake it off. Next turn.`, `Everyone has off nights.`]
      : [`What the fuck was that?`, `Holy shit! Please, sit down. Who's next?`, `Who invited Helen Keller to play?`, `Damn!... That was trash.`, `Were you even facing the board?`]
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
    if (timeLeft.value > 0 && timeLeft.value <= 3) playThemedTick(settingsStore.soundTheme)
    if (timeLeft.value === 20 && settingsStore.announceWalkupAt20 && !settingsStore.cleanMode) {
      const p = settingsStore.narratorPersonality
      const term = settingsStore.narratorGender === 'male' ? 'brother' : 'baby'
      const n = nextPlayer.value.name
      const line = p === 'hype'      ? `${n}, twenty seconds! Let's MOVE!`
                 : p === 'savage'    ? `${n}. Walk up.`
                 : p === 'announcer' ? `${n}, twenty seconds remaining!`
                 : p === 'sarcastic' ? `${n}, twenty seconds. Not that it seems to matter.`
                 : p === 'smooth'    ? `${n}, about twenty seconds left, ${term}.`
                 : `${n}, walk up now.`
      speak(line)
    }
    if (timeLeft.value <= 30 && !showAlert.value) {
      showAlert.value = true
      playThemedChime(settingsStore.soundTheme)
      if (!settingsStore.cleanMode) {
        const p = settingsStore.narratorPersonality
        const term = settingsStore.narratorGender === 'male' ? 'brother' : 'baby'
        const hurryCount = gameStore.playerHurryUpCounts[nextPlayer.value.id] ?? 0
        gameStore.recordHurryUp(nextPlayer.value.id)
        const n = nextPlayer.value.name
        const line = p === 'hype'      ? (hurryCount > 0 ? `${n}! I SAID let's GO! Move it!`                                              : `${n}! Hurry UP! We're all waiting!`)
                   : p === 'savage'    ? (hurryCount > 0 ? `${n}. I won't ask again.`                                                     : `${n}. Hurry up.`)
                   : p === 'announcer' ? (hurryCount > 0 ? `${n}, please step up to the line immediately!`                                : `Officials are urging ${n} to take their position!`)
                   : p === 'sarcastic' ? (hurryCount > 0 ? `${n}. We're all just waiting here. No rush. Seriously.`                      : `${n}. Any day now.`)
                   : p === 'smooth'    ? (hurryCount > 0 ? `${n}. Let's go, ${term}. Clock's moving.`                                    : `${n}, whenever you're ready, ${term}.`)
                   : (hurryCount > 0 ? `${n}. Hurry the fuck up. This is why nobody wants to play darts with you.` : `${n}. Hurry the fuck up. It's your turn.`)
        setTimeout(() => speak(line), 500)
      }
    }
  }, 1000)
})

onUnmounted(() => {
  if (interval) clearInterval(interval)
  cancelPendingSpeak()
})

function startTurn() { unlockAudio(); gameStore.startNextTurn(); router.push('/game') }
function isPhoto(url: string | null): boolean { return !!(url?.startsWith('data:') || url?.startsWith('http')) }
</script>

<style scoped>
.between {
  width: 100vw; height: 100dvh; display: flex; align-items: center; justify-content: center;
  position: relative; overflow: hidden;
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


/* Black highlight capsule behind player name */
.name-highlight-wrap {
  display: inline-flex;
  justify-content: center;
  background: rgba(0,0,0,0.65);
  border-radius: 16px;
  padding: 0 24px;
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
  paint-order: stroke fill;
}


.btn-ready {
  padding: clamp(15px, 2.25dvh, 28px) 0; font-size: clamp(33px, 4.75dvh, 53px); font-weight: 900; border-radius: 999px; width: 100%; max-width: 600px;
  background: #dc2626; border: none; color: #fff;
  cursor: pointer; transition: all 0.15s; letter-spacing: 0.14em;
  font-family: var(--font-display); position: relative; overflow: hidden;
  box-shadow: 0 4px 24px rgba(220,38,38,0.45);
}
.btn-ready:hover { background: #ef4444; }
.btn-ready:active { transform: scale(0.97); }

.swap-enter-active, .swap-leave-active { transition: opacity 0.35s, transform 0.35s; }
.swap-enter-from { opacity: 0; transform: scale(0.94); }
.swap-leave-to { opacity: 0; transform: scale(1.04); }

.between-avatar-bg {
  position: absolute; bottom: calc(14px + env(safe-area-inset-bottom)); right: 0;
  pointer-events: none; user-select: none; z-index: 3;
  display: flex; align-items: flex-end; justify-content: flex-end;
}
.between-avatar-bg.avatar-left {
  right: auto; left: 0;
  justify-content: flex-start;
}
.between-avatar-bg img {
  height: clamp(140px, 35vmin, 420px);
  width: auto;
  max-width: clamp(140px, 35vmin, 420px);
  object-fit: contain;
  opacity: 0.55; border-radius: 12px 0 0 12px;
}
.between-avatar-bg.avatar-left img { border-radius: 0 12px 12px 0; }
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
