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
        <button v-ripple class="btn btn-spray btn-xl w-full" @click="router.push('/new-game')">
          START NEW GAME
        </button>
        <div class="home-secondary">
          <button v-ripple class="btn btn-outline btn-lg" @click="router.push('/leaderboard')">
            Leaderboard
          </button>
          <button v-ripple class="btn btn-outline btn-lg" @click="router.push('/player-setup')">
            + Add Player
          </button>
          <button v-ripple class="btn btn-outline btn-lg settings-gear-btn" @click="openSettings" title="Narrator Settings">⚙️</button>
        </div>
      </div>

    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useSettingsStore } from '../stores/settings'
import { speak, speakOhBaby, getAvailableVoices, type VoiceOption } from '../composables/useSpeech'
import { playShotgun, playBuzzer } from '../composables/useSounds'

const router = useRouter()
const settingsStore = useSettingsStore()


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
  speak('Testing. One, two, three. Ready to play some darts?')
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
  height: 100dvh;
  overflow: hidden;
  position: relative;
  flex-direction: row;
  background-image: url('/Dartbg.avif');
  background-size: cover;
  background-position: center;
}

.home-left {
  width: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 64px 56px;
  padding-top: calc(64px + env(safe-area-inset-top));
  padding-bottom: calc(64px + env(safe-area-inset-bottom));
  position: relative;
  overflow: hidden;
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

.home-secondary .btn-outline { color: #ffffff; font-weight: 700; border-color: #ffffff; }
.home-secondary .btn-outline:hover { color: var(--pink); border-color: var(--pink); }

.home-actions { display: flex; flex-direction: column; gap: 14px; width: 100%; max-width: 600px; position: relative; z-index: 1; }
.home-secondary { display: flex; gap: 12px; justify-content: center; }
.w-full { width: 100%; }

@media (max-width: 768px) {
  .home-left { padding: 40px 24px; padding-top: calc(40px + env(safe-area-inset-top)); gap: 32px; }
  .brand-headline { font-size: clamp(72px, 20vw, 120px); }
  .brand-title { font-size: clamp(36px, 10vw, 60px); }
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
}
.settings-header { display: flex; align-items: center; justify-content: space-between; }
.settings-title { font-size: 20px; letter-spacing: 0.15em; color: var(--pink); }
.settings-close { background: none; border: none; color: var(--text-muted); font-size: 20px; cursor: pointer; padding: 4px 8px; }
.settings-close:hover { color: #fff; }

.settings-section { display: flex; flex-direction: column; gap: 10px; }
.settings-label { font-size: 14px; font-weight: 700; letter-spacing: 0.15em; text-transform: uppercase; color: #fff; }
.settings-muted { font-size: 15px; color: rgba(255,255,255,0.7); }

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

.fade-enter-active, .fade-leave-active { transition: opacity 0.2s; }
.fade-enter-from, .fade-leave-to { opacity: 0; }
</style>
