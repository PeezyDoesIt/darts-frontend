import type { Player } from '../types/index'

/**
 * How a player with no photo is drawn. Every screen used to pick its own fallback — 🎯 on
 * the darts and Yahtzee screens, 🎲 on the dice ones, 🂡 on Spades and a bare "?" in Left
 * Right Center — so the same person changed face depending on which game you opened.
 */
export const DEFAULT_AVATAR = '🎯'

/**
 * Whether `avatarUrl` holds an image to render rather than an emoji to print.
 *
 * `avatarUrl` carries three different things (see `Player` in types): an emoji while the
 * player has no photo, a data URL while signed out, or a signed/relative URL once the photo
 * lives in Storage. Only the last two belong in an <img>.
 */
export function isPhoto(url: string | null | undefined): boolean {
  if (!url) return false
  return url.startsWith('data:') || url.startsWith('http') || url.startsWith('/')
}

/**
 * The emoji to print when there is no photo — the player's own, or the house default.
 * Accepts a missing player so templates can call it on an optional/indexed value without
 * each one inventing its own fallback again.
 */
export function avatarGlyph(player: Pick<Player, 'avatarUrl'> | null | undefined): string {
  if (!player) return DEFAULT_AVATAR
  if (isPhoto(player.avatarUrl)) return ''
  return player.avatarUrl ?? DEFAULT_AVATAR
}

/**
 * Roster order for every player picker: pinned first, then whoever plays most. Setup screens
 * had drifted into two different tiebreakers, so the same roster came out in a different
 * order depending on the game.
 */
export function sortPlayersForPicker(players: Player[]): Player[] {
  return [...players].sort((a, b) => {
    if (a.pinned && !b.pinned) return -1
    if (!a.pinned && b.pinned) return 1
    return b.gamesPlayed - a.gamesPlayed
  })
}
