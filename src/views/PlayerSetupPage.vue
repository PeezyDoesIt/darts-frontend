<template>
  <div class="page">
    <div class="drip-bar" />
    <div class="page-header">
      <button v-ripple class="btn btn-outline btn-sm" @click="router.back()">← Back</button>
      <h2 class="page-title display">{{ editingId ? 'EDIT PLAYER' : 'NEW PLAYER' }}</h2>
      <button v-if="editingId" v-ripple class="btn btn-outline btn-sm" @click="resetForm">+ New Player</button>
      <button v-ripple class="btn btn-spray btn-lg" :disabled="!name.trim()" @click="save">{{ editingId ? 'Save Changes' : 'Save Player' }}</button>
    </div>

    <div class="setup-body">
      <div class="setup-form-scroll">
        <div class="setup-form">
          <div class="field">
            <label class="label">Name</label>
            <input
              v-model="name"
              class="name-input"
              placeholder="Enter name..."
              maxlength="20"
              autocomplete="off"
              autocorrect="off"
              spellcheck="false"
            />
          </div>

          <div class="field">
            <label class="label">Background</label>
            <div class="bg-tabs">
              <button v-ripple class="tab" :class="{ active: bgMode === 'theme' }" @click="bgMode = 'theme'">Themes</button>
              <button v-ripple class="tab" :class="{ active: bgMode === 'image' }" @click="bgMode = 'image'">Upload Image</button>
            </div>
            <div v-if="bgMode === 'theme'" class="theme-grid">
              <button v-for="t in PLAYER_THEMES" :key="String(t.value)" v-ripple
                class="theme-swatch" :class="{ active: playerBackground === t.value }"
                :style="t.value ? { background: t.value } : {}"
                @click="playerBackground = t.value ?? null; bgImagePreview = null">
                <span v-if="!t.value" class="theme-none">✕</span>
                <span v-if="playerBackground === t.value && t.value" class="theme-check">✓</span>
                <span class="theme-label">{{ t.label }}</span>
              </button>
            </div>
            <div v-else class="photo-area">
              <div class="bg-preview" :style="bgPreviewStyle">
                <span v-if="!bgImagePreview" style="font-size:32px;opacity:0.5">🖼️</span>
              </div>
              <div style="display:flex;gap:10px;flex-wrap:wrap;align-items:center">
                <label v-ripple class="btn btn-spray btn-lg" style="cursor:pointer;position:relative;overflow:hidden">
                  📁 Choose File
                  <input type="file" accept="image/*" style="display:none" @change="onBgFileChange" />
                </label>
                <button v-if="bgImagePreview" v-ripple class="btn btn-outline btn-sm" @click="bgImagePreview = null; playerBackground = null">Clear</button>
              </div>
            </div>
          </div>

          <div class="field">
            <label class="label">Avatar</label>
            <div class="avatar-tabs">
              <button v-ripple class="tab" :class="{ active: avatarMode === 'emoji' }" @click="avatarMode = 'emoji'">Emoji</button>
              <button v-ripple class="tab" :class="{ active: avatarMode === 'photo' }" @click="avatarMode = 'photo'">Photo</button>
            </div>
            <div v-if="avatarMode === 'emoji'" class="emoji-grid">
              <button v-ripple class="emoji-btn emoji-none-btn" :class="{ active: avatarUrl === null }" @click="avatarUrl = null" title="No emoji">✕</button>
              <button v-for="e in PRESET_AVATARS" :key="e" v-ripple class="emoji-btn" :class="{ active: avatarUrl === e }" @click="avatarUrl = e">{{ e }}</button>
            </div>
            <div v-else class="photo-area">
              <div class="photo-preview" :style="{ background: color, boxShadow: `0 0 20px ${color}60` }">
                <img v-if="photoPreview" :src="photoPreview" alt="avatar" />
                <span v-else style="font-size:40px">📷</span>
              </div>
              <div style="display:flex;gap:10px;flex-wrap:wrap">
                <button v-ripple class="btn btn-spray btn-lg" @click="cameraOpen = true">📷 Open Camera</button>
                <button v-if="photoPreview" v-ripple class="btn btn-outline btn-sm" @click="photoPreview = null; avatarUrl = PRESET_AVATARS[0]!">Clear</button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div class="setup-right">
        <div class="preview-card" :style="previewCardStyle">
          <div class="preview-avatar" :style="{ background: `rgba(0,0,0,0.3)`, border: `3px solid rgba(255,255,255,0.3)` }">
            <img v-if="photoPreview && avatarMode === 'photo'" :src="photoPreview" alt="" />
            <span v-else>{{ avatarUrl }}</span>
          </div>
          <span class="preview-name">{{ name || 'Player Name' }}</span>
        </div>

        <div class="existing-section">
          <span class="label">Existing Players</span>
          <div class="existing-scroll">
            <div class="existing-list">
              <div v-for="p in playersStore.players" :key="p.id" v-ripple class="existing-row" @click="loadPlayer(p)">
                <div class="roster-avatar" :style="{ background: p.color, boxShadow: `0 0 8px ${p.color}60` }">{{ p.avatarUrl ?? '🎯' }}</div>
                <div class="existing-info">
                  <span>{{ p.name }}</span>
                  <span style="font-size:12px;color:var(--text-muted)">{{ p.wins }}W · {{ p.gamesPlayed }}G</span>
                </div>
                <button v-ripple class="btn btn-sm btn-danger" @click.stop="playersStore.deletePlayer(p.id)">✕</button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Camera dialog -->
    <q-dialog v-model="cameraOpen" @hide="closeCamera">
      <q-card dark class="camera-card">
        <q-card-section class="camera-header">
          <span class="display" style="font-size:20px;letter-spacing:0.1em">TAKE A PHOTO</span>
          <button v-ripple class="btn btn-sm btn-surface" @click="cameraOpen = false">✕ Close</button>
        </q-card-section>
        <video ref="videoEl" autoplay playsinline class="camera-feed" />
        <canvas ref="canvasEl" style="display:none" />
        <q-card-actions align="center" class="camera-footer">
          <button v-ripple class="btn btn-spray btn-xl" @click="capturePhoto">📸 Capture</button>
        </q-card-actions>
      </q-card>
    </q-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { usePlayersStore } from '../stores/players'
import { useGameStore } from '../stores/game'
import { PRESET_AVATARS, PLAYER_THEMES, type Player } from '../types/index'

const router = useRouter()
const route = useRoute()
const playersStore = usePlayersStore()
const gameStore = useGameStore()

const editingId = ref<string | null>(null)
const name = ref('')
const color = ref<string>('#ff2d78')
const avatarUrl = ref<string | null>(PRESET_AVATARS[0]!)
const avatarMode = ref<'emoji' | 'photo'>('emoji')
const photoPreview = ref<string | null>(null)
const cameraOpen = ref(false)
const videoEl = ref<HTMLVideoElement | null>(null)
const canvasEl = ref<HTMLCanvasElement | null>(null)
let stream: MediaStream | null = null

const bgMode = ref<'theme' | 'image'>('theme')
const playerBackground = ref<string | null>(null)
const bgImagePreview = ref<string | null>(null)

const bgPreviewStyle = computed(() => {
  if (bgImagePreview.value) return { backgroundImage: `url(${bgImagePreview.value})`, backgroundSize: 'cover', backgroundPosition: 'center' }
  return { background: 'rgba(255,255,255,0.05)' }
})
const previewCardStyle = computed(() => {
  if (bgImagePreview.value) return { backgroundImage: `url(${bgImagePreview.value})`, backgroundSize: 'cover', backgroundPosition: 'center', boxShadow: `0 0 40px ${color.value}40` }
  if (playerBackground.value) return { background: playerBackground.value, boxShadow: `0 0 40px ${color.value}40` }
  return { background: `linear-gradient(135deg, ${color.value}cc, ${color.value}66)`, boxShadow: `0 0 40px ${color.value}40` }
})

function onBgFileChange(e: Event) {
  const file = (e.target as HTMLInputElement).files?.[0]
  if (!file) return
  const reader = new FileReader()
  reader.onload = ev => { bgImagePreview.value = ev.target?.result as string; playerBackground.value = ev.target?.result as string }
  reader.readAsDataURL(file)
}

// Start camera when dialog opens
watch(cameraOpen, async (open) => {
  if (!open) return
  await new Promise(r => setTimeout(r, 80))
  try {
    stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' }, audio: false })
    if (videoEl.value) videoEl.value.srcObject = stream
  } catch {
    alert('Could not access camera.')
    cameraOpen.value = false
  }
})

function capturePhoto() {
  if (!videoEl.value || !canvasEl.value) return
  const v = videoEl.value, c = canvasEl.value
  c.width = v.videoWidth; c.height = v.videoHeight
  c.getContext('2d')!.drawImage(v, 0, 0)
  photoPreview.value = c.toDataURL('image/jpeg', 0.85)
  avatarUrl.value = photoPreview.value
  cameraOpen.value = false
}
function closeCamera() {
  stream?.getTracks().forEach(t => t.stop())
  stream = null
}
function resetForm() {
  editingId.value = null; name.value = ''; color.value = '#ff2d78'; avatarUrl.value = PRESET_AVATARS[0]!
  photoPreview.value = null; avatarMode.value = 'emoji'; playerBackground.value = null; bgImagePreview.value = null; bgMode.value = 'theme'
}
function loadPlayer(p: Player) {
  editingId.value = p.id; name.value = p.name; color.value = p.color
  if (p.avatarUrl?.startsWith('data:')) { avatarMode.value = 'photo'; photoPreview.value = p.avatarUrl }
  else { avatarMode.value = 'emoji'; avatarUrl.value = p.avatarUrl ?? PRESET_AVATARS[0]! }
  playerBackground.value = p.playerBackground ?? null
  if (p.playerBackground?.startsWith('data:')) { bgMode.value = 'image'; bgImagePreview.value = p.playerBackground }
  else { bgMode.value = 'theme'; bgImagePreview.value = null }
}
function save() {
  if (!name.value.trim()) return
  const finalAvatar = avatarMode.value === 'photo' ? (photoPreview.value ?? PRESET_AVATARS[0]!) : avatarUrl.value
  const bg = playerBackground.value
  if (editingId.value) {
    playersStore.updatePlayer(editingId.value, { name: name.value.trim(), color: color.value, avatarUrl: finalAvatar, playerBackground: bg })
    editingId.value = null
  } else {
    const newPlayer = playersStore.addPlayer({ name: name.value.trim(), color: color.value, avatarUrl: finalAvatar, playerBackground: bg })
    if (route.query.addToGame === 'true' && gameStore.game) {
      gameStore.addPlayerToGame(newPlayer)
      name.value = ''; color.value = '#ff2d78'; avatarUrl.value = PRESET_AVATARS[0]!
      photoPreview.value = null; avatarMode.value = 'emoji'; playerBackground.value = null; bgImagePreview.value = null
      router.push('/game')
      return
    }
  }
  name.value = ''; color.value = '#ff2d78'; avatarUrl.value = PRESET_AVATARS[0]!
  photoPreview.value = null; avatarMode.value = 'emoji'; playerBackground.value = null; bgImagePreview.value = null
  router.back()
}
</script>

<style scoped>
.page { display: flex; flex-direction: column; width: 100vw; height: 100vh; height: 100dvh; overflow: hidden; }
.name-input { width: 100%; background: rgba(255,255,255,0.07); border: 1px solid rgba(255,255,255,0.2); border-radius: 6px; padding: 12px 16px; color: #fff; font-size: 20px; font-family: inherit; outline: none; box-sizing: border-box; -webkit-appearance: none; }
.name-input:focus { border-color: var(--pink); }
.name-input::placeholder { color: rgba(255,255,255,0.35); }
.page-header {
  display: flex; align-items: center; justify-content: space-between; padding: 18px 32px;
  padding-top: calc(18px + env(safe-area-inset-top));
  border-bottom: 1px solid rgba(255,255,255,0.08);
  background: rgba(255,255,255,0.03); backdrop-filter: blur(20px); -webkit-backdrop-filter: blur(20px); flex-shrink: 0;
}
.page-title { font-size: 26px; letter-spacing: 0.1em; background: linear-gradient(135deg, var(--blue), var(--purple)); -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text; }

.setup-body { flex: 1; display: flex; overflow: hidden; min-height: 0; }
.setup-form-scroll { flex: 1; min-height: 0; overflow-y: auto; border-right: 1px solid rgba(255,255,255,0.06); }
.setup-form { padding: 28px; display: flex; flex-direction: column; gap: 24px; }

.field { display: flex; flex-direction: column; gap: 10px; }

.bg-tabs, .avatar-tabs { display: flex; gap: 8px; }
.tab { padding: 8px 20px; border-radius: 6px; border: 1px solid rgba(255,255,255,0.1); background: rgba(255,255,255,0.04); color: var(--text-muted); font-size: 13px; font-weight: 700; cursor: pointer; transition: all 0.15s; position: relative; overflow: hidden; }
.tab.active { border-color: var(--pink); color: var(--pink); background: rgba(255,45,120,0.1); }

.theme-grid { display: flex; flex-wrap: wrap; gap: 8px; }
.theme-swatch { width: 72px; height: 52px; border-radius: 8px; border: 2px solid rgba(255,255,255,0.1); cursor: pointer; position: relative; overflow: hidden; transition: transform 0.15s, border-color 0.15s; background: rgba(255,255,255,0.06); display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 2px; }
.theme-swatch:hover { transform: scale(1.05); }
.theme-swatch.active { border-color: #fff; transform: scale(1.08); }
.theme-none { font-size: 16px; color: rgba(255,255,255,0.3); }
.theme-check { position: absolute; top: 4px; right: 5px; font-size: 11px; color: #fff; font-weight: 900; }
.theme-label { font-size: 9px; font-weight: 800; letter-spacing: 0.08em; text-transform: uppercase; color: rgba(255,255,255,0.8); text-shadow: 0 1px 4px rgba(0,0,0,0.8); }
.bg-preview { width: 80px; height: 80px; border-radius: 8px; border: 1px solid rgba(255,255,255,0.1); display: flex; align-items: center; justify-content: center; flex-shrink: 0; overflow: hidden; }

.emoji-grid { display: flex; flex-wrap: wrap; gap: 8px; }
.emoji-btn { width: 50px; height: 50px; border-radius: 8px; border: 2px solid rgba(255,255,255,0.08); background: rgba(255,255,255,0.04); font-size: 24px; cursor: pointer; transition: all 0.1s; position: relative; overflow: hidden; }
.emoji-btn:hover { border-color: rgba(255,255,255,0.2); transform: scale(1.1); }
.emoji-btn.active { border-color: var(--pink); box-shadow: 0 0 12px rgba(255,45,120,0.4); }
.emoji-none-btn { color: rgba(255,255,255,0.4); font-size: 18px; font-weight: 700; }

.photo-area { display: flex; align-items: center; gap: 20px; flex-wrap: wrap; }
.photo-preview { width: 80px; height: 80px; border-radius: 50%; display: flex; align-items: center; justify-content: center; overflow: hidden; flex-shrink: 0; }
.photo-preview img { width: 100%; height: 100%; object-fit: cover; }

.setup-right { width: 300px; display: flex; flex-direction: column; gap: 20px; padding: 28px; overflow: hidden; flex-shrink: 0; }
.preview-card { border-radius: 16px; padding: 28px; display: flex; flex-direction: column; align-items: center; gap: 14px; backdrop-filter: blur(12px); transition: box-shadow 0.3s; }
.preview-avatar { width: 96px; height: 96px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 48px; overflow: hidden; }
.preview-avatar img { width: 100%; height: 100%; object-fit: cover; }
.preview-name { font-size: 22px; font-weight: 900; color: #fff; text-shadow: 0 2px 8px rgba(0,0,0,0.4); font-family: var(--font-display); letter-spacing: 0.05em; }

.existing-section { display: flex; flex-direction: column; gap: 10px; flex: 1; overflow: hidden; }
.existing-scroll { flex: 1; min-height: 0; overflow-y: auto; }
.existing-list { display: flex; flex-direction: column; gap: 6px; }
.existing-row { display: flex; align-items: center; gap: 10px; padding: 10px 12px; background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.08); border-radius: 8px; cursor: pointer; transition: all 0.15s; position: relative; overflow: hidden; }
.existing-row:hover { background: rgba(255,255,255,0.07); }
.existing-info { flex: 1; display: flex; flex-direction: column; gap: 2px; font-size: 14px; font-weight: 700; }
.roster-avatar { width: 34px; height: 34px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 17px; flex-shrink: 0; }

/* Camera dialog */
.camera-card { background: #1e1e1e; width: 560px; max-width: 95vw; border: 1px solid rgba(255,255,255,0.12); border-radius: 16px; overflow: hidden; }
.camera-header { display: flex; align-items: center; justify-content: space-between; }
.camera-feed { width: 100%; aspect-ratio: 4/3; object-fit: cover; background: #000; display: block; }
.camera-footer { padding: 20px; border-top: 1px solid rgba(255,255,255,0.08); }

@media (max-width: 768px) {
  .page { height: auto; min-height: 100vh; min-height: 100dvh; overflow: auto; }
  .setup-body { flex-direction: column; overflow: visible; height: auto; }
  .setup-form-scroll { flex: none; overflow-y: visible; border-right: none; border-bottom: 1px solid rgba(255,255,255,0.06); }
  .setup-right { width: 100%; padding: 20px; padding-bottom: calc(20px + env(safe-area-inset-bottom)); }
  .page-header { padding: 14px 20px; padding-top: calc(14px + env(safe-area-inset-top)); }
  .existing-scroll { flex: none; height: auto; }
}
</style>
