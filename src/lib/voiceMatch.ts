/**
 * Resolving a saved voice preference against whatever voices this device actually has.
 *
 * The setting persists an exact `SpeechSynthesisVoice.name`, and those names are specific to
 * the platform that produced them. "Microsoft Zira Desktop - English (United States)" exists
 * on Windows and nowhere else; Zarvox, Deranged, Hysterical and Bad News are macOS novelty
 * voices. The roster also syncs across a phone and a tablet, so a preference picked on one is
 * routinely read on a device that has never heard of it.
 *
 * The previous behaviour was a single exact-name lookup, falling through to "the first
 * English voice in the list" when it missed. That is why a voice chosen on the iPad came out
 * as somebody else entirely on the phone, with nothing to indicate it had happened.
 *
 * Pure, and separate from useSpeech, so it can be tested against fabricated rosters for
 * Windows, macOS, iOS and Android rather than only against whatever this machine has
 * installed — the same reason listQuery is kept out of its route.
 */

export interface VoiceLike {
  name: string
  lang: string
}

/** How the returned voice was arrived at. `exact` is the only one that honoured the choice. */
export type MatchKind = 'exact' | 'base' | 'token' | 'preferred' | 'any' | 'none'

export interface VoiceMatch<V extends VoiceLike> {
  voice: V | null
  kind: MatchKind
}

/**
 * Fallbacks when there is no stored preference, in priority order. Fragments rather than
 * full names because the same voice is spelled differently per platform — "Samantha" on
 * iOS, "Microsoft Zira Desktop - English (United States)" on Windows Edge.
 */
export const PREFERRED_FRAGMENTS = [
  'Zira', 'Aria', 'Jenny', 'Michelle', 'Ana', 'Emma', 'Natasha',
  'Samantha', 'Karen', 'Allison', 'Zoe', 'Tessa',
]

const isEnglish = (v: VoiceLike) => v.lang?.toLowerCase().startsWith('en') ?? false

/**
 * Strips the language suffix platforms append to the same underlying voice.
 *
 *   'Microsoft Zira Desktop - English (United States)' -> 'microsoft zira desktop'
 *
 * Chrome appends it and Edge does not, so the identical voice on the identical machine can
 * be stored under two different names depending on which browser was open at the time.
 */
export function baseName(name: string): string {
  return name.split(' - ')[0]!.trim().toLowerCase()
}

/**
 * The part of a voice name that identifies it, with the vendor scaffolding removed.
 *
 *   'Microsoft Zira Desktop' -> 'zira'
 *
 * Used as the last resort before giving up on the stored choice, so a preference saved as a
 * Chrome-style name still finds its Edge-style twin.
 */
export function distinctiveToken(name: string): string {
  const noise = new Set(['microsoft', 'google', 'apple', 'desktop', 'online', 'natural', 'com', 'enhanced', 'premium', 'compact'])
  const words = baseName(name)
    .replace(/\(.*?\)/g, ' ')
    .split(/[\s._-]+/)
    .filter(w => w.length > 2 && !noise.has(w))
  return words[0] ?? ''
}

/**
 * Finds the closest available voice to a stored preference.
 *
 * The ladder matters more than any single rung: each step gives up a little less of the
 * user's choice than falling straight to "any English voice" did.
 */
export function resolveVoice<V extends VoiceLike>(
  voices: readonly V[],
  preferred: string,
  fragments: readonly string[] = PREFERRED_FRAGMENTS,
): VoiceMatch<V> {
  if (!voices.length) return { voice: null, kind: 'none' }

  const english = voices.filter(isEnglish)
  // Prefer English voices, but never refuse to speak just because none are tagged as English.
  const pool = english.length ? english : [...voices]

  if (preferred) {
    const exact = voices.find(v => v.name === preferred)
    if (exact) return { voice: exact, kind: 'exact' }

    const wantedBase = baseName(preferred)
    const base = pool.find(v => baseName(v.name) === wantedBase)
    if (base) return { voice: base, kind: 'base' }

    const token = distinctiveToken(preferred)
    if (token) {
      const byToken = pool.find(v => baseName(v.name).includes(token))
      if (byToken) return { voice: byToken, kind: 'token' }
    }
  }

  // Reached either because nothing was stored, or because what was stored is not on this
  // device. Both want the same voice; only the caller's interpretation differs, and `kind`
  // is what tells them apart.
  for (const fragment of fragments) {
    const v = pool.find(x => x.name.toLowerCase().includes(fragment.toLowerCase()))
    if (v) return { voice: v, kind: 'preferred' }
  }

  return { voice: pool[0] ?? null, kind: pool.length ? 'any' : 'none' }
}
