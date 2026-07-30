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
              <div v-for="opt in cricketTargetDisplayOpts" :key="String(opt.value)" class="ct-player-wrap">
                <button
                  v-ripple class="ct-player-btn"
                  :class="{ active: cricketTargetDisplay === opt.value }"
                  @click="cricketTargetDisplay = opt.value"
                >
                  <span class="ct-player-label">{{ opt.label }}</span>
                </button>
                <span class="ct-player-sub">{{ opt.sub }}</span>
              </div>
            </div>
          </div>

          <div class="field">
            <label class="label">Player Color</label>
            <div class="palette-selected-row">
              <span class="palette-selected-dot" :style="{ background: color, boxShadow: `0 0 10px ${color}` }" />
              <span class="palette-selected-label">{{ selectedColorName }}</span>
              <span v-if="colorConflict" class="color-conflict">⚠ Already used by {{ colorConflict }}</span>
              <button class="color-wheel-toggle" @click="showColorWheel = !showColorWheel">
                {{ showColorWheel ? '▴ Less' : '▾ Change' }}
              </button>
            </div>
            <div v-if="showColorWheel" class="color-wheel-wrap">
              <svg class="color-wheel-svg" viewBox="0 0 400 400" xmlns="http://www.w3.org/2000/svg">
                <path
                  v-for="(cell, idx) in wheelCells" :key="idx"
                  :d="cell.path"
                  :fill="cell.value"
                  class="wheel-cell"
                  :class="{ 'wheel-active': color.toLowerCase() === cell.value.toLowerCase() }"
                  @click="color = cell.value"
                >
                  <title>{{ cell.name }}</title>
                </path>
                <text
                  v-for="(cell, idx) in wheelCells.filter(c => c.ring >= 2)"
                  :key="`t${idx}`"
                  :x="cell.lx" :y="cell.ly"
                  :transform="`rotate(${cell.lrot},${cell.lx},${cell.ly})`"
                  class="wheel-label"
                  :font-size="'6'"
                  text-anchor="middle" dominant-baseline="middle"
                >{{ cell.name }}</text>
                <circle
                  cx="200" cy="200" r="30"
                  fill="#0a0a0a"
                  class="wheel-cell"
                  :class="{ 'wheel-active': color.toLowerCase() === '#000000' }"
                  style="cursor:pointer"
                  @click="color = '#000000'"
                >
                  <title>Black</title>
                </circle>
                <text x="200" y="200" text-anchor="middle" dominant-baseline="middle"
                  style="font-size:7px;fill:rgba(255,255,255,0.35);pointer-events:none;font-weight:700;letter-spacing:0.05em">BLACK</text>
              </svg>
            </div>
          </div>

          <div class="field">
            <label class="label">Yahtzee Dice Theme</label>
            <p class="field-hint">How your dice look when it's your turn in Yahtzee.</p>
            <div class="dice-theme-grid">
              <button
                v-for="t in DICE_THEMES" :key="t.value"
                v-ripple class="dice-theme-btn"
                :class="{ active: (diceTheme ?? 'default') === t.value }"
                @click="diceTheme = t.value"
              >
                <span class="dice-theme-icon">{{ t.icon }}</span>
                <span class="dice-theme-label">{{ t.label }}</span>
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
import { ref, computed, watch, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { usePlayersStore } from '../stores/players'
import { useGameStore } from '../stores/game'
import { PRESET_AVATARS, PLAYER_THEMES, TARGET_LABEL_COLORS, DICE_THEMES, type Player, type DiceTheme } from '../types/index'

const PLAYER_COLOR_PALETTE = [
  '#ff2d78', '#00d4ff', '#aaff00', '#ff6b1a',
  '#bf5fff', '#ffd700', '#ff4444', '#00ffaa',
]

// 2D color wheel: WHEEL_DATA[ring][segment]
// ring 0 = innermost/darkest, ring 5 = outermost/lightest
// 12 segments clockwise from top: Magenta, Pink, Red, RedOrange, Orange, Amber, Yellow, Lime, Green, Teal, Blue, Purple
const WHEEL_DATA: { name: string; value: string }[][] = [
  // Ring 0 — darkest
  [
    { name: 'Eggplant',   value: '#380028' },
    { name: 'Dark Rose',  value: '#5a0023' },
    { name: 'Maroon',     value: '#800000' },
    { name: 'Dark Brick', value: '#6d2002' },
    { name: 'Espresso',   value: '#5c2000' },
    { name: 'Dark Amber', value: '#3d2800' },
    { name: 'Dark Olive', value: '#3d3c00' },
    { name: 'Army Dark',  value: '#2d4200' },
    { name: 'Racing',     value: '#0e3b1a' },
    { name: 'Dark Teal',  value: '#003330' },
    { name: 'Navy',       value: '#001f5b' },
    { name: 'Dark Violet',value: '#1a0038' },
  ],
  // Ring 1
  [
    { name: 'Dark Magenta',value: '#6b0057' },
    { name: 'Deep Rose',  value: '#8b0050' },
    { name: 'Burgundy',   value: '#800020' },
    { name: 'Ruby',       value: '#9b111e' },
    { name: 'Rust',       value: '#b7410e' },
    { name: 'Sepia',      value: '#8b6914' },
    { name: 'Olive',      value: '#808000' },
    { name: 'Army',       value: '#4b5320' },
    { name: 'Forest',     value: '#228b22' },
    { name: 'Sea Blue',   value: '#006994' },
    { name: 'Prussian',   value: '#003153' },
    { name: 'Indigo',     value: '#4b0082' },
  ],
  // Ring 2
  [
    { name: 'Mulberry',   value: '#c0009e' },
    { name: 'Raspberry',  value: '#e30b5c' },
    { name: 'Carmine',    value: '#960018' },
    { name: 'Brick',      value: '#cb4154' },
    { name: 'Burnt Org',  value: '#cc5500' },
    { name: 'Ochre',      value: '#cc7722' },
    { name: 'Dark Yellow',value: '#cccc00' },
    { name: 'Olive Drab', value: '#6b8e23' },
    { name: 'Green',      value: '#008000' },
    { name: 'Teal',       value: '#008080' },
    { name: 'Cobalt',     value: '#0047ab' },
    { name: 'Grape',      value: '#6f2da8' },
  ],
  // Ring 3
  [
    { name: 'Magenta',    value: '#ff00e4' },
    { name: 'Hot Pink',   value: '#ff2d78' },
    { name: 'Scarlet',    value: '#ff2400' },
    { name: 'Orange Red', value: '#ff4500' },
    { name: 'Orange',     value: '#ff6600' },
    { name: 'Amber',      value: '#ffbf00' },
    { name: 'Yellow',     value: '#ffff00' },
    { name: 'Chartreuse', value: '#7fff00' },
    { name: 'Lime',       value: '#32cd32' },
    { name: 'Cyan',       value: '#00bcd4' },
    { name: 'Royal Blue', value: '#4169e1' },
    { name: 'Violet',     value: '#7c3aed' },
  ],
  // Ring 4
  [
    { name: 'Pink',       value: '#ff69b4' },
    { name: 'Rose Pink',  value: '#ff80ab' },
    { name: 'Coral',      value: '#ff6961' },
    { name: 'Salmon',     value: '#ff8a65' },
    { name: 'Peach Org',  value: '#ffab40' },
    { name: 'Gold',       value: '#ffd700' },
    { name: 'Light Yellow',value: '#fff176' },
    { name: 'Lime Green', value: '#b5e853' },
    { name: 'Spring',     value: '#90ee90' },
    { name: 'Seafoam',    value: '#64ffda' },
    { name: 'Sky Blue',   value: '#87cefa' },
    { name: 'Lavender',   value: '#c084fc' },
  ],
  // Ring 5 — lightest
  [
    { name: 'Baby Pink',  value: '#ffb6c1' },
    { name: 'Blush',      value: '#ffc2d4' },
    { name: 'Light Red',  value: '#ffcdd2' },
    { name: 'Peach',      value: '#ffd0b5' },
    { name: 'Light Org',  value: '#ffe0b2' },
    { name: 'Pale Gold',  value: '#fff3cd' },
    { name: 'Cream',      value: '#fffde7' },
    { name: 'Pale Lime',  value: '#f0f4c3' },
    { name: 'Pale Green', value: '#dcf5dc' },
    { name: 'Pale Teal',  value: '#b2dfdb' },
    { name: 'Pale Blue',  value: '#e3f2fd' },
    { name: 'Pale Violet',value: '#ede9fe' },
  ],
]

const COLOR_PALETTE = WHEEL_DATA.flat()

function polarToCart(r: number, deg: number) {
  const rad = (deg - 90) * Math.PI / 180
  return { x: +(200 + r * Math.cos(rad)).toFixed(2), y: +(200 + r * Math.sin(rad)).toFixed(2) }
}

function sectorPath(r1: number, r2: number, a1: number, a2: number): string {
  const g = 0.7
  const s = a1 + g, e = a2 - g
  const p1 = polarToCart(r1, s), p2 = polarToCart(r1, e)
  const p3 = polarToCart(r2, e), p4 = polarToCart(r2, s)
  return `M${p1.x} ${p1.y} A${r1} ${r1} 0 0 1 ${p2.x} ${p2.y} L${p3.x} ${p3.y} A${r2} ${r2} 0 0 0 ${p4.x} ${p4.y}Z`
}

const RING_RADII = [34, 62, 92, 122, 152]

const wheelCells = computed(() => {
  const cells: { name: string; value: string; path: string; lx: number; ly: number; lrot: number; ring: number }[] = []
  for (let ring = 0; ring < 3; ring++) {
    const r1 = RING_RADII[ring], r2 = RING_RADII[ring + 1]
    for (let seg = 0; seg < 12; seg++) {
      const a1 = seg * 30, a2 = a1 + 30
      const { name, value } = WHEEL_DATA[ring][seg]
      const mid = a1 + 15
      const midR = (r1 + r2) / 2
      const lp = polarToCart(midR, mid)
      const lrot = mid <= 180 ? mid : mid + 180
      cells.push({ name, value, path: sectorPath(r1, r2, a1, a2), lx: lp.x, ly: lp.y, lrot, ring })
    }
  }
  return cells
})

const selectedColorName = computed(() => {
  if (color.value.toLowerCase() === '#000000') return 'Black'
  return COLOR_PALETTE.find(c => c.value.toLowerCase() === color.value.toLowerCase())?.name ?? color.value
})

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

onMounted(() => {
  const editId = route.query.edit as string | undefined
  if (editId) {
    const player = playersStore.players.find(p => p.id === editId)
    if (player) loadPlayer(player)
  }
})

const editingId = ref<string | null>(null)
const name = ref('')
const color = ref<string>(nextAvailableColor())
const showColorWheel = ref(false)
watch(color, () => { showColorWheel.value = false })
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
const cricketTargetDisplay = ref<'show' | 'hide'>('show')
const diceTheme = ref<DiceTheme | null>(null)

const cricketTargetDisplayOpts: { value: 'show' | 'hide'; label: string; sub: string }[] = [
  { value: 'show',   label: 'Normal',  sub: 'Standard opacity' },
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
  photoPreview.value = null; playerBackground.value = null; bgImagePreview.value = null; bgMode.value = 'theme'; bgSize.value = null; bgPosition.value = null; bgFill.value = null; targetLabelColor.value = null; cricketTargetDisplay.value = 'show'; diceTheme.value = null; saving.value = false; showColorWheel.value = false
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
  cricketTargetDisplay.value = p.cricketTargetDisplay ?? 'show'
  diceTheme.value = p.diceTheme ?? null
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
    playersStore.updatePlayer(editingId.value, { name: name.value.trim(), color: color.value, avatarUrl: finalAvatar, playerBackground: bg, playerBackgroundSize: bgSize.value, playerBackgroundPosition: bgPosition.value, playerBackgroundFill: bgFill.value, targetLabelColor: tlc, cricketTargetDisplay: ctd, diceTheme: diceTheme.value })
    editingId.value = null
  } else {
    const newPlayer = playersStore.addPlayer({ name: name.value.trim(), color: color.value, avatarUrl: finalAvatar, playerBackground: bg, playerBackgroundSize: bgSize.value, playerBackgroundPosition: bgPosition.value, playerBackgroundFill: bgFill.value, targetLabelColor: tlc, cricketTargetDisplay: ctd, diceTheme: diceTheme.value, pinned: false })
    if (route.query.addToGame === 'true' && gameStore.game) {
      gameStore.addPlayerToGame(newPlayer)
      resetForm()
      router.push('/game')
      return
    }
    if (route.query.from === 'new-game') {
      resetForm()
      router.push({ path: '/new-game', query: { step: '2' } })
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

.theme-grid { display: grid; grid-template-columns: repeat(9, 1fr); gap: 8px; touch-action: pan-y; }
.theme-swatch { width: auto; min-width: 0; height: 52px; border-radius: 8px; border: 2px solid rgba(255,255,255,0.1); cursor: pointer; position: relative; overflow: hidden; transition: transform 0.15s, border-color 0.15s; background: rgba(255,255,255,0.06); display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 2px; touch-action: pan-y; }
.theme-swatch:hover { transform: scale(1.05); }
.theme-swatch.active { border-color: #fff; transform: scale(1.08); }
.theme-none { font-size: 16px; color: rgba(255,255,255,0.3); }
.theme-check { position: absolute; top: 4px; right: 5px; font-size: 11px; color: #fff; font-weight: 900; }
.theme-label { font-size: 9px; font-weight: 800; letter-spacing: 0.08em; text-transform: uppercase; color: rgba(255,255,255,0.8); text-shadow: 0 1px 4px rgba(0,0,0,0.8); }
.bg-preview { width: 80px; height: 80px; border-radius: 8px; border: 1px solid rgba(255,255,255,0.1); display: flex; align-items: center; justify-content: center; flex-shrink: 0; overflow: hidden; }

.field-hint { font-size: 12px; color: var(--text-muted); margin: 0; line-height: 1.4; }
.color-wheel-wrap { display: flex; justify-content: center; padding: 8px 0; }
.color-wheel-svg { width: 100%; max-width: 320px; height: auto; cursor: pointer; }
.wheel-cell { stroke: rgba(0,0,0,0.15); stroke-width: 0.5; transition: opacity 0.1s; }
.wheel-cell:hover { opacity: 0.8; }
.wheel-active { stroke: #ffffff !important; stroke-width: 2.5 !important; filter: drop-shadow(0 0 4px rgba(255,255,255,0.9)); }
.wheel-label { fill: #ffffff; font-weight: 700; letter-spacing: 0.02em; paint-order: stroke fill; stroke: rgba(0,0,0,0.65); stroke-width: 2px; stroke-linejoin: round; pointer-events: none; }
.palette-selected-row { display: flex; align-items: center; gap: 10px; }
.palette-selected-dot { width: 20px; height: 20px; border-radius: 50%; border: 2px solid rgba(255,255,255,0.3); flex-shrink: 0; display: block; }
.palette-selected-label { font-size: 13px; font-weight: 700; color: rgba(255,255,255,0.85); letter-spacing: 0.05em; text-transform: uppercase; flex: 1; }
.color-conflict { font-size: 12px; color: #ff4444; font-weight: 700; }
.color-wheel-toggle { padding: 4px 12px; border-radius: 6px; border: 1px solid rgba(255,255,255,0.2); background: rgba(255,255,255,0.06); color: rgba(255,255,255,0.7); font-size: 12px; font-weight: 700; cursor: pointer; transition: all 0.15s; white-space: nowrap; }
.color-wheel-toggle:hover { border-color: var(--pink); color: var(--pink); }
.color-wheel-wrap { display: flex; justify-content: center; padding: 8px 0; }

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

.dice-theme-grid { display: flex; gap: 8px; flex-wrap: wrap; }
.dice-theme-btn {
  display: flex; flex-direction: column; align-items: center; gap: 4px;
  padding: 10px 20px; min-width: 96px;
  border-radius: 10px; border: 2px solid rgba(255,255,255,0.15);
  background: rgba(255,255,255,0.04); cursor: pointer;
  transition: all 0.15s; position: relative; overflow: hidden;
  -webkit-tap-highlight-color: transparent;
}
.dice-theme-btn:hover { border-color: rgba(255,255,255,0.35); background: rgba(255,255,255,0.08); }
.dice-theme-btn.active { border-color: var(--pink); background: rgba(255,45,120,0.12); }
.dice-theme-icon { font-size: 24px; }
.dice-theme-label { font-size: 15px; font-weight: 900; font-family: var(--font-display); letter-spacing: 0.05em; color: #fff; white-space: nowrap; }
.dice-theme-btn.active .dice-theme-label { color: var(--pink); }

.ct-player-opts { display: flex; gap: 8px; flex-wrap: nowrap; }
.ct-player-wrap { display: flex; flex-direction: column; align-items: center; gap: 5px; flex: 1; }
.ct-player-btn {
  width: 100%; padding: 12px 6px; border-radius: 8px;
  border: 2px solid #ffffff; background: transparent;
  cursor: pointer; transition: all 0.15s; display: flex;
  align-items: center; justify-content: center;
  position: relative; overflow: hidden;
  -webkit-tap-highlight-color: transparent;
}
.ct-player-btn:hover { border-color: var(--pink); background: rgba(255,45,120,0.08); }
.ct-player-btn.active { border-color: var(--pink); background: rgba(255,45,120,0.12); }
.ct-player-label { font-size: 14px; font-weight: 900; font-family: var(--font-display); letter-spacing: 0.06em; color: #fff; }
.ct-player-sub { font-size: 10px; font-weight: 700; letter-spacing: 0.04em; color: var(--text-muted); text-transform: uppercase; text-align: center; line-height: 1.3; }
.ct-player-btn.active .ct-player-label { color: var(--pink); }

.fade-enter-active, .fade-leave-active { transition: opacity 0.2s; }
.fade-enter-from, .fade-leave-to { opacity: 0; }

@media (max-width: 768px) {
  /* Page fills screen, form scrolls internally */
  .page { height: 100dvh; overflow: hidden; }
  .page::-webkit-scrollbar { display: none; }

  /* Header: wrap to two rows — back/save on top, title below */
  .page-header {
    flex-wrap: wrap; padding: 10px 16px;
    padding-top: calc(10px + env(safe-area-inset-top));
    gap: 6px;
  }
  .page-title { order: 3; width: 100%; text-align: center; font-size: 18px; letter-spacing: 0.08em; }

  /* Body: form takes full height, right panel hidden (moves to bottom via scroll) */
  .setup-body { flex-direction: column; overflow: hidden; }
  .setup-form-scroll {
    flex: 1; min-height: 0; overflow-y: auto;
    -webkit-overflow-scrolling: touch;
    scrollbar-width: none;
    border-right: none;
    border-bottom: none;
  }
  .setup-form-scroll::-webkit-scrollbar { display: none; }
  .setup-form { padding: 16px; gap: 18px; }

  /* Right panel: collapsed to just existing players, minimal height */
  .setup-right {
    width: 100%; flex-shrink: 0;
    padding: 12px 16px;
    padding-bottom: calc(12px + env(safe-area-inset-bottom));
    gap: 10px; max-height: 200px;
    overflow: hidden; border-top: 1px solid rgba(255,255,255,0.08);
  }
  .preview-card { display: none; }
  .existing-section { flex: 1; overflow: hidden; }
  .existing-scroll { flex: 1; overflow-y: auto; scrollbar-width: none; -webkit-overflow-scrolling: touch; }
  .existing-scroll::-webkit-scrollbar { display: none; }

  /* Compact form elements */
  .color-wheel-svg { max-width: min(280px, 80vw); }
  .theme-grid { grid-template-columns: repeat(5, 1fr); gap: 6px; }
  .theme-swatch { height: 44px; }
  .dice-theme-grid { gap: 6px; }
  .dice-theme-btn { padding: 6px 10px; }
  .name-input { font-size: 17px; padding: 10px 14px; }
  .field { gap: 8px; }
}

/* iPad — compact layout, hide scrollbar, shrink color wheel */
@media (min-width: 769px) and (max-width: 1100px) {
  .setup-form-scroll { scrollbar-width: none; }
  .setup-form-scroll::-webkit-scrollbar { display: none; }
  .setup-form { padding: 18px 24px; gap: 16px; }
  .page-header { padding: 12px 24px; padding-top: calc(12px + env(safe-area-inset-top)); }
  .field { gap: 7px; }
  .color-wheel-svg { max-width: 220px; }
  .setup-right { width: 240px; padding: 20px; gap: 14px; }
  .preview-avatar { width: 72px; height: 72px; font-size: 36px; }
}
</style>
