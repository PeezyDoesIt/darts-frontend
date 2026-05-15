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
              <input type="range" class="voice-slider" min="0.5" max="1.5" step="0.05"
                :value="settingsStore.voiceRate"
                @input="settingsStore.setVoiceRate(+($event.target as HTMLInputElement).value)"
              />
              <span class="slider-val">{{ settingsStore.voiceRate.toFixed(2) }}x</span>
            </div>
            <div class="slider-row">
              <span class="slider-label">Pitch</span>
              <input type="range" class="voice-slider" min="0.5" max="1.5" step="0.05"
                :value="settingsStore.voicePitch"
                @input="settingsStore.setVoicePitch(+($event.target as HTMLInputElement).value)"
              />
              <span class="slider-val">{{ settingsStore.voicePitch.toFixed(2) }}</span>
            </div>
          </div>

          <button v-ripple class="btn btn-outline test-btn" @click="testVoice">Test Voice</button>

          <div class="settings-section">
            <div class="settings-label">Narrator Style</div>
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
                @click="settingsStore.setBullseyeSound(opt.value)"
              >
                <span class="voice-btn-label">{{ opt.label }}</span>
                <span class="voice-btn-sub">{{ opt.sub }}</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </transition>

    <!-- Left: Branding -->
    <div class="home-left">
      <div class="brand">
        <div class="brand-tag">🎯 EST. TONIGHT</div>
        <h1 class="brand-title">DARTS</h1>
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

      <div class="splatter" aria-hidden="true">
        <span class="dot" style="--c:var(--pink);   --x:12%; --y:20%; --s:18px" />
        <span class="dot" style="--c:var(--blue);   --x:80%; --y:10%; --s:12px" />
        <span class="dot" style="--c:var(--lime);   --x:60%; --y:80%; --s:20px" />
        <span class="dot" style="--c:var(--orange); --x:25%; --y:70%; --s:14px" />
        <span class="dot" style="--c:var(--purple); --x:90%; --y:55%; --s:10px" />
        <span class="dot" style="--c:var(--pink);   --x:45%; --y:15%; --s:8px" />
        <span class="dot" style="--c:var(--blue);   --x:70%; --y:40%; --s:16px" />
      </div>
    </div>

    <!-- Right: Leaderboard -->
    <div class="home-right">
      <div class="lb-head">
        <span class="lb-title display">TOP PLAYERS</span>
      </div>

      <div v-if="topPlayers.length === 0" class="lb-empty">
        <span style="font-size:48px">🎯</span>
        <p>No players yet.</p>
        <button v-ripple class="btn btn-outline" @click="router.push('/player-setup')">Add your first player</button>
      </div>

      <div v-else class="lb-scroll">
        <div class="lb-list">
          <div v-for="(p, i) in topPlayers" :key="p.id" class="lb-row">
            <div class="lb-rank" :style="{ color: rankColor(i) }">
              {{ i === 0 ? '👑' : i === 1 ? '②' : i === 2 ? '③' : i + 1 }}
            </div>
            <div class="lb-avatar" :style="{ background: p.color, boxShadow: `0 0 12px ${p.color}80` }">
              <img v-if="isPhoto(p.avatarUrl)" :src="p.avatarUrl!" alt="" />
              <span v-else>{{ p.avatarUrl ?? '🎯' }}</span>
            </div>
            <div class="lb-info">
              <span class="lb-name">{{ p.name }}</span>
              <div class="lb-bar-wrap">
                <div class="lb-bar" :style="{ width: winRate(p) + '%', background: p.color }" />
              </div>
            </div>
            <div class="lb-stats">
              <span class="lb-wins" :style="{ color: p.color }">{{ p.wins }}W</span>
              <span class="lb-games">{{ p.gamesPlayed }}G</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import { usePlayersStore } from '../stores/players'
import { useSettingsStore } from '../stores/settings'
import { speak, getAvailableVoices, type VoiceOption } from '../composables/useSpeech'
import type { Player } from '../types/index'

const router = useRouter()
const playersStore = usePlayersStore()
const settingsStore = useSettingsStore()

const topPlayers = computed(() =>
  [...playersStore.players].sort((a, b) => b.wins - a.wins).slice(0, 8)
)

function rankColor(i: number) {
  return ['var(--gold)', '#aaa', '#cd7f32'][i] ?? 'var(--text-muted)'
}
function winRate(p: Player) {
  return p.gamesPlayed > 0 ? Math.round((p.wins / p.gamesPlayed) * 100) : 0
}
function isPhoto(url: string | null) {
  return url?.startsWith('data:') || url?.startsWith('http')
}

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
  if (availableVoices.value.length === 0) {
    window.speechSynthesis.onvoiceschanged = () => {
      window.speechSynthesis.onvoiceschanged = null
      availableVoices.value = getAvailableVoices()
    }
    setTimeout(() => {
      if (availableVoices.value.length === 0) availableVoices.value = getAvailableVoices()
    }, 600)
  }
  showSettings.value = true
}

function testVoice() {
  speak('Testing. One, two, three. Ready to play some darts?')
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
}

.home-left {
  width: 46%;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  justify-content: center;
  padding: 64px 56px;
  padding-top: calc(64px + env(safe-area-inset-top));
  padding-bottom: calc(64px + env(safe-area-inset-bottom));
  border-right: 1px solid var(--border);
  position: relative;
  overflow: hidden;
  gap: 48px;
}

.home-left::before {
  content: '';
  position: absolute;
  inset: 0;
  background-image:
    radial-gradient(ellipse at 20% 50%, rgba(255,45,120,0.06) 0%, transparent 60%),
    radial-gradient(ellipse at 80% 20%, rgba(0,212,255,0.05) 0%, transparent 50%),
    radial-gradient(ellipse at 60% 80%, rgba(191,95,255,0.05) 0%, transparent 50%);
  pointer-events: none;
}

.brand { position: relative; z-index: 1; }
.brand-tag { font-size: 12px; font-weight: 700; letter-spacing: 0.2em; color: var(--text-muted); text-transform: uppercase; margin-bottom: 8px; }
.brand-title {
  font-family: var(--font-display);
  font-size: 120px;
  line-height: 0.9;
  letter-spacing: 0.05em;
  background: linear-gradient(135deg, var(--pink) 0%, var(--purple) 40%, var(--blue) 80%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  filter: drop-shadow(0 0 40px rgba(255,45,120,0.3));
}
.brand-sub { font-size: 12px; font-weight: 800; letter-spacing: 0.25em; color: var(--text-muted); text-transform: uppercase; margin-top: 16px; }

.home-actions { display: flex; flex-direction: column; gap: 14px; width: 100%; max-width: 380px; position: relative; z-index: 1; }
.home-secondary { display: flex; gap: 12px; }
.w-full { width: 100%; }

.splatter { position: absolute; inset: 0; pointer-events: none; }
.dot { position: absolute; left: var(--x); top: var(--y); width: var(--s); height: var(--s); border-radius: 50%; background: var(--c); opacity: 0.5; filter: blur(1px); }

.home-right {
  flex: 1;
  display: flex;
  flex-direction: column;
  padding: 40px;
  padding-top: calc(40px + env(safe-area-inset-top));
  padding-bottom: calc(40px + env(safe-area-inset-bottom));
  gap: 24px;
  overflow: hidden;
}

.lb-head { display: flex; align-items: center; justify-content: space-between; }
.lb-title { font-size: 32px; color: var(--text-muted); letter-spacing: 0.1em; }

.lb-empty { flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 16px; color: var(--text-muted); font-size: 15px; }

.lb-scroll { flex: 1; min-height: 0; overflow-y: auto; }
.lb-list { display: flex; flex-direction: column; gap: 10px; padding-right: 4px; }

.lb-row {
  display: flex; align-items: center; gap: 16px; padding: 16px;
  background: rgba(255,255,255,0.04); backdrop-filter: blur(12px); -webkit-backdrop-filter: blur(12px);
  border: 1px solid rgba(255,255,255,0.08); border-radius: 10px;
  transition: border-color 0.15s, background 0.15s;
}
.lb-row:hover { background: rgba(255,255,255,0.07); border-color: rgba(255,255,255,0.15); }

.lb-rank { font-size: 22px; font-family: var(--font-display); width: 36px; text-align: center; flex-shrink: 0; }
.lb-avatar { width: 46px; height: 46px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 22px; flex-shrink: 0; overflow: hidden; }
.lb-avatar img { width: 100%; height: 100%; object-fit: cover; }

.lb-info { flex: 1; display: flex; flex-direction: column; gap: 6px; min-width: 0; }
.lb-name { font-size: 16px; font-weight: 700; }
.lb-bar-wrap { height: 3px; background: var(--border); border-radius: 2px; overflow: hidden; }
.lb-bar { height: 100%; border-radius: 2px; transition: width 0.6s ease; min-width: 4px; }

.lb-stats { display: flex; flex-direction: column; align-items: flex-end; gap: 2px; flex-shrink: 0; }
.lb-wins { font-size: 20px; font-weight: 900; font-family: var(--font-display); }
.lb-games { font-size: 12px; color: var(--text-muted); }

@media (max-width: 768px) {
  .home { flex-direction: column; height: auto; min-height: 100dvh; overflow: auto; }
  .home-left { width: 100%; padding: 40px 24px; padding-top: calc(40px + env(safe-area-inset-top)); gap: 32px; border-right: none; border-bottom: 1px solid var(--border); }
  .brand-title { font-size: 80px; }
  .home-right { padding: 24px; padding-bottom: calc(24px + env(safe-area-inset-bottom)); overflow: visible; }
  .lb-scroll { flex: none; height: auto; }
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
}
.settings-header { display: flex; align-items: center; justify-content: space-between; }
.settings-title { font-size: 20px; letter-spacing: 0.15em; color: var(--pink); }
.settings-close { background: none; border: none; color: var(--text-muted); font-size: 20px; cursor: pointer; padding: 4px 8px; }
.settings-close:hover { color: #fff; }

.settings-section { display: flex; flex-direction: column; gap: 10px; }
.settings-label { font-size: 12px; font-weight: 700; letter-spacing: 0.15em; text-transform: uppercase; color: var(--text-muted); }
.settings-muted { font-size: 13px; color: var(--text-muted); }

.voice-list { display: flex; flex-direction: column; gap: 6px; max-height: 320px; overflow-y: auto; }
.voice-btn {
  display: flex; align-items: center; justify-content: space-between; gap: 12px;
  padding: 10px 14px; border-radius: 8px; font-size: 14px; font-weight: 700; cursor: pointer; text-align: left;
  background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.12); color: var(--text-muted);
  transition: all 0.15s; width: 100%;
}
.voice-btn.active { background: rgba(255,45,120,0.2); border-color: var(--pink); color: #fff; box-shadow: 0 0 12px rgba(255,45,120,0.25); }
.voice-btn:hover:not(.active) { background: rgba(255,255,255,0.1); color: #fff; }
.voice-btn-label { font-weight: 700; }
.voice-btn-sub { font-size: 11px; font-weight: 500; color: rgba(255,255,255,0.4); flex-shrink: 0; }

.test-btn { align-self: flex-end; }

.slider-row {
  display: flex; align-items: center; gap: 12px;
  padding: 8px 14px; border-radius: 8px;
  background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.1);
}
.slider-label { font-size: 13px; font-weight: 700; color: var(--text-muted); width: 36px; flex-shrink: 0; }
.slider-val { font-size: 13px; font-weight: 700; color: var(--pink); width: 40px; text-align: right; flex-shrink: 0; font-family: var(--font-display); }
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
.toggle-title { font-size: 14px; font-weight: 700; color: var(--text); }
.toggle-sub { font-size: 11px; color: var(--text-muted); line-height: 1.4; }

.fade-enter-active, .fade-leave-active { transition: opacity 0.2s; }
.fade-enter-from, .fade-leave-to { opacity: 0; }
</style>
