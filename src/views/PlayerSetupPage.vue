<template>
  <div class="page">
    <div class="drip-bar" />
    <div class="page-header">
      <button v-ripple class="btn btn-outline btn-sm" @click="router.back()">← Back</button>
      <h2 class="page-title display">{{ editingId ? 'EDIT PLAYER' : 'NEW PLAYER' }}</h2>
      <button v-if="editingId" v-ripple class="btn btn-outline btn-sm" @click="resetForm">+ New Player</button>
      <button v-ripple class="btn btn-spray btn-lg" :disabled="!name.trim() || saving" @click="save">{{ editingId ? 'Save Changes' : 'Save Player' }}</button>
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
            <label class="label">Player Color</label>
            <div class="color-palette-grid">
              <button
                v-for="c in COLOR_PALETTE" :key="c.value"
                class="palette-swatch"
                :class="{ active: color.toLowerCase() === c.value.toLowerCase() }"
                :style="{ background: c.value }"
                @click="color = c.value"
              >
                <span class="palette-name">{{ c.name }}</span>
                <span v-if="color.toLowerCase() === c.value.toLowerCase()" class="palette-check">✓</span>
              </button>
            </div>
            <span v-if="colorConflict" class="color-conflict">⚠ Already used by {{ colorConflict }}</span>
          </div>

          <div class="field">
            <label class="label">Avatar</label>
            <div class="photo-area">
              <div class="photo-preview" :style="{ background: color, boxShadow: `0 0 20px ${color}60` }">
                <img v-if="photoPreview" :src="photoPreview" alt="avatar" />
              </div>
              <div style="display:flex;gap:10px;flex-wrap:wrap;align-items:center">
                <button v-ripple class="btn btn-spray btn-lg" @click="cameraOpen = true">Camera</button>
                <label v-ripple class="btn btn-outline btn-lg" style="cursor:pointer;position:relative;overflow:hidden">
                  Upload
                  <input type="file" accept="image/*" style="display:none" @change="onAvatarFileChange" />
                </label>
                <button v-if="photoPreview" v-ripple class="btn btn-outline btn-sm" @click="photoPreview = null; avatarUrl = null">Clear</button>
              </div>
            </div>
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
                <span v-if="!bgImagePreview" style="font-size:13px;opacity:0.4;letter-spacing:0.08em">PHOTO</span>
              </div>
              <div style="display:flex;gap:10px;flex-wrap:wrap;align-items:center">
                <label v-ripple class="btn btn-spray btn-lg" style="cursor:pointer;position:relative;overflow:hidden">
                  Choose File
                  <input type="file" accept="image/*" style="display:none" @change="onBgFileChange" />
                </label>
                <button v-if="bgImagePreview" v-ripple class="btn btn-outline btn-sm" @click="bgImagePreview = null; playerBackground = null">Clear</button>
              </div>
              <div v-if="bgImagePreview" class="bg-fit-controls">
                <div class="bg-fit-row">
                  <span class="bg-fit-label">Size</span>
                  <div class="bg-fit-btns">
                    <button v-ripple class="bg-fit-btn" :class="{ active: bgSize === 'cover' || bgSize === null }" @click="bgSize = 'cover'">Cover</button>
                    <button v-ripple class="bg-fit-btn" :class="{ active: bgSize === 'contain' }" @click="bgSize = 'contain'">Contain</button>
                  </div>
                </div>
                <div v-if="bgSize === 'contain'" class="bg-fit-row">
                  <span class="bg-fit-label">Fill</span>
                  <div class="bg-fit-btns">
                    <button v-ripple class="bg-fit-btn" :class="{ active: bgFill === 'black' || bgFill === null }" @click="bgFill = 'black'">Black</button>
                    <button v-ripple class="bg-fit-btn" :class="{ active: bgFill === 'blur' }" @click="bgFill = 'blur'">Blur</button>
                  </div>
                </div>
                <div class="bg-fit-row">
                  <span class="bg-fit-label">Position</span>
                  <div class="bg-fit-btns">
                    <button v-ripple class="bg-fit-btn" :class="{ active: bgPosition === 'center' || bgPosition === null }" @click="bgPosition = 'center'">Center</button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div class="field">
            <label class="label">Cricket: Closed Targets</label>
            <p class="field-hint">How completed targets appear on your turn. Overrides the game setting.</p>
            <div class="ct-player-opts">
              <button
                v-for="opt in cricketTargetDisplayOpts" :key="String(opt.value)"
                v-ripple class="ct-player-btn"
                :class="{ active: cricketTargetDisplay === opt.value }"
                @click="cricketTargetDisplay = opt.value"
              >
                <span class="ct-player-label">{{ opt.label }}</span>
                <span class="ct-player-sub">{{ opt.sub }}</span>
              </button>
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
              <div v-for="p in sortedPlayers" :key="p.id" class="existing-row" :class="{ pinned: p.pinned, editing: editingId === p.id }">
                <div class="roster-avatar" :style="{ background: p.color, boxShadow: `0 0 8px ${p.color}60` }">
                  <img v-if="isPhoto(p.avatarUrl)" :src="p.avatarUrl!" alt="" style="width:100%;height:100%;object-fit:cover;border-radius:50%" />
                  <span v-else>{{ p.avatarUrl ?? '🎯' }}</span>
                </div>
                <div class="existing-info">
                  <span>{{ p.name }}</span>
                  <span style="font-size:12px;color:var(--text-muted)">{{ p.wins }}W · {{ p.gamesPlayed }}G</span>
                </div>
                <button v-ripple class="btn btn-sm edit-btn" :class="{ active: editingId === p.id }" @click.stop="loadPlayer(p)" title="Edit">✏️</button>
                <button v-ripple class="btn btn-sm pin-btn" :class="{ active: p.pinned }" :title="p.pinned ? 'Unpin' : 'Pin'" @click.stop="playersStore.updatePlayer(p.id, { pinned: !p.pinned })">📌</button>
                <button v-ripple class="btn btn-sm btn-danger" @click.stop="confirmDelete(p)">🗑</button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Delete confirm dialog -->
    <transition name="fade">
      <div v-if="deleteTarget" class="confirm-overlay" @click.self="deleteTarget = null">
        <div class="confirm-panel">
          <div class="confirm-avatar" :style="{ background: deleteTarget.color }">
            <img v-if="isPhoto(deleteTarget.avatarUrl)" :src="deleteTarget.avatarUrl!" alt="" style="width:100%;height:100%;object-fit:cover" />
            <span v-else>{{ deleteTarget.avatarUrl ?? '🎯' }}</span>
          </div>
          <div class="confirm-name">{{ deleteTarget.name }}</div>
          <p v-if="deleteTarget.pinned" class="confirm-msg pinned-warn">📌 This player is pinned. Unpin them first to protect them from accidental deletion.</p>
          <p class="confirm-msg">Delete this player? Their stats will be gone forever.</p>
          <div class="confirm-btns">
            <button v-ripple class="btn btn-outline btn-lg" @click="deleteTarget = null">Cancel</button>
            <button v-ripple class="btn btn-danger btn-lg" @click="doDelete">Delete</button>
          </div>
        </div>
      </div>
    </transition>

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
import { PRESET_AVATARS, PLAYER_THEMES, TARGET_LABEL_COLORS, type Player } from '../types/index'

const PLAYER_COLOR_PALETTE = [
  '#ff2d78', '#00d4ff', '#aaff00', '#ff6b1a',
  '#bf5fff', '#ffd700', '#ff4444', '#00ffaa',
]

const COLOR_PALETTE = [
  // Blacks & dark neutrals
  { name: 'Black',       value: '#0a0a0a' },
  { name: 'Onyx',        value: '#353839' },
  { name: 'Charcoal',    value: '#36454f' },
  { name: 'Graphite',    value: '#555555' },
  { name: 'Slate',       value: '#708090' },
  { name: 'Silver',      value: '#c0c0c0' },
  // Deep blues
  { name: 'Midnight',    value: '#191970' },
  { name: 'Navy',        value: '#001f5b' },
  { name: 'Marine',      value: '#00308f' },
  { name: 'Prussian',    value: '#003153' },
  { name: 'Indigo',      value: '#4b0082' },
  { name: 'Ultramarine', value: '#3f00ff' },
  // Blues
  { name: 'Royal Blue',  value: '#4169e1' },
  { name: 'Cobalt',      value: '#0047ab' },
  { name: 'Sapphire',    value: '#0f52ba' },
  { name: 'Steel Blue',  value: '#4682b4' },
  { name: 'Cornflower',  value: '#6495ed' },
  { name: 'Cerulean',    value: '#007ba7' },
  // Light blues
  { name: 'Sky',         value: '#87ceeb' },
  { name: 'Powder Blue', value: '#b0e0e6' },
  { name: 'Baby Blue',   value: '#89cff0' },
  { name: "Robin's Egg", value: '#1fcecb' },
  { name: 'Ice',         value: '#d0e8f5' },
  { name: 'Cyan',        value: '#00bcd4' },
  // Teals & aquas
  { name: 'Teal',        value: '#008080' },
  { name: 'Sea Blue',    value: '#006994' },
  { name: 'Aquamarine',  value: '#00b5cc' },
  { name: 'Seafoam',     value: '#93e9be' },
  { name: 'Jade',        value: '#00a86b' },
  { name: 'Mint',        value: '#98ff98' },
  // Greens
  { name: 'Evergreen',   value: '#05472a' },
  { name: 'Racing',      value: '#0e3b1a' },
  { name: 'Forest',      value: '#228b22' },
  { name: 'Hunter',      value: '#355e3b' },
  { name: 'Green',       value: '#008000' },
  { name: 'Emerald',     value: '#50c878' },
  // Light greens
  { name: 'Kelly',       value: '#4cbb17' },
  { name: 'Lime',        value: '#32cd32' },
  { name: 'Spring',      value: '#00ff7f' },
  { name: 'Chartreuse',  value: '#7fff00' },
  { name: 'Pear',        value: '#d1e231' },
  { name: 'Cream',       value: '#fffdd0' },
  // Yellows & golds
  { name: 'Canary',      value: '#fff44f' },
  { name: 'Yellow',      value: '#ffff00' },
  { name: 'Gold',        value: '#ffd700' },
  { name: 'Amber',       value: '#ffbf00' },
  { name: 'Ochre',       value: '#cc7722' },
  { name: 'Tan',         value: '#d2b48c' },
  // Oranges
  { name: 'Peach',       value: '#ffcba4' },
  { name: 'Coral',       value: '#ff7f50' },
  { name: 'Orange',      value: '#ff6600' },
  { name: 'Burnt Org',   value: '#cc5500' },
  { name: 'Copper',      value: '#b87333' },
  { name: 'Rust',        value: '#b7410e' },
  // Reds
  { name: 'Salmon',      value: '#fa8072' },
  { name: 'Scarlet',     value: '#ff2400' },
  { name: 'Red',         value: '#cc0000' },
  { name: 'Crimson',     value: '#dc143c' },
  { name: 'Brick',       value: '#cb4154' },
  { name: 'Carmine',     value: '#960018' },
  // Dark reds & browns
  { name: 'Ruby',        value: '#9b111e' },
  { name: 'Maroon',      value: '#800000' },
  { name: 'Burgundy',    value: '#800020' },
  { name: 'Wine',        value: '#722f37' },
  { name: 'Chestnut',    value: '#954535' },
  { name: 'Mahogany',    value: '#c04000' },
  // Browns
  { name: 'Sienna',      value: '#a0522d' },
  { name: 'Chocolate',   value: '#7b3f00' },
  { name: 'Hickory',     value: '#6b3a2a' },
  { name: 'Sepia',       value: '#704214' },
  { name: 'Roast',       value: '#4b2612' },
  { name: 'Espresso',    value: '#2c1503' },
  // Purples
  { name: 'Eggplant',    value: '#380028' },
  { name: 'Grape',       value: '#6f2da8' },
  { name: 'Purple',      value: '#800080' },
  { name: 'Royal Purp',  value: '#7851a9' },
  { name: 'Violet',      value: '#8f00ff' },
  { name: 'Mulberry',    value: '#c54b8c' },
  // Lavenders & pinks
  { name: 'Orchid',      value: '#da70d6' },
  { name: 'Lavender',    value: '#9370db' },
  { name: 'Thistle',     value: '#d8bfd8' },
  { name: 'Plum',        value: '#dda0dd' },
  { name: 'Magenta',     value: '#ff00ff' },
  { name: 'Blush',       value: '#de5d83' },
  // Pinks
  { name: 'Raspberry',   value: '#e30b5c' },
  { name: 'Rose',        value: '#ff007f' },
  { name: 'Hot Pink',    value: '#ff69b4' },
  { name: 'Candy Pink',  value: '#ff63b8' },
  { name: 'Baby Pink',   value: '#f4c2c2' },
  { name: 'White',       value: '#f0f0f0' },
]

const router = useRouter()
const route = useRoute()
const playersStore = usePlayersStore()
const gameStore = useGameStore()

const sortedPlayers = computed(() =>
  [...playersStore.players].sort((a, b) => Number(b.pinned) - Number(a.pinned))
)

function nextAvailableColor(excludeId: string | null = null): string {
  const used = new Set(
    playersStore.players
      .filter(p => p.id !== excludeId)
      .map(p => p.color.toLowerCase())
  )
  return PLAYER_COLOR_PALETTE.find(c => !used.has(c.toLowerCase())) ?? PLAYER_COLOR_PALETTE[0]!
}

const editingId = ref<string | null>(null)
const name = ref('')
const color = ref<string>(nextAvailableColor())
const colorConflict = computed(() => {
  const match = playersStore.players.find(
    p => p.id !== editingId.value && p.color.toLowerCase() === color.value.toLowerCase()
  )
  return match?.name ?? null
})
const avatarUrl = ref<string | null>(null)
const avatarMode = ref<'emoji' | 'photo'>('photo')
const photoPreview = ref<string | null>(null)
const cameraOpen = ref(false)
const videoEl = ref<HTMLVideoElement | null>(null)
const canvasEl = ref<HTMLCanvasElement | null>(null)
let stream: MediaStream | null = null

function isPhoto(url: string | null): boolean { return !!(url?.startsWith('data:') || url?.startsWith('http')) }
const deleteTarget = ref<Player | null>(null)
function confirmDelete(p: Player) { deleteTarget.value = p }
function doDelete() {
  if (!deleteTarget.value) return
  if (editingId.value === deleteTarget.value.id) resetForm()
  playersStore.deletePlayer(deleteTarget.value.id)
  deleteTarget.value = null
}

const bgMode = ref<'theme' | 'image'>('theme')
const playerBackground = ref<string | null>(null)
const bgImagePreview = ref<string | null>(null)
const bgSize = ref<'cover' | 'contain' | null>(null)
const bgPosition = ref<'top' | 'center' | 'bottom' | null>(null)
const bgFill = ref<'black' | 'blur' | null>(null)
const targetLabelColor = ref<string | null>(null)
const cricketTargetDisplay = ref<'show' | 'hide' | 'fade' | 'strike' | null>(null)

const cricketTargetDisplayOpts: { value: 'show' | 'hide' | 'fade' | 'strike' | null; label: string; sub: string }[] = [
  { value: null,     label: 'Default', sub: 'Use game setting' },
  { value: 'show',   label: 'Normal',  sub: 'Standard opacity' },
  { value: 'fade',   label: 'Fade',    sub: 'Ghost out' },
  { value: 'strike', label: 'Strike',  sub: 'Line through' },
  { value: 'hide',   label: 'Hide',    sub: 'Remove tile' },
]

const bgPreviewStyle = computed(() => {
  if (bgImagePreview.value) {
    const isBlur = bgFill.value === 'blur' && bgSize.value === 'contain'
    return { backgroundImage: `url(${bgImagePreview.value})`, backgroundSize: bgSize.value ?? 'cover', backgroundPosition: bgPosition.value ?? 'center', backgroundRepeat: 'no-repeat', backgroundColor: isBlur ? 'transparent' : '#000' }
  }
  return { background: 'rgba(255,255,255,0.05)' }
})
const previewCardStyle = computed(() => {
  if (bgImagePreview.value) {
    const isBlur = bgFill.value === 'blur' && bgSize.value === 'contain'
    return { backgroundImage: `url(${bgImagePreview.value})`, backgroundSize: bgSize.value ?? 'cover', backgroundPosition: bgPosition.value ?? 'center', backgroundRepeat: 'no-repeat', backgroundColor: isBlur ? 'transparent' : '#000', boxShadow: `0 0 40px ${color.value}40` }
  }
  if (playerBackground.value) return { background: playerBackground.value, boxShadow: `0 0 40px ${color.value}40` }
  return { background: `linear-gradient(135deg, ${color.value}cc, ${color.value}66)`, boxShadow: `0 0 40px ${color.value}40` }
})

function onAvatarFileChange(e: Event) {
  const file = (e.target as HTMLInputElement).files?.[0]
  if (!file) return
  const reader = new FileReader()
  reader.onload = ev => {
    photoPreview.value = ev.target?.result as string
    avatarUrl.value = ev.target?.result as string
  }
  reader.readAsDataURL(file)
}

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
  editingId.value = null; name.value = ''; color.value = nextAvailableColor(); avatarUrl.value = null
  photoPreview.value = null; playerBackground.value = null; bgImagePreview.value = null; bgMode.value = 'theme'; bgSize.value = null; bgPosition.value = null; bgFill.value = null; targetLabelColor.value = null; cricketTargetDisplay.value = null; saving.value = false
}
function loadPlayer(p: Player) {
  editingId.value = p.id; name.value = p.name; color.value = p.color
  photoPreview.value = p.avatarUrl?.startsWith('data:') || p.avatarUrl?.startsWith('http') ? p.avatarUrl : null
  avatarUrl.value = photoPreview.value
  playerBackground.value = p.playerBackground ?? null
  if (p.playerBackground?.startsWith('data:')) { bgMode.value = 'image'; bgImagePreview.value = p.playerBackground }
  else { bgMode.value = 'theme'; bgImagePreview.value = null }
  bgSize.value = p.playerBackgroundSize ?? null
  bgPosition.value = p.playerBackgroundPosition ?? null
  bgFill.value = p.playerBackgroundFill ?? null
  targetLabelColor.value = p.targetLabelColor ?? null
  cricketTargetDisplay.value = p.cricketTargetDisplay ?? null
}
const saving = ref(false)
function save() {
  if (!name.value.trim() || saving.value) return
  saving.value = true
  const finalAvatar = photoPreview.value ?? null
  const bg = playerBackground.value
  const tlc = targetLabelColor.value
  const ctd = cricketTargetDisplay.value
  if (editingId.value) {
    playersStore.updatePlayer(editingId.value, { name: name.value.trim(), color: color.value, avatarUrl: finalAvatar, playerBackground: bg, playerBackgroundSize: bgSize.value, playerBackgroundPosition: bgPosition.value, playerBackgroundFill: bgFill.value, targetLabelColor: tlc, cricketTargetDisplay: ctd })
    editingId.value = null
  } else {
    const newPlayer = playersStore.addPlayer({ name: name.value.trim(), color: color.value, avatarUrl: finalAvatar, playerBackground: bg, playerBackgroundSize: bgSize.value, playerBackgroundPosition: bgPosition.value, playerBackgroundFill: bgFill.value, targetLabelColor: tlc, cricketTargetDisplay: ctd, pinned: false })
    if (route.query.addToGame === 'true' && gameStore.game) {
      gameStore.addPlayerToGame(newPlayer)
      resetForm()
      router.push('/game')
      return
    }
  }
  resetForm()
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
.setup-form-scroll { flex: 1; min-height: 0; overflow-y: auto; -webkit-overflow-scrolling: touch; border-right: 1px solid rgba(255,255,255,0.06); }
.setup-form { padding: 28px; display: flex; flex-direction: column; gap: 24px; }
.setup-form .label { color: #ffffff; font-weight: 800; }
.btn-outline { color: #ffffff !important; font-weight: 700 !important; border: 2px solid #ffffff !important; }
.btn-outline:hover { color: var(--pink) !important; border-color: var(--pink) !important; }

.field { display: flex; flex-direction: column; gap: 10px; }

.bg-tabs, .avatar-tabs { display: flex; gap: 8px; }
.tab { padding: 8px 20px; border-radius: 6px; border: 2px solid #ffffff; background: transparent; color: #ffffff; font-size: 13px; font-weight: 700; cursor: pointer; transition: all 0.15s; position: relative; overflow: hidden; }
.tab:hover { border-color: var(--pink); color: var(--pink); }
.tab.active { border-color: var(--pink); color: var(--pink); background: rgba(255,45,120,0.1); }

.theme-grid { display: flex; flex-wrap: wrap; gap: 8px; touch-action: pan-y; }
.theme-swatch { width: 72px; height: 52px; border-radius: 8px; border: 2px solid rgba(255,255,255,0.1); cursor: pointer; position: relative; overflow: hidden; transition: transform 0.15s, border-color 0.15s; background: rgba(255,255,255,0.06); display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 2px; touch-action: pan-y; }
.theme-swatch:hover { transform: scale(1.05); }
.theme-swatch.active { border-color: #fff; transform: scale(1.08); }
.theme-none { font-size: 16px; color: rgba(255,255,255,0.3); }
.theme-check { position: absolute; top: 4px; right: 5px; font-size: 11px; color: #fff; font-weight: 900; }
.theme-label { font-size: 9px; font-weight: 800; letter-spacing: 0.08em; text-transform: uppercase; color: rgba(255,255,255,0.8); text-shadow: 0 1px 4px rgba(0,0,0,0.8); }
.bg-preview { width: 80px; height: 80px; border-radius: 8px; border: 1px solid rgba(255,255,255,0.1); display: flex; align-items: center; justify-content: center; flex-shrink: 0; overflow: hidden; }

.field-hint { font-size: 12px; color: var(--text-muted); margin: 0; line-height: 1.4; }
.color-palette-grid {
  display: grid;
  grid-template-columns: repeat(6, 1fr);
  gap: 3px;
}
.palette-swatch {
  aspect-ratio: 1.5;
  border-radius: 5px;
  border: 2px solid transparent;
  cursor: pointer;
  position: relative;
  display: flex;
  align-items: flex-end;
  justify-content: center;
  padding: 2px;
  transition: transform 0.1s, border-color 0.1s, box-shadow 0.1s;
  overflow: hidden;
}
.palette-swatch:hover { transform: scale(1.08); border-color: rgba(255,255,255,0.5); z-index: 1; }
.palette-swatch.active {
  border-color: #ffffff;
  transform: scale(1.08);
  box-shadow: 0 0 0 2px rgba(255,255,255,0.6), 0 0 10px rgba(255,255,255,0.3);
  z-index: 2;
}
.palette-name {
  font-size: 7px;
  font-weight: 800;
  color: #fff;
  text-shadow: 0 1px 4px rgba(0,0,0,1), 0 0 6px rgba(0,0,0,0.8);
  letter-spacing: 0.02em;
  text-align: center;
  line-height: 1.1;
  word-break: break-word;
  pointer-events: none;
}
.palette-check {
  position: absolute;
  top: 2px;
  right: 3px;
  font-size: 9px;
  font-weight: 900;
  color: #fff;
  text-shadow: 0 1px 4px rgba(0,0,0,1);
}
.color-conflict { font-size: 12px; color: #ff4444; font-weight: 700; letter-spacing: 0.03em; margin-top: 2px; }

.emoji-grid { display: flex; flex-wrap: wrap; gap: 8px; touch-action: pan-y; }
.emoji-btn { width: 50px; height: 50px; border-radius: 8px; border: 2px solid rgba(255,255,255,0.08); background: rgba(255,255,255,0.04); font-size: 24px; cursor: pointer; transition: all 0.1s; position: relative; overflow: hidden; touch-action: pan-y; }
.emoji-btn:hover { border-color: rgba(255,255,255,0.2); transform: scale(1.1); }
.emoji-btn.active { border-color: var(--pink); box-shadow: 0 0 12px rgba(255,45,120,0.4); }
.emoji-none-btn { color: rgba(255,255,255,0.4); font-size: 18px; font-weight: 700; }

.photo-area { display: flex; align-items: center; gap: 20px; flex-wrap: wrap; }
.bg-fit-controls { width: 100%; display: flex; flex-direction: column; gap: 8px; padding-top: 8px; border-top: 1px solid rgba(255,255,255,0.08); }
.bg-fit-row { display: flex; align-items: center; gap: 10px; }
.bg-fit-label { font-size: 11px; font-weight: 700; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.1em; min-width: 56px; }
.bg-fit-btns { display: flex; gap: 6px; }
.bg-fit-btn { padding: 5px 14px; border-radius: 6px; border: 1px solid rgba(255,255,255,0.15); background: rgba(255,255,255,0.05); color: var(--text-muted); font-size: 12px; font-weight: 700; cursor: pointer; transition: all 0.15s; position: relative; overflow: hidden; }
.bg-fit-btn:hover { background: rgba(255,255,255,0.1); color: var(--text); }
.bg-fit-btn.active { border-color: var(--pink); background: rgba(255,45,120,0.15); color: var(--pink); }
.photo-preview { width: 80px; height: 80px; border-radius: 50%; display: flex; align-items: center; justify-content: center; overflow: hidden; flex-shrink: 0; }
.photo-preview img { width: 100%; height: 100%; object-fit: cover; }

.setup-right { width: 300px; display: flex; flex-direction: column; gap: 20px; padding: 28px; overflow: hidden; flex-shrink: 0; }
.preview-card { border-radius: 16px; padding: 28px; display: flex; flex-direction: column; align-items: center; gap: 14px; backdrop-filter: blur(12px); transition: box-shadow 0.3s; }
.preview-avatar { width: 96px; height: 96px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 48px; overflow: hidden; }
.preview-avatar img { width: 100%; height: 100%; object-fit: cover; }
.preview-name { font-size: 22px; font-weight: 900; color: #fff; text-shadow: 0 2px 8px rgba(0,0,0,0.4); font-family: var(--font-display); letter-spacing: 0.05em; }

.existing-section { display: flex; flex-direction: column; gap: 10px; flex: 1; overflow: hidden; }
.existing-scroll { flex: 1; min-height: 0; overflow-y: auto; -webkit-overflow-scrolling: touch; overscroll-behavior: contain; }
.existing-list { display: flex; flex-direction: column; gap: 6px; }
.existing-row { display: flex; align-items: center; gap: 10px; padding: 10px 12px; background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.08); border-radius: 8px; cursor: pointer; transition: all 0.15s; position: relative; overflow: hidden; }
.existing-row:hover { background: rgba(255,255,255,0.07); }
.existing-row.pinned { border-color: rgba(245,158,11,0.4); background: rgba(245,158,11,0.06); }
.edit-btn { background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.1); font-size: 14px; padding: 4px 8px; border-radius: 6px; cursor: pointer; transition: all 0.15s; filter: grayscale(1); }
.edit-btn.active { filter: none; border-color: var(--pink); background: rgba(255,45,120,0.15); }
.edit-btn:hover { filter: none; opacity: 0.8; }
.existing-row.editing { border-color: rgba(255,45,120,0.4); background: rgba(255,45,120,0.06); }
.pin-btn { background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.1); color: rgba(255,255,255,0.3); font-size: 14px; padding: 4px 8px; border-radius: 6px; cursor: pointer; transition: all 0.15s; filter: grayscale(1); }
.pin-btn.active { filter: none; border-color: rgba(245,158,11,0.5); background: rgba(245,158,11,0.12); }
.pin-btn:hover { filter: none; opacity: 0.8; }
.existing-info { flex: 1; display: flex; flex-direction: column; gap: 2px; font-size: 14px; font-weight: 700; }
.roster-avatar { width: 34px; height: 34px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 17px; flex-shrink: 0; }

/* Camera dialog */
.camera-card { background: #1e1e1e; width: 560px; max-width: 95vw; border: 1px solid rgba(255,255,255,0.12); border-radius: 16px; overflow: hidden; }
.camera-header { display: flex; align-items: center; justify-content: space-between; }
.camera-feed { width: 100%; aspect-ratio: 4/3; object-fit: cover; background: #000; display: block; }
.camera-footer { padding: 20px; border-top: 1px solid rgba(255,255,255,0.08); }

.confirm-overlay {
  position: fixed; inset: 0; z-index: 300;
  background: rgba(0,0,0,0.75); backdrop-filter: blur(8px); -webkit-backdrop-filter: blur(8px);
  display: flex; align-items: center; justify-content: center; padding: 24px;
}
.confirm-panel {
  background: #111; border: 1px solid rgba(255,255,255,0.12); border-radius: 12px;
  padding: 32px 28px; width: 100%; max-width: 360px;
  display: flex; flex-direction: column; align-items: center; gap: 14px; text-align: center;
}
.confirm-avatar { width: 72px; height: 72px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 36px; overflow: hidden; flex-shrink: 0; }
.confirm-name { font-size: 24px; font-weight: 900; font-family: var(--font-display); letter-spacing: 0.05em; }
.confirm-msg { font-size: 14px; color: var(--text-muted); line-height: 1.5; margin: 0; }
.pinned-warn { color: #f59e0b; font-size: 13px; }
.confirm-btns { display: flex; gap: 12px; width: 100%; }
.confirm-btns .btn { flex: 1; }

.ct-player-opts { display: flex; gap: 6px; flex-wrap: wrap; }
.ct-player-btn {
  flex: 1; min-width: 72px; padding: 8px 10px; border-radius: 8px;
  border: 2px solid #ffffff; background: transparent;
  cursor: pointer; transition: all 0.15s; display: flex; flex-direction: column;
  align-items: center; gap: 2px; position: relative; overflow: hidden;
  -webkit-tap-highlight-color: transparent;
}
.ct-player-btn:hover { border-color: var(--pink); background: rgba(255,45,120,0.08); }
.ct-player-btn.active { border-color: var(--pink); background: rgba(255,45,120,0.12); }
.ct-player-label { font-size: 13px; font-weight: 800; font-family: var(--font-display); letter-spacing: 0.05em; color: #fff; }
.ct-player-sub { font-size: 9px; font-weight: 700; letter-spacing: 0.06em; color: var(--text-muted); text-transform: uppercase; }
.ct-player-btn.active .ct-player-label { color: var(--pink); }

.fade-enter-active, .fade-leave-active { transition: opacity 0.2s; }
.fade-enter-from, .fade-leave-to { opacity: 0; }

@media (max-width: 768px) {
  .page { height: auto; min-height: 100vh; min-height: 100dvh; overflow: auto; }
  .setup-body { flex-direction: column; overflow: visible; height: auto; }
  .setup-form-scroll { flex: none; overflow-y: visible; border-right: none; border-bottom: 1px solid rgba(255,255,255,0.06); }
  .setup-right { width: 100%; padding: 20px; padding-bottom: calc(20px + env(safe-area-inset-bottom)); }
  .page-header { padding: 14px 20px; padding-top: calc(14px + env(safe-area-inset-top)); }
  .existing-scroll { flex: none; height: auto; }
}

/* iPad portrait — allow page to scroll so keyboard doesn't clip content */
@media (min-width: 769px) and (max-width: 1100px) and (orientation: portrait) {
  .page { height: auto; min-height: 100dvh; overflow-y: auto; }
  .setup-body { overflow: visible; height: auto; }
  .setup-form-scroll { overflow-y: visible; }
  .existing-scroll { flex: none; height: auto; }
}
</style>
