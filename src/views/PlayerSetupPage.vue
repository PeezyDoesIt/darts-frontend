<template>
  <div class="page">
    <div class="drip-bar" />
    <div class="page-header">
      <button v-ripple class="btn btn-outline btn-sm" @click="goBack(router)">← Back</button>
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
              <div class="photo-preview" :style="{ background: color, boxShadow: '4px 4px 0 rgba(0,0,0,0.5)' }">
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
            <div class="photo-area">
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
            </div>
            <p class="field-hint">Used on both screens unless you set one below.</p>
          </div>

          <!--
            Placement.

            This replaced Centre / Top / Bottom. Three stops rarely landed on the part of the
            photo anyone meant, and the small preview beside them was always centre-cropped, so
            the buttons changed nothing you could see. Here the preview IS the throw screen —
            same shape, same furniture in the same corners — and the photo is dragged under it.
            Only worth showing once there is an image to place.
          -->
          <div v-if="bgImagePreview" class="field">
            <label class="label">Placement</label>
            <p class="field-hint">This is the throw screen. Drag the photo until the part you want is clear of the score.</p>

            <BackgroundPlacer
              v-model:position="playerBackgroundPosition"
              v-model:zoom="playerBackgroundZoom"
              :image="bgImagePreview"
              :name="name"
              :size="playerBackgroundSize"
              :fill="playerBackgroundFill"
            />

            <div class="bgfit-row" style="margin-top:12px">
              <button
                v-for="opt in BG_SIZE_OPTS" :key="String(opt.value)" v-ripple
                class="bgfit-btn" :class="{ active: playerBackgroundSize === opt.value }"
                @click="playerBackgroundSize = opt.value"
              >{{ opt.label }}</button>
            </div>

            <!-- Only meaningful when the image is contained: cropping leaves nothing to fill. -->
            <div v-if="isBgFitted" class="bgfit-row" style="margin-top:10px">
              <button
                v-for="opt in BG_FILL_OPTS" :key="String(opt.value)" v-ripple
                class="bgfit-btn" :class="{ active: playerBackgroundFill === opt.value }"
                @click="playerBackgroundFill = opt.value"
              >{{ opt.label }}</button>
            </div>
          </div>

          <!--
            The two screens a background is actually seen on, each able to differ. Both
            preview the default when unset, so the box always shows what will really appear
            rather than going blank and implying nothing is set.
          -->
          <div class="field">
            <label class="label">Throw Screen Background</label>
            <p class="field-hint">Behind the board while you're throwing.</p>
            <div class="photo-area">
              <div class="bg-preview" :style="screenBgPreview(throwBackground)">
                <span v-if="!throwBackground" style="font-size:11px;opacity:0.45;letter-spacing:0.08em">DEFAULT</span>
              </div>
              <div style="display:flex;gap:10px;flex-wrap:wrap;align-items:center">
                <label v-ripple class="btn btn-spray btn-lg" style="cursor:pointer;position:relative;overflow:hidden">
                  Choose File
                  <input type="file" accept="image/*" style="display:none" @change="onScreenBgFileChange($event, 'throw')" />
                </label>
                <button v-if="throwBackground" v-ripple class="btn btn-outline btn-sm" @click="throwBackground = null">Use default</button>
              </div>
            </div>
            <!-- Only its own photo is placeable here. Falling back to the default means
                 falling back to the default's framing too, which is set above. -->
            <BackgroundPlacer
              v-if="throwBackground"
              v-model:position="throwBackgroundPosition"
              v-model:zoom="throwBackgroundZoom"
              :image="throwBackground"
              :name="name"
              :size="playerBackgroundSize"
              :fill="playerBackgroundFill"
              style="margin-top:12px"
            />
          </div>

          <div class="field">
            <label class="label">Walk-up Screen Background</label>
            <p class="field-hint">Behind the "you're up next" screen between turns.</p>
            <div class="photo-area">
              <div class="bg-preview" :style="screenBgPreview(walkupBackground)">
                <span v-if="!walkupBackground" style="font-size:11px;opacity:0.45;letter-spacing:0.08em">DEFAULT</span>
              </div>
              <div style="display:flex;gap:10px;flex-wrap:wrap;align-items:center">
                <label v-ripple class="btn btn-spray btn-lg" style="cursor:pointer;position:relative;overflow:hidden">
                  Choose File
                  <input type="file" accept="image/*" style="display:none" @change="onScreenBgFileChange($event, 'walkup')" />
                </label>
                <button v-if="walkupBackground" v-ripple class="btn btn-outline btn-sm" @click="walkupBackground = null">Use default</button>
              </div>
            </div>
            <BackgroundPlacer
              v-if="walkupBackground"
              v-model:position="walkupBackgroundPosition"
              v-model:zoom="walkupBackgroundZoom"
              :image="walkupBackground"
              :name="name"
              chrome="walkup"
              :size="playerBackgroundSize"
              :fill="playerBackgroundFill"
              style="margin-top:12px"
            />
          </div>

          <div class="field">
            <label class="label">Font Color</label>
            <div class="color-dropdown-wrap">
              <button class="color-dropdown-btn" @click="showColorDropdown = !showColorDropdown">
                <span class="color-dropdown-swatch" :style="{ background: color, border: color === '#000000' ? '2px solid rgba(255,255,255,0.35)' : '2px solid transparent' }" />
                <span class="color-dropdown-label">{{ selectedColorName }}</span>
                <span class="color-dropdown-arrow">{{ showColorDropdown ? '▲' : '▼' }}</span>
              </button>
              <div v-if="showColorDropdown" class="color-dropdown-menu">
                <button
                  v-for="s in FONT_COLORS" :key="s.value"
                  class="color-swatch-sm"
                  :class="{ 'color-swatch-active': color.toLowerCase() === s.value.toLowerCase() }"
                  :style="{ background: s.value, border: s.value === '#000000' ? '2px solid rgba(255,255,255,0.3)' : '2px solid transparent' }"
                  :title="s.name"
                  @click="color = s.value; showColorDropdown = false"
                />
              </div>
            </div>
          </div>

          <!--
            Auto is not "no colour": it picks white on the themes that need it, otherwise the
            complement of the player's own colour. So the default entry has to show something,
            and it shows what Auto would actually produce.
          -->
          <div class="field">
            <label class="label">Cricket: Target Numbers</label>
            <p class="field-hint">The big 20 / 19 / 18 labels on your throw screen. Auto picks a colour that stands off your background.</p>
            <div class="color-dropdown-wrap">
              <button class="color-dropdown-btn" @click="showTargetDropdown = !showTargetDropdown">
                <span class="color-dropdown-swatch" :style="{ background: targetLabelColor ?? autoTargetColor, border: targetLabelColor === '#000000' ? '2px solid rgba(255,255,255,0.35)' : '2px solid transparent' }" />
                <span class="color-dropdown-label">{{ selectedTargetName }}</span>
                <span class="color-dropdown-arrow">{{ showTargetDropdown ? '▲' : '▼' }}</span>
              </button>
              <div v-if="showTargetDropdown" class="color-dropdown-menu">
                <button
                  v-for="s in TARGET_LABEL_COLORS" :key="String(s.value)"
                  class="color-swatch-sm"
                  :class="{ 'color-swatch-active': targetLabelColor === s.value }"
                  :style="{ background: s.value ?? autoTargetColor, border: s.value === '#000000' ? '2px solid rgba(255,255,255,0.3)' : '2px solid transparent' }"
                  :title="s.label"
                  @click="targetLabelColor = s.value; showTargetDropdown = false"
                />
              </div>
            </div>
          </div>

          <div class="field">
            <label class="label">Cricket: Pip Color</label>
            <p class="field-hint">The marks that fill in as you hit a number. Default is the app's pink.</p>
            <div class="color-dropdown-wrap">
              <button class="color-dropdown-btn" @click="showPipDropdown = !showPipDropdown">
                <span class="color-dropdown-swatch" :style="{ background: pipColor ?? 'var(--pink)', border: '2px solid transparent' }" />
                <span class="color-dropdown-label">{{ selectedPipName }}</span>
                <span class="color-dropdown-arrow">{{ showPipDropdown ? '▲' : '▼' }}</span>
              </button>
              <div v-if="showPipDropdown" class="color-dropdown-menu">
                <button
                  v-for="s in TARGET_LABEL_COLORS" :key="String(s.value)"
                  class="color-swatch-sm"
                  :class="{ 'color-swatch-active': pipColor === s.value }"
                  :style="{ background: s.value ?? 'var(--pink)', border: s.value === '#000000' ? '2px solid rgba(255,255,255,0.3)' : '2px solid transparent' }"
                  :title="s.label"
                  @click="pipColor = s.value; showPipDropdown = false"
                />
              </div>
            </div>
          </div>

          <div class="field">
            <label class="label">Cricket: Pip Style</label>
            <p class="field-hint">The shape of the marks. Classic scores the way a real board does — slash, cross, ring.</p>
            <div class="pipstyle-row">
              <button
                v-for="s in PIP_STYLES" :key="s.value" v-ripple
                class="pipstyle-btn" :class="{ active: (pipStyle ?? 'blocks') === s.value }"
                @click="pipStyle = s.value"
              >
                <!-- A live preview in the chosen colour, so the choice is visible before it is made. -->
                <span class="pipstyle-preview" :class="`pips-${s.value}`" :style="{ '--pip': pipColor ?? 'var(--pink)' }">
                  <span v-for="n in 3" :key="n" class="pip-mini">{{ s.value === 'marks' ? (n === 1 ? '/' : n === 2 ? '✕' : '⊗') : '' }}</span>
                </span>
                <span class="pipstyle-label">{{ s.label }}</span>
              </button>
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
            <label class="label">Yahtzee Dice Theme</label>
            <p class="field-hint">How your dice look when it's your turn in Yahtzee.</p>
            <div class="color-dropdown-wrap">
              <button class="color-dropdown-btn dice-dropdown-btn" @click="showDiceDropdown = !showDiceDropdown">
                <span class="dice-dropdown-item-swatch" :style="swatchStyle(diceTheme ?? 'default')" />
                <span class="color-dropdown-label">{{ selectedDiceTheme?.label ?? 'Default' }}</span>
                <span class="color-dropdown-arrow">{{ showDiceDropdown ? '▲' : '▼' }}</span>
              </button>
              <div v-if="showDiceDropdown" class="dice-dropdown-menu">
                <button
                  v-for="t in DICE_THEMES" :key="t.value"
                  class="dice-dropdown-item"
                  :class="{ active: (diceTheme ?? 'default') === t.value }"
                  @click="diceTheme = t.value; showDiceDropdown = false"
                >
                  <!--
                    The die's own colours rather than an emoji. 🎰 and 🪵 say nothing about
                    what you are picking, and several themes shared a glyph — 🌑 stood for
                    both Silver and Midnight. The in-game picker in YahtzeeGamePage already
                    showed a swatch; this is the same idea, square to read as a die face.
                  -->
                  <span class="dice-dropdown-item-swatch" :style="swatchStyle(t.value)" />
                  <span class="dice-dropdown-item-label">{{ t.label }}</span>
                </button>
              </div>
            </div>
          </div>

          <!--
            Three inks, all one tap away. A dropdown would hide two of them behind a click and
            make the choice feel like a setting; it is closer to picking a pen.
          -->
          <div class="field">
            <label class="label">Yahtzee Scorecard</label>
            <p class="field-hint">Which card you keep score on.</p>
            <div class="cardink-row">
              <button
                v-for="ink in CARD_INKS" :key="ink.value" v-ripple
                class="cardink-btn" :class="[`cardink-${ink.value}`, { active: (yahtzeeCard ?? 'street') === ink.value }]"
                @click="yahtzeeCard = ink.value"
              >
                <span class="cardink-swatch" />
                <span class="cardink-name">{{ ink.label }}</span>
                <span class="cardink-sub">{{ ink.blurb }}</span>
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

        <!-- Above the roster, because the roster is the thing that is out of step. -->
        <SyncWarning />

        <div class="existing-section">
          <span class="label">Existing Players</span>
          <div class="existing-scroll">
            <div class="existing-list">
              <div v-for="p in sortedPlayers" :key="p.id" class="existing-row" :class="{ pinned: p.pinned, editing: editingId === p.id }">
                <div class="roster-avatar" :style="{ background: p.color, boxShadow: '3px 3px 0 rgba(0,0,0,0.5)' }">
                  <img v-if="isPhoto(p.avatarUrl)" :src="p.avatarUrl!" alt="" style="width:100%;height:100%;object-fit:cover;border-radius:50%" />
                  <span v-else>{{ avatarGlyph(p) }}</span>
                </div>
                <div class="existing-info">
                  <!-- title carries the full name, so a clamped one is still readable on hover. -->
                  <span class="existing-name" :title="p.name">{{ p.name }}</span>
                  <span class="existing-sub" style="font-size:12px;color:var(--text-muted)">{{ p.wins }}W · {{ p.gamesPlayed }}G</span>
                </div>
                <div class="row-actions">
                  <button v-ripple class="row-btn edit-btn" :class="{ active: editingId === p.id }" @click.stop="loadPlayer(p)" title="Edit">✏️</button>
                  <button v-ripple class="row-btn pin-btn" :class="{ active: p.pinned }" :title="p.pinned ? 'Unpin' : 'Pin'" @click.stop="playersStore.updatePlayer(p.id, { pinned: !p.pinned })">📌</button>
                  <button v-ripple class="row-btn row-btn-danger" @click.stop="confirmDelete(p)" title="Delete">🗑</button>
                </div>
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
            <span v-else>{{ avatarGlyph(deleteTarget) }}</span>
          </div>
          <div class="confirm-name">{{ deleteTarget.name }}</div>
          <p v-if="deleteTarget.pinned" class="confirm-msg pinned-warn">📌 This player is pinned. Unpin them to delete.</p>
          <p class="confirm-msg">Delete this player? Their stats will be gone forever.</p>
          <div class="confirm-btns">
            <button v-ripple class="btn btn-outline btn-lg" @click="deleteTarget = null">Cancel</button>
            <!-- While pinned, Delete is genuinely unavailable — the pin exists to stop a
                 single mis-tap removing someone. Unpinning happens right here rather than
                 sending the user back to the list, so the protection costs one tap, not a
                 round trip. -->
            <button
              v-if="deleteTarget.pinned"
              v-ripple
              class="btn btn-outline btn-lg unpin-btn"
              @click="unpinTarget"
            >📌 Unpin</button>
            <button
              v-else
              v-ripple
              class="btn btn-danger btn-lg"
              @click="doDelete"
            >Delete</button>
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
        <q-card-actions align="center" class="camera-footer">
          <button v-ripple class="btn btn-spray btn-xl" @click="capturePhoto">📸 Capture</button>
        </q-card-actions>
      </q-card>
    </q-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted, type CSSProperties } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { avatarGlyph, isPhoto } from '../lib/playerDisplay'
import BackgroundPlacer from '../components/BackgroundPlacer.vue'
import { usePlayersStore } from '../stores/players'
import { useGameStore } from '../stores/game'
import { goBack } from '../router/goBack'
import { AVATAR_MAX_PX, BACKGROUND_MAX_PX, downscaleFile, downscaleVideoFrame } from '../lib/downscaleImage'
import { DICE_THEMES, DIE_GRADIENTS, DIE_SOLID_FACES, PIP_STYLES, TARGET_LABEL_COLORS, type Player, type DiceTheme, type PipStyle, type YahtzeeCardSkin } from '../types/index'
import { autoTargetColor as autoTargetColorFor } from '../lib/targetColor'
import SyncWarning from '../components/SyncWarning.vue'

const FONT_COLORS: { name: string; value: string }[] = [
  { name: 'White',    value: '#ffffff' },
  { name: 'Black',    value: '#000000' },
  { name: 'Silver',   value: '#aaaaaa' },
  { name: 'Gold',     value: '#ffd700' },
  { name: 'Red',      value: '#e00000' },
  { name: 'Orange',   value: '#ff6600' },
  { name: 'Yellow',   value: '#ffff00' },
  { name: 'Lime',     value: '#aaff00' },
  { name: 'Green',    value: '#00c853' },
  { name: 'Teal',     value: '#008080' },
  { name: 'Cyan',     value: '#00bcd4' },
  { name: 'Blue',     value: '#0066ff' },
  { name: 'Purple',   value: '#bf5fff' },
  { name: 'Hot Pink', value: '#ff2d78' },
  { name: 'Magenta',  value: '#ff00e4' },
]

const showColorDropdown = ref(false)
const selectedColorName = computed(() =>
  FONT_COLORS.find(c => c.value.toLowerCase() === color.value.toLowerCase())?.name ?? color.value
)

const showDiceDropdown = ref(false)
/**
 * What the die actually looks like, for the swatch beside each theme name.
 *
 * Three cases, in order: the gradient themes carry their own; the flat ones have a face
 * colour; and `default` tints with whatever colour this player is being given, so the swatch
 * changes as you change their colour above — which is exactly what the die will do.
 */
function swatchStyle(theme: DiceTheme | null) {
  const t = theme ?? 'default'
  return { background: DIE_GRADIENTS[t] ?? DIE_SOLID_FACES[t] ?? `${color.value}55` }
}

const selectedDiceTheme = computed(() =>
  DICE_THEMES.find(t => t.value === (diceTheme.value ?? 'default'))
)

const router = useRouter()
const route = useRoute()
const playersStore = usePlayersStore()
const gameStore = useGameStore()

const sortedPlayers = computed(() =>
  [...playersStore.players].sort((a, b) => Number(b.pinned) - Number(a.pinned))
)


onMounted(() => {
  const editId = route.query.edit as string | undefined
  if (editId) {
    const player = playersStore.players.find(p => p.id === editId)
    if (player) loadPlayer(player)
  }
})

const editingId = ref<string | null>(null)
const name = ref('')
const color = ref<string>('#ffffff')

const avatarUrl = ref<string | null>(null)
const avatarMode = ref<'emoji' | 'photo'>('photo')
const photoPreview = ref<string | null>(null)
const cameraOpen = ref(false)
const videoEl = ref<HTMLVideoElement | null>(null)
let stream: MediaStream | null = null

const deleteTarget = ref<Player | null>(null)
function confirmDelete(p: Player) { deleteTarget.value = p }

/** Unpin from inside the confirm dialog, which then reveals Delete. */
function unpinTarget() {
  const target = deleteTarget.value
  if (!target) return
  playersStore.updatePlayer(target.id, { pinned: false })
  deleteTarget.value = { ...target, pinned: false }
}

function doDelete() {
  if (!deleteTarget.value) return
  // Defence in depth: the dialog hides Delete while pinned, but the store is the last
  // word. Previously the dialog promised "unpin them first to protect them from
  // accidental deletion" and then deleted pinned players anyway — the warning rendered,
  // the button stayed live, and the protection did not exist.
  if (deleteTarget.value.pinned) return
  if (editingId.value === deleteTarget.value.id) resetForm()
  playersStore.deletePlayer(deleteTarget.value.id)
  deleteTarget.value = null
}

const bgMode = ref<'image'>('image')
const playerBackground = ref<string | null>(null)

/*
 * Null is a real choice here, not "unset": the throw screen treats a null size as the CSS
 * default, which is what every existing player has and what they should keep unless they say
 * otherwise. So each list leads with the null option rather than offering a fourth "default".
 */
const BG_SIZE_OPTS = [
  { label: 'Crop to fill', value: null },
  { label: 'Fit whole image', value: 'contain' as const },
] as const
const BG_FILL_OPTS = [
  { label: 'Black', value: null },
  { label: 'Blurred image', value: 'blur' as const },
] as const

const playerBackgroundSize = ref<'cover' | 'contain' | null>(null)
const playerBackgroundFill = ref<'black' | 'blur' | null>(null)

/*
 * Placement, one set per photo. The placer component owns the dragging and reports a CSS
 * background-position pair, or null when that photo has never been moved — null is every
 * screen's own default, so a player who never opens this is left exactly as they were.
 */
const playerBackgroundPosition = ref<string | null>(null)
const playerBackgroundZoom = ref<number | null>(null)
const throwBackgroundPosition = ref<string | null>(null)
const throwBackgroundZoom = ref<number | null>(null)
const walkupBackgroundPosition = ref<string | null>(null)
const walkupBackgroundZoom = ref<number | null>(null)

const isBgFitted = computed(() => playerBackgroundSize.value === 'contain')

const bgImagePreview = ref<string | null>(null)
/* Per-screen overrides. Null means "use the default above", which is the common case. */
const throwBackground = ref<string | null>(null)
const walkupBackground = ref<string | null>(null)

const targetLabelColor = ref<string | null>(null)
const showTargetDropdown = ref(false)
/**
 * What the board would use for this player right now, so the Auto entry is a preview rather
 * than a placeholder. Shared with CricketEntry — the point of the shared helper is that this
 * swatch cannot disagree with the screen it describes.
 */
const autoTargetColor = computed(() => autoTargetColorFor(color.value, playerBackground.value))
const selectedTargetName = computed(() =>
  TARGET_LABEL_COLORS.find(c => c.value === targetLabelColor.value)?.label ?? 'Auto')
const pipColor = ref<string | null>(null)
const pipStyle = ref<PipStyle | null>(null)
const showPipDropdown = ref(false)
const selectedPipName = computed(() =>
  TARGET_LABEL_COLORS.find(c => c.value === pipColor.value)?.label ?? 'Default')
const cricketTargetDisplay = ref<'show' | 'hide'>('show')
const diceTheme = ref<DiceTheme | null>(null)
const yahtzeeCard = ref<YahtzeeCardSkin | null>(null)

/* Street first because it is the default, then the bright one, then the cold one. */
const CARD_INKS: { value: YahtzeeCardSkin; label: string; blurb: string }[] = [
  { value: 'street', label: 'Street Print', blurb: 'The app\u2019s own look' },
  { value: 'paper',  label: 'Paper Card',   blurb: 'A printed scorepad' },
  { value: 'board',  label: 'Board Flip',   blurb: 'A stadium scoreboard' },
]

const cricketTargetDisplayOpts: { value: 'show' | 'hide'; label: string; sub: string }[] = [
  { value: 'show',   label: 'Normal',  sub: 'Standard opacity' },
  { value: 'hide',   label: 'Hide',    sub: 'Remove tile' },
]

const bgPreviewStyle = computed((): CSSProperties => {
  if (bgImagePreview.value) {
    // The thumbnail follows the placer rather than always centre-cropping, so the small
    // preview and the big one cannot disagree about what is framed.
    return {
      backgroundImage: `url(${bgImagePreview.value})`,
      backgroundSize: isBgFitted.value ? 'contain' : 'cover',
      backgroundPosition: playerBackgroundPosition.value ?? 'center',
      backgroundRepeat: 'no-repeat',
      backgroundColor: '#000',
    }
  }
  return { background: 'rgba(255,255,255,0.05)' }
})
const previewCardStyle = computed(() => {
  if (bgImagePreview.value) {
    return { backgroundImage: `url(${bgImagePreview.value})`, backgroundSize: 'cover', backgroundPosition: 'center', backgroundRepeat: 'no-repeat', backgroundColor: '#000', boxShadow: `0 0 40px ${color.value}40` }
  }
  if (playerBackground.value) return { background: playerBackground.value, boxShadow: `0 0 40px ${color.value}40` }
  return { background: `linear-gradient(135deg, ${color.value}cc, ${color.value}66)`, boxShadow: `0 0 40px ${color.value}40` }
})

/**
 * Picked files are downscaled rather than read straight to a data URL. readAsDataURL kept
 * the original bytes, so one 5MB photo out of a phone gallery became a ~7MB string and
 * blew the whole storage budget on its own.
 */
async function onAvatarFileChange(e: Event) {
  const input = e.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file) return
  try {
    const scaled = await downscaleFile(file, AVATAR_MAX_PX)
    photoPreview.value = scaled
    avatarUrl.value = scaled
  } catch {
    alert('Could not read that image.')
  } finally {
    input.value = ''   // let the same file be picked again after an error
  }
}

async function onBgFileChange(e: Event) {
  const input = e.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file) return
  try {
    const scaled = await downscaleFile(file, BACKGROUND_MAX_PX)
    bgImagePreview.value = scaled
    playerBackground.value = scaled
  } catch {
    alert('Could not read that image.')
  } finally {
    input.value = ''
  }
}

/**
 * The per-screen pickers share one handler rather than each getting a copy of the one above.
 *
 * Three near-identical file readers is how the third one ends up missing the downscale and
 * a 4MB photo lands in localStorage, which is the quota failure the roster already guards
 * against elsewhere.
 */
async function onScreenBgFileChange(e: Event, which: 'throw' | 'walkup') {
  const input = e.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file) return
  try {
    // A name rather than the ref itself: <script setup> unwraps top-level refs in the
    // template, so one passed from there arrives as its value and cannot be written back to.
    const scaled = await downscaleFile(file, BACKGROUND_MAX_PX)
    if (which === 'throw') throwBackground.value = scaled
    else walkupBackground.value = scaled
  } catch {
    alert('Could not read that image.')
  } finally {
    input.value = ''
  }
}

/** Falls back to the default background, so an unset screen previews what it will really show. */
function screenBgPreview(bg: string | null) {
  const shown = bg ?? playerBackground.value ?? bgImagePreview.value
  if (!shown) return {}
  if (shown.startsWith('data:') || shown.startsWith('http')) {
    return { backgroundImage: `url(${shown})`, backgroundSize: 'cover', backgroundPosition: 'center', backgroundRepeat: 'no-repeat', backgroundColor: '#000' }
  }
  return { background: shown }
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
  if (!videoEl.value) return
  // Downscaled before it is ever held: this is stored as a data URL inside the roster,
  // which shares a ~5MB localStorage budget, and it renders at avatar size.
  photoPreview.value = downscaleVideoFrame(videoEl.value)
  avatarUrl.value = photoPreview.value
  cameraOpen.value = false
}
function closeCamera() {
  stream?.getTracks().forEach(t => t.stop())
  stream = null
}
function resetForm() {
  editingId.value = null; name.value = ''; color.value = '#ffffff'; avatarUrl.value = null
  photoPreview.value = null; playerBackground.value = null; bgImagePreview.value = null; throwBackground.value = null; walkupBackground.value = null; bgMode.value = 'image'; targetLabelColor.value = null; pipColor.value = null; pipStyle.value = null; cricketTargetDisplay.value = 'show'; diceTheme.value = null; yahtzeeCard.value = null; saving.value = false
  playerBackgroundSize.value = null; playerBackgroundFill.value = null
  playerBackgroundPosition.value = null; playerBackgroundZoom.value = null
  throwBackgroundPosition.value = null; throwBackgroundZoom.value = null
  walkupBackgroundPosition.value = null; walkupBackgroundZoom.value = null
}
function loadPlayer(p: Player) {
  editingId.value = p.id; name.value = p.name; color.value = p.color
  photoPreview.value = p.avatarUrl?.startsWith('data:') || p.avatarUrl?.startsWith('http') ? p.avatarUrl : null
  avatarUrl.value = photoPreview.value
  playerBackground.value = p.playerBackground ?? null
  playerBackgroundSize.value = p.playerBackgroundSize ?? null
  playerBackgroundFill.value = p.playerBackgroundFill ?? null
  playerBackgroundPosition.value = p.playerBackgroundPosition ?? null
  playerBackgroundZoom.value = p.playerBackgroundZoom ?? null
  throwBackgroundPosition.value = p.throwBackgroundPosition ?? null
  throwBackgroundZoom.value = p.throwBackgroundZoom ?? null
  walkupBackgroundPosition.value = p.walkupBackgroundPosition ?? null
  walkupBackgroundZoom.value = p.walkupBackgroundZoom ?? null
  throwBackground.value = p.throwBackground ?? null
  walkupBackground.value = p.walkupBackground ?? null
  if (p.playerBackground?.startsWith('data:')) { bgMode.value = 'image'; bgImagePreview.value = p.playerBackground }
  else { bgMode.value = 'image'; bgImagePreview.value = null }

  targetLabelColor.value = p.targetLabelColor ?? null
  pipColor.value = p.pipColor ?? null
  pipStyle.value = p.pipStyle ?? null
  cricketTargetDisplay.value = p.cricketTargetDisplay ?? 'show'
  diceTheme.value = p.diceTheme ?? null
  yahtzeeCard.value = p.yahtzeeCard ?? null
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
    playersStore.updatePlayer(editingId.value, { name: name.value.trim(), color: color.value, avatarUrl: finalAvatar, playerBackground: bg, throwBackground: throwBackground.value, walkupBackground: walkupBackground.value, playerBackgroundSize: playerBackgroundSize.value, playerBackgroundPosition: playerBackgroundPosition.value, playerBackgroundFill: playerBackgroundFill.value, playerBackgroundZoom: playerBackgroundZoom.value, throwBackgroundPosition: throwBackgroundPosition.value, throwBackgroundZoom: throwBackgroundZoom.value, walkupBackgroundPosition: walkupBackgroundPosition.value, walkupBackgroundZoom: walkupBackgroundZoom.value, targetLabelColor: tlc, pipColor: pipColor.value, pipStyle: pipStyle.value, cricketTargetDisplay: ctd, diceTheme: diceTheme.value, yahtzeeCard: yahtzeeCard.value })
    editingId.value = null
  } else {
    const newPlayer = playersStore.addPlayer({ name: name.value.trim(), color: color.value, avatarUrl: finalAvatar, playerBackground: bg, throwBackground: throwBackground.value, walkupBackground: walkupBackground.value, playerBackgroundSize: playerBackgroundSize.value, playerBackgroundPosition: playerBackgroundPosition.value, playerBackgroundFill: playerBackgroundFill.value, playerBackgroundZoom: playerBackgroundZoom.value, throwBackgroundPosition: throwBackgroundPosition.value, throwBackgroundZoom: throwBackgroundZoom.value, walkupBackgroundPosition: walkupBackgroundPosition.value, walkupBackgroundZoom: walkupBackgroundZoom.value, targetLabelColor: tlc, pipColor: pipColor.value, pipStyle: pipStyle.value, cricketTargetDisplay: ctd, diceTheme: diceTheme.value, yahtzeeCard: yahtzeeCard.value, pinned: false })
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
  goBack(router)
}
</script>

<style scoped>
.page { display: flex; flex-direction: column; width: 100vw; height: 100dvh; height: 100dvh; overflow: hidden; }
.name-input { width: 100%; background: #1c1c22; border: 2px solid rgba(255,255,255,0.2);  padding: 12px 16px; color: #fff; font-size: 20px; font-family: inherit; outline: none; box-sizing: border-box; -webkit-appearance: none; }
.name-input:focus { border-color: var(--pink); }
.name-input::placeholder { color: rgba(255,255,255,0.35); }
.page-header {
  display: flex; align-items: center; justify-content: space-between; padding: 18px 32px;
  padding-top: calc(18px + env(safe-area-inset-top));
  border-bottom: 2px solid rgba(255,255,255,0.08);
  background: #141419; flex-shrink: 0;
}
.page-title { font-size: 26px; letter-spacing: 0.1em; background: linear-gradient(135deg, var(--blue), var(--purple)); -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text; }

.setup-body { flex: 1; display: flex; overflow: hidden; min-height: 0; }
.setup-form-scroll { flex: 1; min-height: 0; overflow-y: auto; -webkit-overflow-scrolling: touch; border-right: 2px solid rgba(255,255,255,0.06); }
.setup-form { padding: 28px; display: flex; flex-direction: column; gap: 24px; }
.setup-form .label { color: #ffffff; font-weight: 800; font-size: 18px; letter-spacing: 0.06em; text-transform: uppercase; }
.btn-outline { color: #ffffff !important; font-weight: 700 !important; border: 2px solid #ffffff !important; }


.field { display: flex; flex-direction: column; gap: 12px; padding-bottom: 8px; }

.bg-tabs, .avatar-tabs { display: flex; gap: 8px; }
.tab { padding: 8px 20px;  border: 2px solid #ffffff; background: transparent; color: #ffffff; font-size: 13px; font-weight: 700; cursor: pointer; transition: all 0.15s; position: relative; overflow: hidden; }

.tab.active { border-color: var(--pink); color: var(--pink); background: rgba(255,45,120,0.1); }

.bg-preview { width: 80px; height: 80px;  border: 2px solid rgba(255,255,255,0.1); display: flex; align-items: center; justify-content: center; flex-shrink: 0; overflow: hidden; }

.field-hint { font-size: 14px; color: var(--text-muted); margin: 0; line-height: 1.4; }

.color-conflict { font-size: 12px; color: #ff4444; font-weight: 700; }
/* Font color dropdown */
.color-dropdown-wrap { position: relative; }
.color-dropdown-btn {
  display: flex; align-items: center; gap: 10px;
  padding: 10px 16px; 
  border: 2px solid rgba(255,255,255,0.2);
  background: #1a1a20;
  color: #fff; font-size: 16px; font-weight: 700;
  cursor: pointer; transition: border-color 0.15s;
  width: 100%; text-align: left;
}

.color-dropdown-swatch { width: 22px; height: 22px; border-radius: 50%; flex-shrink: 0; display: block; }
.color-dropdown-label { flex: 1; letter-spacing: 0.05em; text-transform: uppercase; }
.color-dropdown-arrow { font-size: 10px; opacity: 0.6; }
.color-dropdown-menu {
  margin-top: 6px;
  padding: 10px;
  background: rgba(20,20,28,0.97);
  border: 2px solid rgba(255,255,255,0.12);
  
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  gap: 7px;
}
.color-swatch-sm {
  width: 32px; height: 32px; 
  cursor: pointer; transition: transform 0.12s, box-shadow 0.12s;
  position: relative; overflow: hidden;
}

.color-swatch-active { box-shadow: 0 0 0 3px #fff, 0 0 10px rgba(255,255,255,0.4) !important; transform: scale(1.12); }

.emoji-grid { display: flex; flex-wrap: wrap; gap: 8px; touch-action: pan-y; }
.emoji-btn { width: 50px; height: 50px;  border: 2px solid rgba(255,255,255,0.08); background: #16161c; font-size: 24px; cursor: pointer; transition: all 0.1s; position: relative; overflow: hidden; touch-action: pan-y; }

.emoji-btn.active { border-color: var(--pink); box-shadow: 3px 3px 0 rgba(0,0,0,0.5); }
.emoji-none-btn { color: rgba(255,255,255,0.4); font-size: 18px; font-weight: 700; }

.photo-area { display: flex; align-items: center; gap: 20px; flex-wrap: wrap; }
.photo-preview { width: 80px; height: 80px; border-radius: 50%; display: flex; align-items: center; justify-content: center; overflow: hidden; flex-shrink: 0; }
.photo-preview img { width: 100%; height: 100%; object-fit: cover; }

/*
 * Wider, with less padding, because the roster rows inside were starved.
 *
 * At 300px with 28px padding the name column worked out to 78px once the avatar and the
 * three action buttons had taken theirs — the buttons alone were 104px, more than the name
 * they sat beside. Two different players both rendered as "Pe…", which is worse than ugly:
 * you could not tell which row you were about to edit or delete.
 */
.setup-right { width: 340px; display: flex; flex-direction: column; gap: 20px; padding: 20px; overflow: hidden; flex-shrink: 0; }
.preview-card {  padding: 28px; display: flex; flex-direction: column; align-items: center; gap: 14px; transition: box-shadow 0.3s; }
.preview-avatar { width: 96px; height: 96px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 48px; overflow: hidden; }
.preview-avatar img { width: 100%; height: 100%; object-fit: cover; }
.preview-name { font-size: 22px; font-weight: 900; color: #fff; text-shadow: 0 2px 8px rgba(0,0,0,0.4); font-family: var(--font-display); letter-spacing: 0.05em; }

.existing-section { display: flex; flex-direction: column; gap: 10px; flex: 1; overflow: hidden; }
.existing-scroll { flex: 1; min-height: 0; overflow-y: auto; -webkit-overflow-scrolling: touch; overscroll-behavior: contain; }
.existing-list { display: flex; flex-direction: column; gap: 6px; }
.existing-row { display: flex; align-items: center; gap: 6px; padding: 10px 8px; background: #16161c; border: 2px solid rgba(255,255,255,0.08);  cursor: pointer; transition: all 0.15s; position: relative; overflow: hidden; }

.existing-row.pinned { border-color: rgba(245,158,11,0.4); background: rgba(245,158,11,0.06); }
.row-actions { display: flex; gap: 4px; flex-shrink: 0; align-items: center; }
.row-btn {
  width: 32px; height: 32px;  border: 2px solid rgba(255,255,255,0.1);
  background: #16161c; font-size: 14px; cursor: pointer;
  transition: all 0.15s; display: flex; align-items: center; justify-content: center;
  flex-shrink: 0; padding: 0; position: relative; overflow: hidden;
  filter: grayscale(1);
}

.edit-btn.active { filter: none; border-color: var(--pink); background: rgba(255,45,120,0.15); }
.existing-row.editing { border-color: rgba(255,45,120,0.4); background: rgba(255,45,120,0.06); }
.pin-btn.active { filter: none; border-color: rgba(245,158,11,0.5); background: rgba(245,158,11,0.12); }
.row-btn-danger { border-color: rgba(220,50,50,0.3); background: rgba(220,50,50,0.08); filter: none; }

.existing-info { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 2px; font-size: 14px; font-weight: 700; overflow: hidden; }
/*
 * The name may take a second line; the counters may not.
 *
 * Width alone is not enough — "Peezy F Baby" and "Peezy" still collide on one line, and the
 * point of this list is telling rows apart before you press edit or delete. Two lines, then
 * ellipsis, so a long name degrades to something still recognisable rather than to "Pe…".
 */
.existing-name {
  white-space: normal; overflow-wrap: anywhere;
  display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical;
  overflow: hidden; line-height: 1.2;
}
.existing-sub { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.roster-avatar { width: 34px; height: 34px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 17px; flex-shrink: 0; }

/* Camera dialog */
.camera-card { background: #1e1e1e; width: 560px; max-width: 95vw; border: 2px solid rgba(255,255,255,0.12);  overflow: hidden; }
.camera-header { display: flex; align-items: center; justify-content: space-between; }
.camera-feed { width: 100%; aspect-ratio: 4/3; object-fit: cover; background: #000; display: block; }
.camera-footer { padding: 20px; border-top: 2px solid rgba(255,255,255,0.08); }

.confirm-overlay {
  position: fixed; inset: 0; z-index: 300;
  background: rgba(0,0,0,0.75); backdrop-filter: blur(8px); -webkit-backdrop-filter: blur(8px);
  display: flex; align-items: center; justify-content: center; padding: 24px;
}
.confirm-panel {
  background: #111; border: 2px solid rgba(255,255,255,0.12); 
  padding: 32px 28px; width: 100%; max-width: 360px;
  display: flex; flex-direction: column; align-items: center; gap: 14px; text-align: center;
}
.confirm-avatar { width: 72px; height: 72px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 36px; overflow: hidden; flex-shrink: 0; }
.confirm-name { font-size: 24px; font-weight: 900; font-family: var(--font-display); letter-spacing: 0.05em; }
.confirm-msg { font-size: 14px; color: var(--text-muted); line-height: 1.5; margin: 0; }
.pinned-warn { color: #f59e0b; font-size: 13px; }
/* Amber, matching the warning it resolves — deliberately not styled as the destructive
   action, because unpinning is the safe step that precedes it. */
.unpin-btn { color: #f59e0b; border-color: rgba(245, 158, 11, 0.55); }

.confirm-btns { display: flex; gap: 12px; width: 100%; }
.confirm-btns .btn { flex: 1; }

.dice-dropdown-btn { font-size: 16px; }
.dice-dropdown-menu {
  margin-top: 6px;
  padding: 8px;
  background: rgba(20,20,28,0.97);
  border: 2px solid rgba(255,255,255,0.12);
  
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 5px;
  /*
   * Thirty-odd themes in a fixed 240px box, with the scrollbar hidden below, looked severed
   * rather than scrollable — the last row was sliced through and nothing said there was
   * more. Taller where the screen allows, and the fade tells you to keep going.
   */
  max-height: min(340px, 42dvh);
  overflow-y: auto;
  mask-image: linear-gradient(to bottom, #000 calc(100% - 22px), transparent 100%);
  -webkit-overflow-scrolling: touch;
  scrollbar-width: none;
}
.dice-dropdown-menu::-webkit-scrollbar { display: none; }
.dice-dropdown-item {
  display: flex; align-items: center; gap: 7px;
  padding: 8px 10px; 
  border: 2px solid transparent;
  background: #16161c;
  cursor: pointer; transition: all 0.12s;
  -webkit-tap-highlight-color: transparent;
}

.dice-dropdown-item.active { border-color: var(--pink); background: rgba(255,45,120,0.15); }
/* Square, not round: it stands for a die face, and a circle read as a colour picker. */
.dice-dropdown-item-swatch {
  width: 20px; height: 20px;  flex-shrink: 0;
  border: 2px solid rgba(255,255,255,0.28);
  box-shadow: inset 0 1px 0 rgba(255,255,255,0.22);
}
.dice-dropdown-item-label { font-size: 12px; font-weight: 800; font-family: var(--font-display); letter-spacing: 0.04em; color: #fff; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.dice-dropdown-item.active .dice-dropdown-item-label { color: var(--pink); }

.ct-player-opts { display: flex; gap: 8px; flex-wrap: nowrap; }
.ct-player-wrap { display: flex; flex-direction: column; align-items: center; gap: 5px; flex: 1; }
.ct-player-btn {
  width: 100%; padding: 12px 6px; 
  border: 2px solid #ffffff; background: transparent;
  cursor: pointer; transition: all 0.15s; display: flex;
  align-items: center; justify-content: center;
  position: relative; overflow: hidden;
  -webkit-tap-highlight-color: transparent;
}

.ct-player-btn.active { border-color: var(--pink); background: rgba(255,45,120,0.12); }
.ct-player-label { font-size: 14px; font-weight: 900; font-family: var(--font-display); letter-spacing: 0.06em; color: #fff; }
.ct-player-sub { font-size: 10px; font-weight: 700; letter-spacing: 0.04em; color: var(--text-muted); text-transform: uppercase; text-align: center; line-height: 1.3; }
.ct-player-btn.active .ct-player-label { color: var(--pink); }

/* The three scorecard inks, each swatch printed in its own stock so the button looks like
   the card it picks rather than describing it. */
.cardink-row { display: flex; gap: 8px; flex-wrap: wrap; }
.cardink-btn {
  flex: 1; min-width: 132px; padding: 10px;
  display: flex; flex-direction: column; align-items: flex-start; gap: 3px;
  border: 2px solid rgba(255,255,255,0.25); background: transparent;
  cursor: pointer; text-align: left; position: relative; overflow: hidden;
  -webkit-tap-highlight-color: transparent;
}
.cardink-btn.active { border-color: var(--pink); background: rgba(255,45,120,0.12); }
.cardink-swatch {
  width: 100%; height: 30px; margin-bottom: 3px;
  border: 2px solid var(--ink-edge);
  background-color: var(--ink-stock);
  background-image: var(--ink-texture);
  background-size: var(--ink-texture-size, auto);
}
.cardink-name { font-family: var(--font-display); font-size: 16px; letter-spacing: 0.04em; color: #fff; }
.cardink-sub { font-size: 12px; color: var(--text-muted); }
.cardink-street {
  --ink-stock: #101014; --ink-edge: #2a2a34;
  --ink-texture: radial-gradient(rgba(255,255,255,0.14) 1px, transparent 1px);
  --ink-texture-size: 5px 5px;
}
.cardink-paper {
  --ink-stock: #f2e8d0; --ink-edge: #6b5a3a;
  --ink-texture: repeating-linear-gradient(92deg, rgba(120,90,40,0.12) 0 2px, transparent 2px 5px);
}
.cardink-board {
  --ink-stock: #0a0d10; --ink-edge: rgba(0,212,255,0.45);
  --ink-texture: repeating-linear-gradient(180deg, rgba(0,212,255,0.18) 0 1px, transparent 1px 4px);
}

/* Background fit / fill — same shape as the closed-target buttons above. */
.bgfit-row { display: flex; gap: 8px; flex-wrap: wrap; }
.bgfit-btn {
  flex: 1; min-width: 96px; padding: 12px 10px; 
  border: 2px solid #ffffff; background: transparent;
  font-size: 14px; font-weight: 900; font-family: var(--font-display);
  letter-spacing: 0.06em; color: #fff;
  cursor: pointer; transition: all 0.15s;
  position: relative; overflow: hidden;
  -webkit-tap-highlight-color: transparent;
}

.bgfit-btn.active { border-color: var(--pink); background: rgba(255,45,120,0.12); color: var(--pink); }

/* Pip style: a live preview of the marks, in the colour already chosen above. */
.pipstyle-row { display: flex; gap: 8px; flex-wrap: wrap; }
.pipstyle-btn {
  flex: 1; min-width: 104px; display: flex; flex-direction: column; align-items: center; gap: 8px;
  padding: 12px 8px;  border: 2px solid #ffffff; background: transparent;
  cursor: pointer; transition: all 0.15s; position: relative; overflow: hidden;
  -webkit-tap-highlight-color: transparent;
}

.pipstyle-btn.active { border-color: var(--pink); background: rgba(255,45,120,0.12); }
.pipstyle-label { font-size: 13px; font-weight: 900; font-family: var(--font-display); letter-spacing: 0.05em; color: #fff; }
.pipstyle-btn.active .pipstyle-label { color: var(--pink); }
.pipstyle-preview { display: flex; gap: 4px; width: 100%; height: 26px; }
.pip-mini {
  flex: 1;  border: 2px solid var(--pip); background: var(--pip);
  display: flex; align-items: center; justify-content: center;
  font-size: 14px; font-weight: 900; font-family: var(--font-display); line-height: 1;
}
/* Each preview paints itself the way the board will. */
.pipstyle-preview.pips-marks .pip-mini { background: transparent; border-color: color-mix(in srgb, var(--pip) 45%, transparent); color: var(--pip); }
.pipstyle-preview.pips-dots .pip-mini { background: transparent; border-color: transparent; position: relative; }
.pipstyle-preview.pips-dots .pip-mini::after { content: ''; width: 42%; aspect-ratio: 1; border-radius: 50%; background: var(--pip); }
.pipstyle-preview.pips-outline .pip-mini { background: transparent; border-color: var(--pip); }

.fade-enter-active, .fade-leave-active { transition: opacity 0.2s; }
.fade-enter-from, .fade-leave-to { opacity: 0; }

@media (max-width: 767px) {
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
    overflow: hidden; border-top: 2px solid rgba(255,255,255,0.08);
  }
  .preview-card { display: none; }
  .existing-section { flex: 1; overflow: hidden; }
  .existing-scroll { flex: 1; overflow-y: auto; scrollbar-width: none; -webkit-overflow-scrolling: touch; }
  .existing-scroll::-webkit-scrollbar { display: none; }

  /* Compact form elements */
  .color-wheel-svg { max-width: min(280px, 80vw); }
  .theme-grid { grid-template-columns: repeat(5, 1fr); gap: 6px; }
  .theme-swatch { height: 44px; }
  .dice-dropdown-menu { grid-template-columns: repeat(2, 1fr); }
  .name-input { font-size: 17px; padding: 10px 14px; }
  .field { gap: 8px; }
}

/* iPad — compact layout, hide scrollbar, shrink color wheel */
@media (min-width: 768px) and (max-width: 1099px) {
  .setup-form-scroll { scrollbar-width: none; }
  .setup-form-scroll::-webkit-scrollbar { display: none; }
  .setup-form { padding: 18px 24px; gap: 16px; }
  .page-header { padding: 12px 24px; padding-top: calc(12px + env(safe-area-inset-top)); }
  .field { gap: 7px; }
  .color-wheel-svg { max-width: 220px; }
  /*
   * 240px is the width a landscape iPad actually gets, and it was the worst case: about
   * 34px of name once the avatar and the three buttons had taken theirs, which is where
   * "Pe…" came from. Widened rather than shrinking the buttons — they are touch targets and
   * are already only 32px. The form keeps ~680px here, which is more than it needs.
   */
  .setup-right { width: 320px; padding: 20px; gap: 14px; }
  .preview-avatar { width: 72px; height: 72px; font-size: 36px; }
}

/* ══════════════════════════════════════════════════════════════════════
   STREET TREATMENT — identical block in every view. Flat printed panels
   instead of glass: no blur, square corners, 2px rules, hard offset
   shadows, halftone grain. Adds only what the sweep cannot infer.
   Lift this into src/style.css once the look is settled.
   ══════════════════════════════════════════════════════════════════════ */
.display { text-shadow: 2px 2px 0 rgba(0,0,0,0.55); }
.glass-panel::before, .panel::before, .card::before {
  content: '';
  position: absolute; inset: 0; pointer-events: none; z-index: 0;
  background-image: radial-gradient(rgba(255,255,255,0.13) 0.7px, transparent 0.7px);
  background-size: 5px 5px;
  opacity: 0.5;
}
.glass-panel > *, .panel > *, .card > * { position: relative; z-index: 1; }
.toggle-thumb { border-radius: 0; box-shadow: 1px 1px 0 rgba(0,0,0,0.5); }

@media (hover: hover) and (pointer: fine) {
  .btn-outline:hover { color: var(--pink) !important; border-color: var(--pink) !important; }
  .tab:hover { border-color: var(--pink); color: var(--pink); }
  .color-dropdown-btn:hover { border-color: rgba(255,255,255,0.4); }
  .color-swatch-sm:hover { transform: scale(1.12); }
  .emoji-btn:hover { border-color: rgba(255,255,255,0.2); transform: scale(1.1); }
  .existing-row:hover { background: #1c1c22; }
  .row-btn:hover { filter: none; opacity: 0.85; }
  .row-btn-danger:hover { background: rgba(220,50,50,0.25); border-color: rgba(220,50,50,0.6); }
  .unpin-btn:hover { border-color: #f59e0b; }
  .dice-dropdown-item:hover { background: #222229; border-color: rgba(255,255,255,0.2); }
  .ct-player-btn:hover { border-color: var(--pink); background: rgba(255,45,120,0.08); }
  .bgfit-btn:hover { border-color: var(--pink); background: rgba(255,45,120,0.08); }
  .pipstyle-btn:hover { border-color: var(--pink); background: rgba(255,45,120,0.08); }
}
</style>
