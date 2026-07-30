<template>
  <div class="home">
    <div class="drip-bar" />

    <!-- Settings Modal -->
    <transition name="fade">
      <div v-if="showSettings" class="settings-overlay" @click.self="showSettings = false">
        <div class="settings-panel">
          <div class="settings-header">
            <span class="settings-title display">NARRATOR SETTINGS</span>
            <button class="settings-close" @click="showSettings = false">✕</button>
          </div>

          <div class="settings-section">
            <div class="settings-label">Voice</div>
            <div class="gender-toggle-row">
              <span class="gender-toggle-label">Gender</span>
              <div class="gender-toggle-btns">
                <button :class="['gender-btn', { active: settingsStore.narratorGender === 'female' }]" @click="settingsStore.setNarratorGender('female')">♀ Female</button>
                <button :class="['gender-btn', { active: settingsStore.narratorGender === 'male' }]" @click="settingsStore.setNarratorGender('male')">♂ Male</button>
              </div>
            </div>
            <div v-if="availableVoices.length === 0" class="settings-muted">No voices loaded yet. Try again in a moment.</div>
            <div v-else class="voice-list">
              <button
                v-for="v in availableVoices"
                :key="v.value"
                :class="['voice-btn', { active: settingsStore.voiceName === v.value }]"
                @click="settingsStore.setVoiceName(v.value)"
              >
                <span class="voice-btn-label">{{ v.label }}</span>
                <span v-if="v.sublabel" class="voice-btn-sub">{{ v.sublabel }}</span>
              </button>
            </div>
          </div>

          <div class="settings-section">
            <div class="settings-label">Speed & Pitch</div>
            <div class="slider-row">
              <span class="slider-label">Speed</span>
              <input type="range" class="voice-slider" min="0.1" max="1.2" step="0.05"
                :value="settingsStore.voiceRate"
                @input="settingsStore.setVoiceRate(+($event.target as HTMLInputElement).value)"
              />
              <span class="slider-val">{{ settingsStore.voiceRate.toFixed(2) }}x</span>
            </div>
            <div class="slider-row">
              <span class="slider-label">Pitch</span>
              <input type="range" class="voice-slider" min="0.1" max="3.0" step="0.05"
                :value="settingsStore.voicePitch"
                @input="settingsStore.setVoicePitch(+($event.target as HTMLInputElement).value)"
              />
              <span class="slider-val">{{ settingsStore.voicePitch.toFixed(2) }}</span>
            </div>
          </div>

          <button v-ripple class="btn btn-outline test-btn" @click="testVoice">Test Voice</button>

          <div class="settings-section">
            <div class="settings-label">Narrator Style</div>
            <div class="toggle-row" @click="settingsStore.setCleanMode(!settingsStore.cleanMode)">
              <div class="toggle-track" :class="{ active: settingsStore.cleanMode }">
                <div class="toggle-thumb" />
              </div>
              <div class="toggle-info">
                <span class="toggle-title">Clean Mode</span>
                <span class="toggle-sub">Removes profanity from all narrator lines</span>
              </div>
            </div>
            <div class="toggle-row" @click="settingsStore.setQuietNarrator(!settingsStore.quietNarrator)">
              <div class="toggle-track" :class="{ active: settingsStore.quietNarrator }">
                <div class="toggle-thumb" />
              </div>
              <div class="toggle-info">
                <span class="toggle-title">Quiet Mode</span>
                <span class="toggle-sub">Only announces whose turn it is — no commentary</span>
              </div>
            </div>
            <div v-if="!settingsStore.cleanMode" class="personality-grid">
              <button
                v-for="per in PERSONALITIES" :key="per.value"
                class="personality-btn"
                :class="{ active: settingsStore.narratorPersonality === per.value }"
                @click="settingsStore.setNarratorPersonality(per.value as any)"
              >
                <span class="per-label">{{ per.label }}</span>
                <span class="per-sub">{{ per.sub }}</span>
              </button>
            </div>
          </div>

          <div class="settings-section">
            <div class="settings-label">Timers</div>
            <div class="toggle-row" @click="settingsStore.setDisableWalkUpTimer(!settingsStore.disableWalkUpTimer)">
              <div class="toggle-track" :class="{ active: settingsStore.disableWalkUpTimer }">
                <div class="toggle-thumb" />
              </div>
              <div class="toggle-info">
                <span class="toggle-title">Disable Walk-up Timer</span>
                <span class="toggle-sub">Turns off the between-turns countdown for all games</span>
              </div>
            </div>
            <div class="toggle-row" @click="settingsStore.setDisableThrowTimer(!settingsStore.disableThrowTimer)">
              <div class="toggle-track" :class="{ active: settingsStore.disableThrowTimer }">
                <div class="toggle-thumb" />
              </div>
              <div class="toggle-info">
                <span class="toggle-title">Disable Throw Timer</span>
                <span class="toggle-sub">Turns off the per-throw countdown for all games</span>
              </div>
            </div>
          </div>

          <div class="settings-section">
            <div class="settings-label">Bullseye Sound (Cricket)</div>
            <div class="voice-list">
              <button
                v-for="opt in bullseyeSoundOptions" :key="opt.value"
                :class="['voice-btn', { active: settingsStore.bullseyeSound === opt.value }]"
                @click="previewBullseyeSound(opt.value)"
              >
                <span class="voice-btn-label">{{ opt.label }}</span>
                <span class="voice-btn-sub">{{ opt.sub }}</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </transition>

    <!-- Bottom-right watermark -->
    <div class="brand-tag-corner"><span class="brand-tag-emoji">🎯</span> EST. TONIGHT</div>

    <!-- Left: Branding -->
    <div class="home-left">
      <div class="brand">
        <h1 class="brand-headline">PEEZY DOES IT</h1>
        <h2 class="brand-title">DARTS</h2>
        <div class="brand-sub">WHO'S UP. WHO'S DOWN. WHO'S NEXT.</div>
      </div>

      <div class="home-actions">
        <div v-if="hasActiveGame" class="resume-banner">
          <div class="resume-info">
            <span class="resume-label">GAME IN PROGRESS</span>
            <span class="resume-sub">{{ GAME_TYPE_LABELS[gameStore.game!.gameType] }} · {{ gameStore.game!.players.length }} players</span>
          </div>
          <button v-ripple class="btn btn-spray btn-lg" @click="router.push('/game')">Resume →</button>
        </div>
        <button v-ripple class="btn btn-spray btn-xl w-full" @click="unlockAudio(); playStartChime(); router.push('/new-game')">
          START NEW GAME
        </button>
        <button v-ripple class="btn btn-outline btn-lg w-full yahtzee-btn" @click="router.push('/yahtzee/setup')">
          🎲 YAHTZEE
        </button>
        <div class="home-secondary">
          <button v-ripple class="btn btn-outline btn-lg" @click="router.push('/leaderboard')">
            Leaderboard
          </button>
          <button v-ripple class="btn btn-outline btn-lg" @click="router.push('/player-setup')">
            + Add Player
          </button>
          <button v-ripple class="btn btn-outline btn-lg settings-gear-btn" @click="openSettings" title="Narrator Settings">⚙️</button>
          <button v-ripple class="btn btn-outline btn-lg settings-gear-btn" @click="showCoinFlip = true" title="Flip a Coin">🪙</button>
        </div>
      </div>

    </div>

    <!-- COIN FLIP OVERLAY -->
    <Transition name="coin-fade">
      <div v-if="showCoinFlip" class="coin-overlay" @click.self="showCoinFlip = false">
        <div class="coin-modal">
          <div class="coin-modal-header">
            <span class="coin-modal-title display">COIN FLIP</span>
            <button class="coin-close-btn" @click="showCoinFlip = false">✕</button>
          </div>

          <!-- Series mode selector -->
          <div class="coin-series-modes">
            <button v-ripple class="coin-mode-btn" :class="{ active: seriesMode === 'single' }" @click="seriesMode = 'single'">Single</button>
            <button v-ripple class="coin-mode-btn" :class="{ active: seriesMode === 'bo3' }" @click="seriesMode = 'bo3'">Best of 3</button>
            <button v-ripple class="coin-mode-btn" :class="{ active: seriesMode === 'bo5' }" @click="seriesMode = 'bo5'">Best of 5</button>
          </div>

          <!-- Question / purpose -->
          <div class="coin-question-section">
            <div v-if="coinQuestion" class="coin-question-display">
              <span class="coin-question-text">{{ coinQuestion }}</span>
              <button class="coin-question-clear" @click.stop="coinQuestion = ''; showQuestionInput = false">✕</button>
            </div>
            <div v-else-if="showQuestionInput" class="coin-question-input-row" @click.stop>
              <input
                v-model="coinQuestionDraft"
                class="coin-question-input"
                placeholder="What are we flipping for?"
                maxlength="80"
                @keydown.enter="setCoinQuestion"
                @keydown.esc="showQuestionInput = false; coinQuestionDraft = ''"
              />
              <button class="coin-q-confirm" @click.stop="setCoinQuestion">✓</button>
              <button class="coin-q-cancel" @click.stop="showQuestionInput = false; coinQuestionDraft = ''">✕</button>
            </div>
            <button v-else class="coin-question-toggle" @click.stop="showQuestionInput = true">✏️ What's the flip for?</button>
          </div>

          <div class="coin-arena" @click="flipCoin">
            <div class="coin-perspective">
              <div :key="coinAnimKey" class="coin" :class="coinAnimClass">
                <div class="coin-face coin-face-heads">
                  <img v-if="settingsStore.coinHeadsImage" :src="settingsStore.coinHeadsImage" class="coin-img" />
                  <span v-else class="coin-letter">H</span>
                </div>
                <div class="coin-face coin-face-tails">
                  <img v-if="settingsStore.coinTailsImage" :src="settingsStore.coinTailsImage" class="coin-img" />
                  <span v-else class="coin-letter">T</span>
                </div>
              </div>
            </div>
            <span class="coin-tap-hint">{{ coinFlipping ? '' : seriesWinner ? 'Series complete!' : coinResult ? 'Tap to flip again' : 'Tap coin to flip' }}</span>
          </div>

          <!-- Series scoreboard -->
          <div v-if="seriesMode !== 'single'" class="coin-series-board">
            <div class="series-side" :class="{ 'series-winner-side': seriesWinner === 'heads' }">
              <span class="series-label">HEADS</span>
              <span class="series-count">{{ seriesHeads }}</span>
              <div class="series-pips">
                <span v-for="n in seriesTarget" :key="n" class="series-pip" :class="{ 'pip-filled': seriesHeads >= n }" />
              </div>
            </div>
            <div class="series-divider">vs</div>
            <div class="series-side" :class="{ 'series-winner-side': seriesWinner === 'tails' }">
              <span class="series-label">TAILS</span>
              <span class="series-count">{{ seriesTails }}</span>
              <div class="series-pips">
                <span v-for="n in seriesTarget" :key="n" class="series-pip" :class="{ 'pip-filled': seriesTails >= n }" />
              </div>
            </div>
          </div>

          <Transition name="result-slide">
            <div v-if="coinResult && !coinFlipping" class="coin-result">
              <span v-if="seriesWinner" class="coin-series-winner display">{{ seriesWinner === 'heads' ? 'HEADS WINS!' : 'TAILS WINS!' }}</span>
              <span v-else class="coin-result-text display" :class="coinResult">{{ coinResult === 'heads' ? 'HEADS' : 'TAILS' }}</span>
            </div>
          </Transition>
          <button v-if="seriesMode !== 'single' && seriesTotal > 0" v-ripple class="coin-reset-btn" @click="resetSeries()">↺ Reset Series</button>

          <div class="coin-customize">
            <div class="coin-cust-side">
              <span class="coin-cust-label">HEADS</span>
              <button class="coin-cust-btn" @click.stop="pickCoinImage('heads')">
                <img v-if="settingsStore.coinHeadsImage" :src="settingsStore.coinHeadsImage" class="cust-preview" />
                <span v-else class="cust-placeholder">+ Photo</span>
              </button>
              <button v-if="settingsStore.coinHeadsImage" class="coin-cust-clear" @click.stop="settingsStore.setCoinHeadsImage(null)">✕</button>
            </div>
            <div class="coin-cust-divider" />
            <div class="coin-cust-side">
              <span class="coin-cust-label">TAILS</span>
              <button class="coin-cust-btn" @click.stop="pickCoinImage('tails')">
                <img v-if="settingsStore.coinTailsImage" :src="settingsStore.coinTailsImage" class="cust-preview" />
                <span v-else class="cust-placeholder">+ Photo</span>
              </button>
              <button v-if="settingsStore.coinTailsImage" class="coin-cust-clear" @click.stop="settingsStore.setCoinTailsImage(null)">✕</button>
            </div>
          </div>

          <input ref="headsFileInput" type="file" accept="image/*" style="display:none" @change="onCoinImagePicked('heads', $event)" />
          <input ref="tailsFileInput" type="file" accept="image/*" style="display:none" @change="onCoinImagePicked('tails', $event)" />
        </div>
      </div>
    </Transition>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useSettingsStore } from '../stores/settings'
import { useGameStore } from '../stores/game'
import { GAME_TYPE_LABELS } from '../types/index'
import { speak, speakOhBaby, getAvailableVoices, type VoiceOption } from '../composables/useSpeech'
import { playShotgun, playBuzzer, playStartChime, unlockAudio } from '../composables/useSounds'

const router = useRouter()
const settingsStore = useSettingsStore()
const gameStore = useGameStore()

// Coin flip
const showCoinFlip = ref(false)
const coinAnimKey = ref(0)
const coinAnimClass = ref<'flip-to-heads' | 'flip-to-tails' | null>(null)
const coinFlipping = ref(false)
const coinResult = ref<'heads' | 'tails' | null>(null)
const headsFileInput = ref<HTMLInputElement | null>(null)
const tailsFileInput = ref<HTMLInputElement | null>(null)

// Series tracking
const seriesMode = ref<'single' | 'bo3' | 'bo5'>('single')
const seriesHeads = ref(0)
const seriesTails = ref(0)

// Coin question
const coinQuestion = ref('')
const coinQuestionDraft = ref('')
const showQuestionInput = ref(false)

function setCoinQuestion() {
  coinQuestion.value = coinQuestionDraft.value.trim()
  coinQuestionDraft.value = ''
  showQuestionInput.value = false
}

const seriesTarget = computed(() => seriesMode.value === 'bo3' ? 2 : seriesMode.value === 'bo5' ? 3 : 0)
const seriesWinner = computed(() => {
  if (seriesTarget.value === 0) return null
  if (seriesHeads.value >= seriesTarget.value) return 'heads'
  if (seriesTails.value >= seriesTarget.value) return 'tails'
  return null
})
const seriesTotal = computed(() => seriesHeads.value + seriesTails.value)

function flipCoin() {
  if (coinFlipping.value || seriesWinner.value !== null) return
  coinResult.value = null
  coinFlipping.value = true
  const result: 'heads' | 'tails' = Math.random() < 0.5 ? 'heads' : 'tails'
  coinAnimKey.value++
  coinAnimClass.value = result === 'heads' ? 'flip-to-heads' : 'flip-to-tails'
  setTimeout(() => {
    coinFlipping.value = false
    coinResult.value = result
    if (seriesTarget.value > 0 && seriesWinner.value === null) {
      if (result === 'heads') seriesHeads.value++
      else seriesTails.value++
    }
  }, 2200)
}

function resetSeries() {
  seriesHeads.value = 0
  seriesTails.value = 0
  coinResult.value = null
}

watch(showCoinFlip, (v) => { if (!v) { resetSeries(); coinQuestion.value = ''; coinQuestionDraft.value = ''; showQuestionInput.value = false } })
watch(seriesMode, () => resetSeries())
function pickCoinImage(side: 'heads' | 'tails') {
  if (side === 'heads') headsFileInput.value?.click()
  else tailsFileInput.value?.click()
}
function onCoinImagePicked(side: 'heads' | 'tails', e: Event) {
  const file = (e.target as HTMLInputElement).files?.[0]
  if (!file) return
  const reader = new FileReader()
  reader.onload = (ev) => {
    const data = ev.target?.result as string
    if (side === 'heads') settingsStore.setCoinHeadsImage(data)
    else settingsStore.setCoinTailsImage(data)
    ;(e.target as HTMLInputElement).value = ''
  }
  reader.readAsDataURL(file)
}
const hasActiveGame = computed(() => {
  const g = gameStore.game
  return g !== null && (g.status === 'playing' || g.status === 'between_turns')
})


const PERSONALITIES = [
  { value: 'default',   label: 'Default',    sub: 'No-nonsense commentary' },
  { value: 'hype',      label: 'Hype',       sub: 'High energy, gets excited' },
  { value: 'savage',    label: 'Savage',     sub: 'Cold, cutting, zero sympathy' },
  { value: 'announcer', label: 'Anchor',     sub: 'Formal sports broadcast' },
  { value: 'sarcastic', label: 'Sarcastic',  sub: 'Deadpan, dry, unimpressed' },
  { value: 'smooth',    label: 'Smooth',     sub: 'Low-key, cool, laid back' },
]

const showSettings = ref(false)
const availableVoices = ref<VoiceOption[]>([])

const bullseyeSoundOptions = [
  { value: 'shotgun',     label: 'Shotgun',             sub: 'Current — loud blast' },
  { value: 'buzzer',      label: 'Buzzer',               sub: 'Game-show style alert' },
  { value: 'tts-bullseye', label: '"Bullseye!"',         sub: 'Narrator says Bullseye' },
  { value: 'tts-oh-baby', label: '"Oh babyyy"',          sub: 'Narrator draws it out' },
  { value: 'tts-oh-yeah', label: '"Oh yeah, right in the bull"', sub: 'Full phrase' },
]

function openSettings() {
  availableVoices.value = getAvailableVoices()
  window.speechSynthesis.onvoiceschanged = () => {
    availableVoices.value = getAvailableVoices()
  }
  if (availableVoices.value.length === 0) {
    // Poll until voices load (some browsers delay the onvoiceschanged event)
    const poll = setInterval(() => {
      const v = getAvailableVoices()
      if (v.length > 0) { availableVoices.value = v; clearInterval(poll) }
    }, 200)
    setTimeout(() => clearInterval(poll), 5000)
  }
  showSettings.value = true
}

function testVoice() {
  speak('Testing. 1, 2, 3.')
}

function previewBullseyeSound(value: string) {
  settingsStore.setBullseyeSound(value)
  if (value === 'shotgun') playShotgun()
  else if (value === 'buzzer') playBuzzer()
  else if (value === 'tts-bullseye') speak('Bullseye!')
  else if (value === 'tts-oh-baby') speakOhBaby()
  else if (value === 'tts-oh-yeah') speak(settingsStore.cleanMode ? 'Oh yeah, right in the bull' : 'Oh yeah, right in the bull motherfucker')
}
</script>

<style scoped>
.home {
  display: flex;
  width: 100vw;
  min-height: 100dvh;
  overflow-y: auto;
  -webkit-overflow-scrolling: touch;
  overscroll-behavior: contain;
  scrollbar-width: none;
  position: relative;
  flex-direction: row;
  background-image: url('/Dartbg.avif');
  background-size: cover;
  background-position: center;
}
.home::-webkit-scrollbar { display: none; }

.home-left {
  width: 100%;
  min-height: 100dvh;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: flex-start;
  padding: 64px 56px;
  padding-top: calc(64px + env(safe-area-inset-top));
  padding-bottom: calc(64px + env(safe-area-inset-bottom));
  position: relative;
  gap: 48px;
}

.brand-tag-corner {
  position: fixed;
  bottom: calc(16px + env(safe-area-inset-bottom));
  right: 20px;
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.2em;
  color: var(--text-muted);
  text-transform: uppercase;
  z-index: 10;
  pointer-events: none;
  display: flex;
  align-items: center;
  gap: 5px;
}
.brand-tag-emoji { font-size: 16.1px; }

.brand { position: relative; z-index: 1; text-align: center; }
.brand-headline {
  font-family: var(--font-display);
  font-size: clamp(100px, 18vw, 220px);
  line-height: 0.9;
  letter-spacing: 0.05em;
  background: linear-gradient(135deg, var(--pink) 0%, var(--purple) 40%, var(--blue) 80%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  filter: drop-shadow(0 0 40px rgba(255,45,120,0.3));
  margin: 0;
}
.brand-title {
  font-family: var(--font-display);
  font-size: clamp(50px, 9vw, 110px);
  line-height: 0.9;
  letter-spacing: 0.05em;
  background: linear-gradient(135deg, var(--pink) 0%, var(--purple) 40%, var(--blue) 80%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  filter: drop-shadow(0 0 40px rgba(255,45,120,0.3));
  margin: 0;
}
.brand-sub { font-size: 13px; font-weight: 800; letter-spacing: 0.25em; color: #ffffff; text-transform: uppercase; margin-top: 16px; }

.home-secondary .btn-outline { color: #ffffff; font-weight: 700; border: 2px solid #ffffff; }
.home-secondary .btn-outline:hover { color: var(--pink); border-color: var(--pink); }
.yahtzee-btn { color: #ffffff !important; font-weight: 900 !important; border: 2px solid rgba(255,255,255,0.35) !important; font-family: var(--font-display) !important; letter-spacing: 0.08em !important; }
.yahtzee-btn:hover { border-color: var(--purple) !important; color: var(--purple) !important; box-shadow: 0 0 20px rgba(191,95,255,0.3) !important; }

.home-actions { display: flex; flex-direction: column; gap: 14px; width: 100%; max-width: 600px; position: relative; z-index: 1; }
.home-secondary { display: flex; gap: 12px; justify-content: center; }
.w-full { width: 100%; }

@media (max-width: 768px) {
  .home-left { padding: 40px 24px; padding-top: calc(40px + env(safe-area-inset-top)); gap: 32px; }
  .brand-headline { font-size: clamp(72px, 20vw, 120px); }
  .brand-title { font-size: clamp(36px, 10vw, 60px); }
  .home-actions { max-width: 100%; }
}

/* iPad portrait (769px–1100px) — center content vertically like landscape */
@media (min-width: 769px) and (max-width: 1100px) and (orientation: portrait) {
  .home-left { padding: 48px 40px; padding-top: calc(48px + env(safe-area-inset-top)); gap: 36px; justify-content: center; }
  .brand-headline { font-size: clamp(64px, 10vw, 100px); }
  .brand-title { font-size: clamp(32px, 5vw, 50px); }
  .home-actions { max-width: 100%; }
}

/* Desktop / laptop — scale to fit viewport height */
@media (min-width: 769px) and (min-height: 901px) {
  .home-left { justify-content: center; }
}
@media (min-width: 769px) and (max-height: 900px) {
  .home-left {
    justify-content: center;
    padding: 32px 56px;
    padding-top: calc(32px + env(safe-area-inset-top));
    padding-bottom: calc(32px + env(safe-area-inset-bottom));
    gap: 24px;
    min-height: 100dvh;
  }
  .brand-headline { font-size: clamp(60px, 11vw, 140px); }
  .brand-title { font-size: clamp(30px, 5.5vw, 70px); }
  .home-actions { gap: 10px; }
}
@media (min-width: 769px) and (max-height: 700px) {
  .home-left { padding: 20px 56px; gap: 16px; }
  .brand-headline { font-size: clamp(48px, 9vw, 110px); }
  .brand-title { font-size: clamp(24px, 4.5vw, 56px); }
  .brand-sub { font-size: 11px; margin-top: 8px; }
  .home-actions { gap: 8px; }
}

/* Settings */
.settings-gear-btn { flex-shrink: 0; padding-left: 14px; padding-right: 14px; }

.settings-overlay {
  position: fixed; inset: 0; z-index: 200;
  background: rgba(0,0,0,0.7); backdrop-filter: blur(8px); -webkit-backdrop-filter: blur(8px);
  display: flex; align-items: center; justify-content: center;
  padding: 24px;
}
.settings-panel {
  background: #111; border: 1px solid rgba(255,255,255,0.12); border-radius: 12px;
  padding: 28px; width: 100%; max-width: 480px;
  display: flex; flex-direction: column; gap: 24px;
  max-height: calc(100dvh - 48px);
  overflow-y: auto;
  -webkit-overflow-scrolling: touch;
  overscroll-behavior: contain;
}
.settings-header { display: flex; align-items: center; justify-content: space-between; }
.settings-title { font-size: 20px; letter-spacing: 0.15em; color: var(--pink); }
.settings-close { background: none; border: none; color: var(--text-muted); font-size: 20px; cursor: pointer; padding: 4px 8px; }
.settings-close:hover { color: #fff; }

.settings-section { display: flex; flex-direction: column; gap: 10px; }
.settings-label { font-size: 14px; font-weight: 700; letter-spacing: 0.15em; text-transform: uppercase; color: #fff; }
.settings-muted { font-size: 15px; color: rgba(255,255,255,0.7); }

.gender-toggle-row { display: flex; align-items: center; gap: 12px; margin-bottom: 12px; }
.gender-toggle-label { font-size: 12px; font-weight: 700; letter-spacing: 0.1em; text-transform: uppercase; color: rgba(255,255,255,0.45); min-width: 48px; }
.gender-toggle-btns { display: flex; gap: 6px; }
.gender-btn {
  padding: 7px 18px; border-radius: 8px; border: 1px solid rgba(255,255,255,0.12);
  background: rgba(255,255,255,0.05); color: rgba(255,255,255,0.6);
  font-size: 14px; font-weight: 700; cursor: pointer; transition: all 0.15s;
  -webkit-tap-highlight-color: transparent;
}
.gender-btn.active { background: rgba(255,45,120,0.2); border-color: var(--pink); color: #fff; }
.gender-btn:hover:not(.active) { background: rgba(255,255,255,0.1); color: #fff; }
.voice-list { display: flex; flex-direction: column; gap: 6px; }
.voice-btn {
  display: flex; align-items: center; justify-content: space-between; gap: 12px;
  padding: 12px 16px; border-radius: 8px; font-size: 16px; font-weight: 700; cursor: pointer; text-align: left;
  background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.12); color: rgba(255,255,255,0.9);
  transition: all 0.15s; width: 100%;
}
.voice-btn.active { background: rgba(255,45,120,0.2); border-color: var(--pink); color: #fff; box-shadow: 0 0 12px rgba(255,45,120,0.25); }
.voice-btn:hover:not(.active) { background: rgba(255,255,255,0.1); color: #fff; }
.voice-btn-label { font-weight: 700; }
.voice-btn-sub { font-size: 13px; font-weight: 500; color: rgba(255,255,255,0.6); flex-shrink: 0; }

.test-btn { align-self: flex-end; }

.slider-row {
  display: flex; align-items: center; gap: 12px;
  padding: 8px 14px; border-radius: 8px;
  background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.1);
}
.slider-label { font-size: 15px; font-weight: 700; color: #fff; width: 42px; flex-shrink: 0; }
.slider-val { font-size: 15px; font-weight: 700; color: var(--pink); width: 50px; text-align: right; flex-shrink: 0; font-family: var(--font-display); }
.voice-slider {
  flex: 1; -webkit-appearance: none; appearance: none;
  height: 4px; border-radius: 2px; outline: none; cursor: pointer;
  background: linear-gradient(to right, var(--pink) 0%, var(--pink) calc((var(--val, 50%) )), rgba(255,255,255,0.15) calc((var(--val, 50%))) , rgba(255,255,255,0.15) 100%);
}
.voice-slider::-webkit-slider-thumb {
  -webkit-appearance: none; appearance: none;
  width: 18px; height: 18px; border-radius: 50%;
  background: #fff; border: 2px solid var(--pink);
  box-shadow: 0 0 8px rgba(255,45,120,0.5); cursor: pointer;
}
.voice-slider::-moz-range-thumb {
  width: 18px; height: 18px; border-radius: 50%;
  background: #fff; border: 2px solid var(--pink);
  box-shadow: 0 0 8px rgba(255,45,120,0.5); cursor: pointer;
}

.toggle-row {
  display: flex; align-items: center; gap: 14px;
  padding: 12px 14px; border-radius: 8px; cursor: pointer;
  background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.1);
  transition: background 0.15s;
  user-select: none;
}
.toggle-row:hover { background: rgba(255,255,255,0.08); }
.toggle-track {
  width: 44px; height: 24px; border-radius: 12px; flex-shrink: 0;
  background: rgba(255,255,255,0.15); border: 1px solid rgba(255,255,255,0.2);
  position: relative; transition: background 0.2s;
}
.toggle-track.active { background: var(--pink); border-color: var(--pink); }
.toggle-thumb {
  position: absolute; top: 3px; left: 3px;
  width: 16px; height: 16px; border-radius: 50%; background: #fff;
  transition: transform 0.2s; box-shadow: 0 1px 4px rgba(0,0,0,0.4);
}
.toggle-track.active .toggle-thumb { transform: translateX(20px); }
.toggle-info { display: flex; flex-direction: column; gap: 2px; }
.toggle-title { font-size: 16px; font-weight: 700; color: #fff; }
.toggle-sub { font-size: 13px; color: rgba(255,255,255,0.65); line-height: 1.4; }

.personality-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-top: 4px; }
.personality-btn {
  display: flex; flex-direction: column; align-items: flex-start; gap: 2px;
  padding: 10px 12px; border-radius: 8px; border: 1px solid rgba(255,255,255,0.12);
  background: rgba(255,255,255,0.04); cursor: pointer; transition: all 0.15s; text-align: left;
  position: relative; overflow: hidden;
}
.personality-btn:hover { background: rgba(255,255,255,0.08); border-color: rgba(255,255,255,0.25); }
.personality-btn.active { border-color: var(--pink); background: rgba(255,45,120,0.12); }
.per-label { font-size: 13px; font-weight: 800; font-family: var(--font-display); letter-spacing: 0.05em; color: #fff; }
.personality-btn.active .per-label { color: var(--pink); }
.per-sub { font-size: 10px; color: rgba(255,255,255,0.45); font-weight: 600; line-height: 1.3; }

.fade-enter-active, .fade-leave-active { transition: opacity 0.2s; }
.fade-enter-from, .fade-leave-to { opacity: 0; }

/* Coin flip overlay */
.coin-overlay {
  position: fixed; inset: 0; z-index: 300;
  background: rgba(0,0,0,0.9); backdrop-filter: blur(14px); -webkit-backdrop-filter: blur(14px);
  display: flex; align-items: center; justify-content: center;
  padding: 24px; padding-top: max(24px, env(safe-area-inset-top)); padding-bottom: max(24px, env(safe-area-inset-bottom));
}
.coin-modal {
  display: flex; flex-direction: column; align-items: center;
  gap: 28px; width: 100%; max-width: 340px;
  max-height: calc(100dvh - 48px);
  overflow-y: auto; overflow-x: hidden;
  scrollbar-width: none;
}
.coin-modal::-webkit-scrollbar { display: none; }
.coin-modal-header { display: flex; align-items: center; justify-content: center; width: 100%; position: relative; }
.coin-modal-title { font-size: 38px; letter-spacing: 0.2em; color: #ffd700; font-weight: 900; }
.coin-close-btn {
  position: absolute; right: 0;
  background: none; border: none; color: rgba(255,255,255,0.45); font-size: 22px;
  cursor: pointer; padding: 4px 8px; line-height: 1;
}
.coin-close-btn:hover { color: #fff; }
.coin-arena {
  display: flex; flex-direction: column; align-items: center; gap: 18px;
  cursor: pointer; -webkit-tap-highlight-color: transparent;
}
.coin-perspective { perspective: 700px; }
.coin {
  width: 160px; height: 160px; position: relative;
  transform-style: preserve-3d;
}
.coin.flip-to-heads { animation: coin-flip-heads 2.2s cubic-bezier(0.12, 0.5, 0.22, 1) forwards; }
.coin.flip-to-tails { animation: coin-flip-tails 2.2s cubic-bezier(0.12, 0.5, 0.22, 1) forwards; }
@keyframes coin-flip-heads {
  0%   { transform: rotateY(0deg); }
  100% { transform: rotateY(1440deg); }
}
@keyframes coin-flip-tails {
  0%   { transform: rotateY(0deg); }
  100% { transform: rotateY(1260deg); }
}
.coin-face {
  position: absolute; inset: 0; border-radius: 50%;
  backface-visibility: hidden; -webkit-backface-visibility: hidden;
  display: flex; align-items: center; justify-content: center; overflow: hidden;
  background: radial-gradient(circle at 35% 30%, #ffe566, #e8a800 58%, #a07000);
  border: 4px solid #c89600;
  box-shadow: inset 0 3px 12px rgba(255,255,200,0.5), inset 0 -3px 8px rgba(0,0,0,0.35), 0 6px 28px rgba(0,0,0,0.7);
}
.coin-face-tails { transform: rotateY(180deg); }
.coin-img { width: 100%; height: 100%; object-fit: cover; }
.coin-letter {
  font-family: var(--font-display); font-size: 44px; font-weight: 900;
  color: #7a4800; text-shadow: 0 1px 3px rgba(255,220,80,0.7); letter-spacing: 0.04em;
}
.coin-tap-hint {
  font-size: 12px; color: rgba(255,255,255,0.38); letter-spacing: 0.1em;
  text-transform: uppercase; font-weight: 600; min-height: 18px;
}
.coin-result { display: flex; align-items: center; justify-content: center; }
.coin-result-text { font-size: 52px; letter-spacing: 0.12em; font-weight: 900; }
.coin-result-text.heads { color: #ffd700; filter: drop-shadow(0 0 20px rgba(255,215,0,0.7)); }
.coin-result-text.tails { color: #c8d4e8; filter: drop-shadow(0 0 20px rgba(180,200,240,0.6)); }
.coin-customize {
  display: flex; align-items: center; gap: 20px; padding: 14px 20px;
  background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.08);
  border-radius: 12px; width: 100%;
}
.coin-cust-side { flex: 1; display: flex; flex-direction: column; align-items: center; gap: 8px; }
.coin-cust-label { font-size: 10px; font-weight: 800; letter-spacing: 0.15em; color: rgba(255,255,255,0.38); text-transform: uppercase; }
.coin-cust-btn {
  width: 64px; height: 64px; border-radius: 50%;
  border: 2px dashed rgba(255,255,255,0.2); background: rgba(255,255,255,0.05);
  cursor: pointer; display: flex; align-items: center; justify-content: center;
  overflow: hidden; transition: border-color 0.15s, background 0.15s;
}
.coin-cust-btn:hover { border-color: rgba(255,255,255,0.4); background: rgba(255,255,255,0.1); }
.cust-preview { width: 100%; height: 100%; object-fit: cover; }
.cust-placeholder { font-size: 11px; color: rgba(255,255,255,0.35); font-weight: 700; }
.coin-cust-clear { background: none; border: none; color: rgba(255,80,80,0.65); font-size: 13px; cursor: pointer; padding: 2px 6px; }
.coin-cust-clear:hover { color: #ff4444; }
.coin-cust-divider { width: 1px; height: 60px; background: rgba(255,255,255,0.08); flex-shrink: 0; }
.coin-fade-enter-active, .coin-fade-leave-active { transition: opacity 0.22s; }
.coin-fade-enter-from, .coin-fade-leave-to { opacity: 0; }
.result-slide-enter-active { transition: opacity 0.3s, transform 0.3s; }
.result-slide-enter-from { opacity: 0; transform: translateY(14px) scale(0.75); }

.resume-banner {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  background: rgba(255,45,120,0.1);
  border: 1px solid rgba(255,45,120,0.45);
  border-radius: 12px;
  padding: 14px 18px;
  width: 100%;
}
.resume-info { display: flex; flex-direction: column; gap: 2px; }
.resume-label { font-size: 14px; font-weight: 800; letter-spacing: 0.08em; color: var(--pink); font-family: var(--font-display); }
.resume-sub { font-size: 12px; color: rgba(255,255,255,0.5); }

/* Series */
.coin-series-modes { display: flex; gap: 8px; justify-content: center; width: 100%; }
.coin-mode-btn {
  flex: 1; padding: 7px 0; border-radius: 8px;
  border: 2px solid rgba(255,255,255,0.2);
  background: rgba(255,255,255,0.05);
  color: rgba(255,255,255,0.6); font-size: 13px; font-weight: 700;
  cursor: pointer; transition: all 0.15s;
  position: relative; overflow: hidden;
}
.coin-mode-btn:hover { border-color: rgba(255,255,255,0.4); color: #fff; }
.coin-mode-btn.active { border-color: #ffd700; color: #ffd700; background: rgba(255,215,0,0.1); }

.coin-series-board {
  display: flex; align-items: center; justify-content: center;
  gap: 16px; width: 100%; padding: 10px 0;
}
.series-side {
  display: flex; flex-direction: column; align-items: center; gap: 4px;
  flex: 1; padding: 10px; border-radius: 10px;
  border: 2px solid rgba(255,255,255,0.1);
  background: rgba(255,255,255,0.04);
  transition: all 0.3s;
}
.series-winner-side {
  border-color: #ffd700;
  background: rgba(255,215,0,0.12);
  box-shadow: 0 0 16px rgba(255,215,0,0.25);
}
.series-label { font-size: 10px; font-weight: 900; letter-spacing: 0.12em; color: rgba(255,255,255,0.5); }
.series-winner-side .series-label { color: #ffd700; }
.series-count { font-size: 36px; font-weight: 900; font-family: var(--font-display); color: #fff; line-height: 1; }
.series-winner-side .series-count { color: #ffd700; }
.series-pips { display: flex; gap: 5px; margin-top: 2px; }
.series-pip {
  width: 10px; height: 10px; border-radius: 50%;
  background: rgba(255,255,255,0.15);
  transition: background 0.2s;
}
.series-pip.pip-filled { background: #ffd700; box-shadow: 0 0 6px rgba(255,215,0,0.6); }
.series-divider { font-size: 13px; font-weight: 700; color: rgba(255,255,255,0.3); }

.coin-series-winner { font-size: 28px; letter-spacing: 0.1em; color: #ffd700; filter: drop-shadow(0 0 12px rgba(255,215,0,0.6)); }

.coin-reset-btn {
  width: 100%; padding: 10px; border-radius: 8px;
  border: 2px solid rgba(255,255,255,0.2);
  background: rgba(255,255,255,0.06);
  color: rgba(255,255,255,0.7); font-size: 14px; font-weight: 700;
  cursor: pointer; transition: all 0.15s;
  position: relative; overflow: hidden;
}
.coin-reset-btn:hover { border-color: #ffd700; color: #ffd700; background: rgba(255,215,0,0.1); }

/* Question feature */
.coin-question-section { width: 100%; display: flex; flex-direction: column; align-items: center; }
.coin-question-toggle {
  background: none; border: 1px dashed rgba(255,255,255,0.2); border-radius: 8px;
  color: rgba(255,255,255,0.35); font-size: 12px; font-weight: 700; letter-spacing: 0.05em;
  padding: 7px 16px; cursor: pointer; width: 100%; transition: all 0.15s;
}
.coin-question-toggle:hover { border-color: rgba(255,215,0,0.4); color: rgba(255,215,0,0.6); }
.coin-question-display {
  display: flex; align-items: center; gap: 10px; width: 100%;
  background: rgba(255,215,0,0.07); border: 1px solid rgba(255,215,0,0.25);
  border-radius: 10px; padding: 10px 14px;
}
.coin-question-text {
  flex: 1; font-size: 15px; font-weight: 800; font-family: var(--font-display);
  letter-spacing: 0.04em; color: #ffd700; text-align: center;
  filter: drop-shadow(0 0 8px rgba(255,215,0,0.4));
}
.coin-question-clear {
  background: none; border: none; color: rgba(255,215,0,0.5); font-size: 14px;
  cursor: pointer; padding: 2px 4px; flex-shrink: 0; line-height: 1;
}
.coin-question-clear:hover { color: #ff5555; }
.coin-question-input-row {
  display: flex; align-items: center; gap: 6px; width: 100%;
}
.coin-question-input {
  flex: 1; background: rgba(255,255,255,0.06); border: 1px solid rgba(255,215,0,0.3);
  border-radius: 8px; color: #fff; font-size: 14px; font-weight: 600;
  padding: 9px 12px; outline: none; font-family: inherit;
}
.coin-question-input::placeholder { color: rgba(255,255,255,0.3); }
.coin-question-input:focus { border-color: rgba(255,215,0,0.6); }
.coin-q-confirm, .coin-q-cancel {
  flex-shrink: 0; width: 34px; height: 34px; border-radius: 8px; border: none;
  font-size: 14px; font-weight: 700; cursor: pointer; transition: all 0.15s;
}
.coin-q-confirm { background: rgba(255,215,0,0.15); color: #ffd700; }
.coin-q-confirm:hover { background: rgba(255,215,0,0.3); }
.coin-q-cancel { background: rgba(255,255,255,0.06); color: rgba(255,255,255,0.45); }
.coin-q-cancel:hover { color: #ff5555; }

/* iPad coin flip — scale up elements, keep centered modal layout */
@media (min-width: 768px) and (max-width: 1100px) {
  .coin-modal { max-width: 480px; }
  .coin-modal-title { font-size: clamp(36px, 5vw, 56px); letter-spacing: 0.25em; }
  .coin-close-btn { font-size: 28px; padding: 6px 12px; }
  .coin-series-modes { gap: 12px; }
  .coin-mode-btn { font-size: 17px; padding: 11px 0; border-radius: 10px; }
  .coin-arena { gap: 22px; }
  .coin-perspective { perspective: 1000px; }
  .coin { width: 220px; height: 220px; }
  .coin-letter { font-size: 68px; }
  .coin-tap-hint { font-size: 15px; min-height: 22px; }
  .coin-result-text { font-size: 72px; }
  .coin-series-winner { font-size: 42px; }
  .coin-series-board { gap: 20px; }
  .series-side { padding: 14px 20px; border-radius: 12px; }
  .series-count { font-size: 52px; }
  .series-pip { width: 13px; height: 13px; }
  .coin-reset-btn { font-size: 17px; padding: 13px; }
  .coin-customize { padding: 16px 24px; }
  .coin-cust-btn { width: 80px; height: 80px; }
}
</style>
