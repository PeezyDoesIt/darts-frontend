import { describe, expect, it } from 'vitest'
import { baseName, distinctiveToken, resolveVoice, type VoiceLike } from '../../src/lib/voiceMatch'

/**
 * Real rosters, near enough. The point of these is that a preference saved on one of them
 * has to survive being read on another — that is the actual failure the app hit, with a
 * voice chosen on the iPad coming out as somebody else on the phone.
 */
const WINDOWS_EDGE: VoiceLike[] = [
  { name: 'Microsoft David Desktop', lang: 'en-US' },
  { name: 'Microsoft Zira Desktop', lang: 'en-US' },
  { name: 'Microsoft Hazel Desktop', lang: 'en-GB' },
]

const WINDOWS_CHROME: VoiceLike[] = [
  { name: 'Microsoft David Desktop - English (United States)', lang: 'en-US' },
  { name: 'Microsoft Zira Desktop - English (United States)', lang: 'en-US' },
]

const MACOS: VoiceLike[] = [
  { name: 'Samantha', lang: 'en-US' },
  { name: 'Karen', lang: 'en-AU' },
  { name: 'Zarvox', lang: 'en-US' },
  { name: 'Deranged', lang: 'en-US' },
]

const ANDROID: VoiceLike[] = [
  { name: 'English United States', lang: 'en-US' },
  { name: 'English United Kingdom', lang: 'en-GB' },
]

const NON_ENGLISH_ONLY: VoiceLike[] = [
  { name: 'Amelie', lang: 'fr-CA' },
  { name: 'Anna', lang: 'de-DE' },
]

describe('baseName', () => {
  it('strips the language suffix Chrome appends and Edge does not', () => {
    expect(baseName('Microsoft Zira Desktop - English (United States)')).toBe('microsoft zira desktop')
    expect(baseName('Microsoft Zira Desktop')).toBe('microsoft zira desktop')
  })
})

describe('distinctiveToken', () => {
  it('drops vendor scaffolding and keeps the identifying word', () => {
    expect(distinctiveToken('Microsoft Zira Desktop')).toBe('zira')
    expect(distinctiveToken('Microsoft Aria Online (Natural) - English (United States)')).toBe('aria')
  })

  it('leaves a bare name alone', () => {
    expect(distinctiveToken('Samantha')).toBe('samantha')
  })
})

describe('resolveVoice', () => {
  it('honours an exact match', () => {
    const { voice, kind } = resolveVoice(WINDOWS_EDGE, 'Microsoft Zira Desktop')
    expect(voice?.name).toBe('Microsoft Zira Desktop')
    expect(kind).toBe('exact')
  })

  it('matches the same voice across Chrome and Edge naming', () => {
    // The same voice on the same machine, stored under whichever name the browser reported.
    const { voice, kind } = resolveVoice(WINDOWS_EDGE, 'Microsoft Zira Desktop - English (United States)')
    expect(voice?.name).toBe('Microsoft Zira Desktop')
    expect(kind).toBe('base')
  })

  it('keeps a female choice female when crossing Windows -> macOS', () => {
    // Zira does not exist on macOS. The old code took the first English voice, which is
    // David-equivalent as often as not. A preferred-list voice is the closest honest answer.
    const { voice, kind } = resolveVoice(MACOS, 'Microsoft Zira Desktop')
    expect(voice?.name).toBe('Samantha')
    expect(kind).toBe('preferred')
  })

  it('does not silently hand back a male voice when the choice was female', () => {
    const { voice } = resolveVoice(WINDOWS_EDGE, 'Samantha')
    expect(voice?.name).not.toBe('Microsoft David Desktop')
    expect(voice?.name).toBe('Microsoft Zira Desktop')
  })

  it('reports a macOS character voice as unavailable rather than pretending', () => {
    // Zarvox is macOS-only. It has to fall back, but `kind` has to admit that it did.
    const { voice, kind } = resolveVoice(WINDOWS_EDGE, 'Zarvox')
    expect(kind).not.toBe('exact')
    expect(voice).not.toBeNull()
  })

  it('still picks something on a device with no preferred voice at all', () => {
    const { voice, kind } = resolveVoice(ANDROID, 'Microsoft Zira Desktop')
    expect(voice?.name).toBe('English United States')
    expect(kind).toBe('any')
  })

  it('uses the preferred list when nothing is stored', () => {
    const { voice, kind } = resolveVoice(MACOS, '')
    expect(voice?.name).toBe('Samantha')
    expect(kind).toBe('preferred')
  })

  it('never returns a voice when there are none', () => {
    expect(resolveVoice([], 'Samantha')).toEqual({ voice: null, kind: 'none' })
  })

  it('speaks in a non-English voice rather than staying silent', () => {
    // Refusing to speak is worse than speaking in the wrong accent.
    const { voice } = resolveVoice(NON_ENGLISH_ONLY, 'Samantha')
    expect(voice?.name).toBe('Amelie')
  })

  it('prefers an English voice over a non-English one', () => {
    const mixed = [...NON_ENGLISH_ONLY, ...MACOS]
    const { voice } = resolveVoice(mixed, '')
    expect(voice?.name).toBe('Samantha')
  })

  it('matches Chrome naming from a stored Edge name', () => {
    const { voice, kind } = resolveVoice(WINDOWS_CHROME, 'Microsoft Zira Desktop')
    expect(voice?.name).toBe('Microsoft Zira Desktop - English (United States)')
    expect(kind).toBe('base')
  })
})
