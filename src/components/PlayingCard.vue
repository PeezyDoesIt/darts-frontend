<template>
  <button
    v-if="card"
    class="card"
    :class="[
      isJoker ? (jokerKind === 'big' ? 'joker-high' : 'joker-low') : suitClass,
      { playable, dimmed: !playable && interactive, faceDown },
    ]"
    :style="rootStyle"
    :disabled="interactive && !playable"
    :aria-label="ariaLabel"
    @click="interactive && playable && $emit('play', card)"
  >
    <template v-if="faceDown">
      <span class="back-mark">♠</span>
    </template>

    <!-- The two jokers must be distinguishable at a glance across a table: the high one
         is colored, the low one is greyscale, and both carry an explicit H / L. -->
    <template v-else-if="isJoker">
      <span class="corner tl">{{ label }}</span>
      <span class="joker-face">★</span>
      <span class="joker-word">{{ jokerKind === 'big' ? 'HIGH' : 'LOW' }}</span>
      <span class="corner br">{{ label }}</span>
    </template>

    <template v-else>
      <div v-if="theme === 'vintage' || theme === 'slate'" class="frame" />

      <!-- Corner index, drawn twice — the second turned upside down like a printed card.
           Suppressed under artwork, which prints its own. -->
      <div v-for="rot in HALVES" v-show="!artSrc" :key="rot" class="layer" :style="rot ? ROT180 : undefined">
        <span class="idx">
          <span class="idx-rank">{{ label }}</span>
          <span class="idx-suit">{{ symbol }}</span>
        </span>
      </div>

      <!-- Court cards carry a mark rather than a figure: a drawn king reads as a smudge
           at hand size, where a big suit or letter stays legible. -->
      <template v-if="isCourt">
        <!-- Bellot's artwork prints its own corner index and carries its own colour, so
             it replaces the whole face rather than layering onto the themed one. -->
        <template v-if="artSrc">
          <!-- The artwork is a whole printed card, so it gets its own stock underneath and
               a margin inside ours — full bleed pushed the figure into the printed index. -->
          <div class="art-stock" />
          <img class="court-art" :src="artSrc" alt="" />
        </template>
        <!-- Rank sits below the suit, never on it: anything centred on the glyph covers
             the one thing a Spades player has to read. Smaller suit than the ace, so a
             court and its ace still cannot be confused. -->
        <template v-else-if="courtStyle === 'suit'">
          <div class="court">
            <span class="court-big-suit">{{ symbol }}</span>
            <span class="court-under-rank">{{ label }}</span>
          </div>
        </template>
        <div v-else-if="courtStyle === 'medallion'" class="court">
          <div class="medallion">
            <span class="med-rank">{{ label }}</span>
            <span class="med-suit">{{ symbol }}</span>
          </div>
        </div>
        <div v-else class="court">
          <span class="court-rank">{{ label }}</span>
          <span class="court-suit">{{ symbol }}</span>
        </div>
      </template>

      <span v-if="rank === 14" class="pip-ace">{{ symbol }}</span>
      <span v-for="(p, i) in pips" :key="i" class="pip" :style="p.style">{{ symbol }}</span>
    </template>
  </button>
</template>

<script lang="ts">
// Exports live in a plain script block — <script setup> may not contain ES exports.
export type CardTheme = 'classic' | 'vintage' | 'bold' | 'neon' | 'ink' | 'midnight' | 'slate'
/** Only what the component actually draws — a name here that has no branch below
 *  silently falls through to the index treatment. */
export type CourtStyle = 'index' | 'medallion' | 'suit'

/**
 * Decks that can show the traditional court artwork. Two are deliberately excluded:
 * vintage, whose aged stock and serif ink read as a different century from Bellot's flat
 * colour, and ink, which is an occasional novelty deck and is meant to stay wholly itself.
 */
export const ART_CAPABLE: CardTheme[] = ['classic', 'bold', 'neon', 'midnight', 'slate']
</script>

<script setup lang="ts">
import { computed } from 'vue'
import { SUIT_SYMBOL, cardLabel, effectiveSuit, rankLabel, type Card } from '../lib/spades'

const props = withDefaults(defineProps<{
  card: Card | null
  width?: number
  theme?: CardTheme
  courtStyle?: CourtStyle
  /** Use the traditional court artwork instead of the themed court mark. */
  artCourts?: boolean
  /** Emits `play` and renders disabled styling when not playable. */
  interactive?: boolean
  playable?: boolean
  faceDown?: boolean
}>(), {
  width: 84, theme: 'ink', courtStyle: 'suit', artCourts: false,
  interactive: false, playable: true, faceDown: false,
})

const SUIT_FILE: Record<string, string> = {
  spades: 'spade', hearts: 'heart', diamonds: 'diamond', clubs: 'club',
}
const COURT_FILE: Record<number, string> = { 11: 'jack', 12: 'queen', 13: 'king' }

defineEmits<{ play: [card: Card] }>()

const HALVES = [0, 180] as const
const ROT180 = { transform: 'rotate(180deg)' }

/** Everything a theme changes, so a new deck is one entry rather than a pass over the CSS. */
const THEMES: Record<CardTheme, Record<string, string>> = {
  classic: {
    face: 'linear-gradient(160deg,#fffefb,#eceae4)', faceSolid: '#f6f4ee',
    border: '1px solid rgba(0,0,0,0.35)',
    radius: '6%/4%',
    font: "var(--font-display, system-ui)",
    red: '#d1122c', black: '#17171b',
    idxRank: '19cqw', idxSuit: '21cqw', glowRed: 'none', glowBlack: 'none',
  },
  vintage: {
    face: 'linear-gradient(160deg,#f8f1de,#e6d9bd)', faceSolid: '#f0e9d5',
    border: '1px solid rgba(80,60,30,0.5)',
    radius: '5%/3.5%',
    font: 'Georgia, "Times New Roman", serif',
    red: '#a8202a', black: '#2b2118',
    idxRank: '17cqw', idxSuit: '19cqw', glowRed: 'none', glowBlack: 'none',
  },
  bold: {
    face: '#ffffff', faceSolid: '#ffffff',
    border: '1px solid rgba(0,0,0,0.3)',
    radius: '8%/5.5%',
    font: "var(--font-display, system-ui)",
    red: '#e01b3c', black: '#101014',
    // Bebas is condensed, so Bold's index has to run larger than Vintage's serif to
    // carry the same weight on the card.
    idxRank: '30cqw', idxSuit: '25cqw', idxLeft: '14.5%', glowRed: 'none', glowBlack: 'none',
  },
  neon: {
    face: 'linear-gradient(160deg,#16162a,#0a0a12)', faceSolid: '#101020',
    border: '1px solid rgba(255,255,255,0.22)',
    radius: '8%/5.5%',
    font: "var(--font-display, system-ui)",
    red: '#ff2d78', black: '#00d4ff',
    idxRank: '20cqw', idxSuit: '21cqw',
    // The cyan is already the brightest thing on a dark face — a full glow on it turned
    // into a halo that ate the pip edges, so it gets a third of what the pink carries.
    glowRed: '0 0 9px currentColor', glowBlack: '0 0 3px currentColor',
  },
  ink: {
    face: 'linear-gradient(160deg,#141a2b,#0b0e18)', faceSolid: '#0f1422',
    border: '1px solid rgba(255,255,255,0.16)',
    radius: '8%/5.5%',
    font: "var(--font-display, system-ui)",
    red: '#ff7f9c', black: '#8fdcff',
    idxRank: '20cqw', idxSuit: '21cqw', glowRed: 'none', glowBlack: 'none',
  },
  midnight: {
    face: 'linear-gradient(160deg,#1e2333,#12151f)', faceSolid: '#181c29',
    border: '1px solid rgba(255,255,255,0.2)',
    radius: '7%/5%',
    font: "var(--font-display, system-ui)",
    red: '#ff8b93', black: '#e3e9f7',
    idxRank: '20cqw', idxSuit: '21cqw', glowRed: 'none', glowBlack: 'none',
  },
  slate: {
    face: 'linear-gradient(160deg,#262a31,#16181d)', faceSolid: '#1e2127',
    border: '1px solid rgba(255,255,255,0.18)',
    radius: '6%/4%',
    font: "var(--font-display, system-ui)",
    red: '#f2946b', black: '#ece2c8',
    idxRank: '19cqw', idxSuit: '21cqw', glowRed: 'none', glowBlack: 'none',
  },
}

/**
 * Standard pip arrangements in the 100 × 145 face grid.
 *
 * A pip box is as tall as its font-size and ~0.59 as wide, which sets the spacing:
 * columns sit at 28 / 50 / 72 so a centre pip clears the side columns horizontally —
 * without that the 7, 8 and 9 collide, since their centre pip sits between two side rows.
 * The four-row ranks (9, 10) are the only layouts whose vertical pitch is tight, so they
 * take a smaller pip and every other rank carries a much larger one.
 * Rows mirror about 72.5, so a pip below the line prints upside down as on a real card.
 */
const L = 30, C = 50, R = 70
const PIP_LAYOUT: Record<number, [number, number][]> = {
  2:  [[C, 33], [C, 112]],
  3:  [[C, 33], [C, 72.5], [C, 112]],
  4:  [[L, 33], [R, 33], [L, 112], [R, 112]],
  5:  [[L, 33], [R, 33], [C, 72.5], [L, 112], [R, 112]],
  6:  [[L, 33], [R, 33], [L, 72.5], [R, 72.5], [L, 112], [R, 112]],
  7:  [[L, 33], [R, 33], [C, 52.75], [L, 72.5], [R, 72.5], [L, 112], [R, 112]],
  8:  [[L, 33], [R, 33], [C, 52.75], [L, 72.5], [R, 72.5], [C, 92.25], [L, 112], [R, 112]],
  9:  [[L, 31], [R, 31], [L, 58], [R, 58], [C, 72.5], [L, 87], [R, 87], [L, 114], [R, 114]],
  10: [[L, 31], [R, 31], [C, 45.5], [L, 58], [R, 58], [L, 87], [R, 87], [C, 99.5], [L, 114], [R, 114]],
}

const isJoker = computed(() => props.card?.kind === 'joker')
// The template cannot narrow the Card union, so the discriminant is resolved here.
const jokerKind = computed(() => (props.card?.kind === 'joker' ? props.card.joker : null))
const rank = computed(() => (props.card?.kind === 'pip' ? props.card.rank : 0))
const isCourt = computed(() => rank.value >= 11 && rank.value <= 13)
/** Path to the court artwork, or null when this card is not an art court. */
const artSrc = computed(() => {
  const c = props.card
  if (!props.artCourts || c?.kind !== 'pip') return null
  if (!ART_CAPABLE.includes(props.theme)) return null
  const suit = SUIT_FILE[c.suit], rank = COURT_FILE[c.rank]
  return suit && rank ? `/cards/${suit}_${rank}.png` : null
})
const isRed = computed(() => {
  const c = props.card
  return c?.kind === 'pip' && (c.suit === 'hearts' || c.suit === 'diamonds')
})
/** Only the four-row ranks are tight enough to need the smaller pip. */
const pipSize = computed(() => (rank.value === 9 || rank.value === 10 ? '26cqw' : '32cqw'))
const pips = computed(() =>
  (PIP_LAYOUT[rank.value] ?? []).map(([x, y]) => ({
    style: {
      left: `${x}%`,
      top: `${((y / 145) * 100).toFixed(3)}%`,
      transform: y > 72.5 ? 'translate(-50%, -50%) rotate(180deg)' : 'translate(-50%, -50%)',
    },
  }))
)
const label = computed(() => (props.card ? cardLabel(props.card) : ''))
/**
 * "10" is the only two-character rank. At the shared size it is nearly twice as wide as
 * every other index and, being centred, grows into the pip column. The cap is absolute
 * rather than a share of each theme's base: bold sets its index at 30cqw, where a
 * proportional cut still leaves the "10" crossing into the pips.
 */
const TWO_CHAR_MAX = 19
const idxRankSize = computed(() => {
  const base = THEMES[props.theme] ?? THEMES.classic
  return label.value.length > 1
    ? `${Math.min(parseFloat(base.idxRank!) * 0.72, TWO_CHAR_MAX).toFixed(1)}cqw`
    : base.idxRank!
})
const symbol = computed(() =>
  props.card && props.card.kind === 'pip' ? SUIT_SYMBOL[props.card.suit] : ''
)
const suitClass = computed(() => (isRed.value ? 'red' : 'black'))
const rootStyle = computed(() => {
  const t = THEMES[props.theme] ?? THEMES.classic
  return {
    width: `${props.width}px`,
    height: `${Math.round(props.width * 1.45)}px`,
    '--face': t.face,
    '--bd': t.border,
    '--radius': t.radius,
    '--card-font': t.font,
    '--idx-rank': t.idxRank,
    '--idx-rank-size': idxRankSize.value,
    '--idx-suit': t.idxSuit,
    '--idx-left': t.idxLeft ?? '14%',
    '--face-solid': t.faceSolid,
    '--glow': isRed.value ? t.glowRed : t.glowBlack,
    '--pip': pipSize.value,
    color: isRed.value ? t.red : t.black,
  }
})
const ariaLabel = computed(() => {
  const c = props.card
  if (!c) return ''
  if (props.faceDown) return 'Face-down card'
  if (c.kind === 'joker') return `${c.joker === 'big' ? 'High' : 'Low'} joker, counts as a spade`
  return `${rankLabel(c.rank)} of ${effectiveSuit(c)}`
})
</script>

<style scoped>
.card {
  position: relative;
  flex-shrink: 0;
  container-type: inline-size;
  border-radius: var(--radius, 6%/4%);
  border: var(--bd, 1px solid rgba(0,0,0,0.35));
  background: var(--face, linear-gradient(160deg, #fffefb, #eceae4));
  box-shadow: 0 2px 6px rgba(0,0,0,0.45);
  padding: 0;
  overflow: hidden;
  cursor: default;
  font-family: var(--card-font, var(--font-display, system-ui));
  transition: transform 0.12s ease, box-shadow 0.12s ease, opacity 0.12s ease;
}
.card.playable { cursor: pointer; }
.card.playable:hover, .card.playable:focus-visible {
  transform: translateY(-14px);
  box-shadow: 0 10px 18px rgba(0,0,0,0.55);
  outline: none;
  z-index: 2;
}
.card.playable:focus-visible { box-shadow: 0 0 0 3px var(--gold), 0 10px 18px rgba(0,0,0,0.55); }
/*
 * An illegal card stays visible but is clearly out of play, so the rule teaches itself.
 *
 * It has to stay *readable* to teach anything, and it did not. At 0.34 on a near-black
 * table the pips went to black — a hand of hearts and diamonds looked like a row of empty
 * slots, so you could not see what you were holding, only what you could play. Dimmer than
 * playable is the point; invisible is not.
 */
.card.dimmed { opacity: 0.62; filter: grayscale(0.35); }
.card.faceDown {
  background: repeating-linear-gradient(45deg, #1d2b53, #1d2b53 5px, #24357a 5px, #24357a 10px);
  display: flex; align-items: center; justify-content: center;
}
.back-mark { color: rgba(255,255,255,0.4); font-size: 20px; }

.frame {
  position: absolute; inset: 3% 4.5%; border: 1px solid currentColor;
  opacity: 0.28; border-radius: 2%; pointer-events: none;
}
.layer { position: absolute; inset: 0; }
.idx {
  position: absolute; left: var(--idx-left, 14%); top: 8%; transform: translateX(-50%);
  display: flex; flex-direction: column; align-items: center; line-height: 1;
}
.idx-rank { font-size: var(--idx-rank-size, var(--idx-rank, 19cqw)); font-weight: 900; }
.idx-suit { font-size: var(--idx-suit, 21cqw); margin-top: 0.06em; }

.court {
  position: absolute; inset: 0; display: flex; flex-direction: column;
  align-items: center; justify-content: center; gap: 0.06em; line-height: 0.88;
}
/* Sized against the suit's ink (~35cqw), not the card: a badge near 42cqw hides the
   glyph completely, and a court card showing no suit is the worse misread in a game
   about following suit. At 22cqw it sits inside the glyph core. */
.art-stock {
  position: absolute; inset: 0; background: #fdfcf8;
  border-radius: inherit;
}
.court-art {
  position: absolute; inset: 4%; width: 92%; height: 92%;
  object-fit: contain;
}
.court-under-rank { font-size: 22cqw; font-weight: 900; letter-spacing: 0.04em; }
.court-rank { font-size: 44cqw; font-weight: 800; letter-spacing: 0.02em; }
.medallion {
  width: 60cqw; height: 60cqw; border-radius: 50%; border: 2px solid currentColor;
  display: flex; flex-direction: column; align-items: center; justify-content: center;
  gap: 0.02em; line-height: 0.82;
}
.med-rank { font-size: 30cqw; font-weight: 800; }
.med-suit { font-size: 26cqw; }
.court-suit { font-size: 46cqw; }

.pip { position: absolute; font-size: var(--pip, 34cqw); line-height: 1; text-shadow: var(--glow, none); }
.pip-ace {
  position: absolute; left: 50%; top: 50%; transform: translate(-50%, -50%);
  font-size: 74cqw; line-height: 1; text-shadow: var(--glow, none);
}
/* A shade under the ace, which also keeps the two apart at a glance. */
.court-big-suit { font-size: 52cqw; line-height: 1; text-shadow: var(--glow, none); }

.corner {
  position: absolute; font-weight: 800; line-height: 1;
  font-size: clamp(11px, 22cqw, 17px); display: flex; flex-direction: column; align-items: center;
}
.tl { top: 5%; left: 7%; }
.br { bottom: 5%; right: 7%; transform: rotate(180deg); }

.red  { color: #d1122c; }
.black { color: #17171b; }

/* High joker — full colour. */
.joker-high {
  background: linear-gradient(150deg, #ffd166, #ff5fa2 55%, #6f5cff);
  color: #1a0f2e;
  border-color: rgba(255,255,255,0.5);
}
/* Low joker — deliberately greyscale, matching the physical card. */
.joker-low {
  background: linear-gradient(150deg, #fbfbfb, #b9b9b9);
  color: #17171b;
}
.joker-face {
  position: absolute; inset: 0; display: flex; align-items: center; justify-content: center;
  font-size: clamp(18px, 40cqw, 28px);
}
.joker-word {
  position: absolute; bottom: 21%; left: 0; right: 0; text-align: center;
  font-size: clamp(7px, 15cqw, 10px); font-weight: 900; letter-spacing: 0.12em;
  opacity: 0.85;
}
</style>
