import { PLAYER_THEMES } from '../types/index'

/**
 * What colour the cricket target numbers are when a player has not chosen one.
 *
 * This lives here rather than inside CricketEntry because the setup screen has to show the
 * same answer: its "Auto" swatch would otherwise be a guess at what the board does, and the
 * two would drift the moment either changed. Which is the failure this codebase keeps
 * producing — a rule written down twice, then edited once.
 */

/** Themes dark enough that a complement washes out, so the labels go white instead. */
const WHITE_LABEL_THEMES = new Set<string | null>(
  PLAYER_THEMES
    .filter(t => ['Magma', 'Steel', 'Obsidian', 'Blood', 'Oil Slick', 'Midnight'].includes(t.label))
    .map(t => t.value as string | null),
)

/**
 * The opposite hue, floored at 70% lightness.
 *
 * The floor matters more than the hue: these sit on a dark board, and a complement of a dark
 * player colour is another dark colour, which is unreadable.
 */
export function complementaryColor(hex: string): string {
  if (!hex.startsWith('#') || hex.length < 7) return hex
  const r = parseInt(hex.slice(1, 3), 16) / 255
  const g = parseInt(hex.slice(3, 5), 16) / 255
  const b = parseInt(hex.slice(5, 7), 16) / 255
  const max = Math.max(r, g, b), min = Math.min(r, g, b)
  let h = 0, s = 0
  const l = (max + min) / 2
  if (max !== min) {
    const d = max - min
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min)
    if (max === r) h = ((g - b) / d + (g < b ? 6 : 0)) / 6
    else if (max === g) h = ((b - r) / d + 2) / 6
    else h = ((r - g) / d + 4) / 6
  }
  h = (h + 0.5) % 1
  const outL = Math.max(l, 0.70)
  return `hsl(${Math.round(h * 360)}, ${Math.round(s * 100)}%, ${Math.round(outL * 100)}%)`
}

/** The colour the board will use when `targetLabelColor` is null. */
export function autoTargetColor(playerColor: string | null | undefined, playerBackground: string | null | undefined): string {
  if (playerBackground && WHITE_LABEL_THEMES.has(playerBackground)) return '#ffffff'
  return playerColor ? complementaryColor(playerColor) : 'var(--pink)'
}

/** What the board shows: the player's pick if they made one, otherwise the automatic colour. */
export function resolveTargetColor(
  chosen: string | null | undefined,
  playerColor: string | null | undefined,
  playerBackground: string | null | undefined,
): string {
  return chosen || autoTargetColor(playerColor, playerBackground)
}
