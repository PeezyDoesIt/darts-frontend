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
            <span class="coin-tap-hint">{{ coinFlipping ? '' : coinResult ? 'Tap to flip again' : 'Tap coin to flip' }}</span>
          </div>

          <Transition name="result-slide">
            <div v-if="coinResult && !coinFlipping" class="coin-result">
              <span class="coin-result-text display" :class="coinResult">{{ coinResult === 'heads' ? 'HEADS' : 'TAILS' }}</span>
            </div>
          </Transition>

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
import { computed, ref } from 'vue'
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

function flipCoin() {
  if (coinFlipping.value) return
  coinResult.value = null
  coinFlipping.value = true
  const result: 'heads' | 'tails' = Math.random() < 0.5 ? 'heads' : 'tails'
  coinAnimKey.value++
  coinAnimClass.value = result === 'heads' ? 'flip-to-heads' : 'flip-to-tails'
  setTimeout(() => {
    coinFlipping.value = false
    coinResult.value = result
  }, 2200)
}
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
  position: relative;
  flex-direction: row;
  background-image: url('/Dartbg.avif');
  background-size: cover;
  background-position: center;
}

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
}
.coin-modal-header { display: flex; align-items: center; justify-content: space-between; width: 100%; }
.coin-modal-title { font-size: 22px; letter-spacing: 0.2em; color: #ffd700; }
.coin-close-btn {
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
</style>
