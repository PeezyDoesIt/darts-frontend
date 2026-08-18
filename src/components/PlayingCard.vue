<template>
  <button
    v-if="card"
    class="card"
    :class="[
      isJoker ? 'joker' : suitClass,
      { playable, dimmed: !playable && interactive, faceDown, selected },
      interactive ? `oop-${outOfPlay}` : null,
    ]"
    :style="rootStyle"
    :disabled="interactive && !playable"
    :aria-label="ariaLabel"
    @click="interactive && playable && $emit('play', card)"
  >
    <template v-if="faceDown">
      <span class="back-mark">♠</span>
    </template>

    <!-- The deck prints the SAME figure on both jokers — its only difference is the ink of
         the printed corner word, which is invisible at hand size. So the low one is drained
         and both carry a tape label: colour for the glance, word for the check. The tape is
         bottom-left because the card prints JOKER top-left and bottom-right. -->
    <template v-else-if="isJoker">
      <div class="art-stock" />
      <img class="joker-art" :class="{ drained: jokerKind !== 'big' }" :src="jokerArt" alt="" />
      <span class="joker-tape" :class="jokerKind === 'big' ? 'tape-high' : 'tape-low'">
        {{ jokerKind === 'big' ? 'HIGH' : 'LOW' }}
      </span>
    </template>

    <template v-else>
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
export type CardTheme = 'classic' | 'bold'

/** How a card that cannot legally be played is shown. Never a fade: see the CSS note. */
export type OutOfPlay = 'sunk' | 'taped'
/** Only what the component actually draws — a name here that has no branch below
 *  silently falls through to the index treatment. */
export type CourtStyle = 'index' | 'medallion' | 'suit'

/**
 * Every remaining deck prints on light stock and can carry the traditional artwork, so this
 * is now a formality — kept because the deck picker still asks before switching the courts
 * on, and a future deck may not be able to. The five that could not (or read wrong against
 * Bellot's flat colour) are parked, not deleted.
 */
export const ART_CAPABLE: CardTheme[] = ['classic', 'bold']
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
  /**
   * Picked out of the hand but not yet played. On a phone thirteen cards can only overlap to
   * a ~24px sliver each, which is under the 44px target minimum — so a tap lifts the card
   * clear of its neighbours first and the second tap plays it. Nothing is ever played blind.
   */
  selected?: boolean
  /** 'sunk' (default) lifts the playable cards; 'taped' strikes the rest instead. */
  outOfPlay?: OutOfPlay
  playable?: boolean
  faceDown?: boolean
}>(), {
  // Bellot is the deck: classic stock with the traditional courts already on.
  width: 84, theme: 'classic', courtStyle: 'suit', artCourts: true,
  interactive: false, playable: true, faceDown: false, selected: false, outOfPlay: 'sunk',
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
/** Both jokers carry the same drawing; only the printed corner word's ink differs. */
const jokerArt = computed(() =>
  jokerKind.value === 'big' ? '/cards/joker_red.png' : '/cards/joker_black.png'
)
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
.card.playable:focus-visible {
  transform: translateY(-14px);
  box-shadow: 0 10px 18px rgba(0,0,0,0.55);
  outline: none;
  z-index: 2;
}
/* Hover is a mouse idea — on the iPad it must never be the only way to see something. */
@media (hover: hover) and (pointer: fine) {
  .card.playable:hover {
    transform: translateY(-14px);
    box-shadow: 0 10px 18px rgba(0,0,0,0.55);
    outline: none;
    z-index: 2;
  }
}
/* Picked, not yet played: the same lift the Sunk treatment uses, reused as a selection. */
.card.selected {
  transform: translateY(-26px);
  outline: 3px solid #aaff00;
  outline-offset: -1px;
  box-shadow: 0 12px 20px rgba(0,0,0,0.6);
  z-index: 3;
}
.card.playable:focus-visible { box-shadow: 0 0 0 3px var(--gold), 0 10px 18px rgba(0,0,0,0.55); }
/* An illegal card stays visible but is clearly out of play, so the rule teaches itself. */
/*
 * Nothing fades. A 34% fade on a dark deck collapsed the card into the table and lost its
 * edge, which is the fault this replaced: an unplayable card should read as DOWN, not as
 * absent. Playable cards lift out of the hand instead, or the rest get taped.
 */
.card.dimmed { opacity: 1; filter: none; }
.card.oop-sunk.playable {
  transform: translateY(-14px); z-index: 2;
  outline: 3px solid #aaff00; outline-offset: -1px;
}
/* Black tape on Street's terms: flat stock, the same halftone the panels carry, a hard offset
   shadow, square torn ends running past the card edge, and laid off-true like a real strip. */
.card.oop-taped.dimmed::after {
  content: '';
  position: absolute; top: 50%; left: -14%; width: 128%; height: 11%;
  transform: translateY(-50%) rotate(-9deg);
  background-color: #101014;
  background-image: radial-gradient(rgba(255,255,255,0.14) 0.7px, transparent 0.7px);
  background-size: 5px 5px;
  border-top: 2px solid rgba(255,255,255,0.15);
  border-bottom: 2px solid rgba(0,0,0,0.85);
  box-shadow: 0 3px 0 rgba(0,0,0,0.5);
  pointer-events: none; z-index: 3;
}
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

/* Both jokers print on the deck's own light stock — the drawing is the card. */
.joker { border-color: rgba(0,0,0,0.35); }
.joker-art {
  position: absolute; inset: 4%; width: 92%; height: 92%; object-fit: contain;
}
/* The low joker is the same figure as the high one, so it loses its colour: a difference
   you catch without reading. Solid, not faded — the card keeps full contrast. */
.joker-art.drained { filter: saturate(0) contrast(1.06); }
.joker-tape {
  position: absolute; left: 5%; bottom: 4.5%; transform: rotate(-3deg);
  padding: 2px 7px 1px; background: #101014;
  font-size: clamp(9px, 13cqw, 18px); font-weight: 400; letter-spacing: 0.1em;
  box-shadow: 2px 2px 0 rgba(0,0,0,0.5);
}
.tape-high { color: #aaff00; }
.tape-low { color: rgba(255,255,255,0.9); }
</style>
