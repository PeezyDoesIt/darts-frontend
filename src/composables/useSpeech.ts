import { useSettingsStore } from '../stores/settings'
import { resolveVoice } from '../lib/voiceMatch'

/**
 * The stored preference is an exact SpeechSynthesisVoice.name, and those are platform
 * specific — so on any other device it simply will not be there. This used to fall straight
 * to "the first English voice", which is how a voice picked on the iPad turned into somebody
 * else on the phone. resolveVoice walks a ladder instead, and is tested against fabricated
 * Windows, macOS, iOS and Android rosters rather than only this machine's.
 */
function selectVoice(name: string): SpeechSynthesisVoice | null {
  return resolveVoice(window.speechSynthesis.getVoices(), name).voice
}

const PRONUNCIATIONS: [RegExp, string][] = [
  [/Neshaun/gi, 'nuh shawn'],
  [/Meho/gi, 'meh hoe'],
  [/babyyy/gi, 'baby'],
  [/mothafuckin/gi, 'mothuhfuckin'],
  [/mothafucking/gi, 'mothuhfucking'],
  [/Beremiah/gi, 'bear uh maya'],
  [/Beremy/gi, 'bear uh mee'],
  [/\bTony\b/gi, 'Tohnee'],
  [/\bButta\b/gi, 'Buh duh'],
]

function applyPronunciations(text: string): string {
  // Single uppercase letters are announced as "capital X" by TTS — lowercase them so they're just read as the letter
  text = text.replace(/\b([A-Z])\b/g, (_, l) => l.toLowerCase())
  for (const [pattern, replacement] of PRONUNCIATIONS) {
    text = text.replace(pattern, replacement)
  }
  return text
}

let _pendingSpeakTimer: ReturnType<typeof setTimeout> | null = null
let _pendingVoiceTimer: ReturnType<typeof setTimeout> | null = null

export function cancelPendingSpeak(): void {
  if (_pendingSpeakTimer !== null) { clearTimeout(_pendingSpeakTimer); _pendingSpeakTimer = null }
  if (_pendingVoiceTimer !== null) { clearTimeout(_pendingVoiceTimer); _pendingVoiceTimer = null }
  window.speechSynthesis.onvoiceschanged = null
  try { window.speechSynthesis.cancel() } catch { /* speech synthesis is not on every platform, and a failure here is not actionable */ }
}

function doSpeak(text: string, resolve: () => void, opts?: { rate?: number; pitch?: number }) {
  const settings = useSettingsStore()
  // Chrome bug: cancel() while paused can corrupt the queue.
  // resume() first, then cancel() clears cleanly, then a delay before speak().
  window.speechSynthesis.resume()
  if (window.speechSynthesis.speaking || window.speechSynthesis.pending) {
    window.speechSynthesis.cancel()
  }
  if (_pendingSpeakTimer !== null) clearTimeout(_pendingSpeakTimer)
  _pendingSpeakTimer = setTimeout(() => {
    _pendingSpeakTimer = null
    window.speechSynthesis.resume()
    const u = new SpeechSynthesisUtterance(applyPronunciations(text))
    const { voiceName, pitch: genderPitch } = parseVoiceValue(settings.voiceName, settings.narratorGender)
    const voice = selectVoice(voiceName)
    if (voice) u.voice = voice
    u.rate = Math.max(0.1, opts?.rate ?? settings.voiceRate)
    u.pitch = genderPitch ?? (opts?.pitch ?? settings.voicePitch)
    u.onend = () => resolve()
    u.onerror = () => resolve()
    window.speechSynthesis.speak(u)
  }, 120)
}

export function speak(text: string, opts?: { rate?: number; pitch?: number }): Promise<void> {
  return new Promise(resolve => {
    const voices = window.speechSynthesis.getVoices()
    if (voices.length > 0) {
      doSpeak(text, resolve, opts)
    } else {
      let done = false
      const go = () => { if (done) return; done = true; doSpeak(text, resolve, opts) }
      window.speechSynthesis.onvoiceschanged = () => { window.speechSynthesis.onvoiceschanged = null; go() }
      if (_pendingVoiceTimer !== null) clearTimeout(_pendingVoiceTimer)
      _pendingVoiceTimer = setTimeout(() => { _pendingVoiceTimer = null; go() }, 1000)
    }
  })
}

export function speakOhBaby(): Promise<void> {
  return new Promise(resolve => {
    function go() {
      // This one ignores the stored preference on purpose — the bit is the voice, not the
      // narrator. Passing no preference walks straight to the preferred-fragment list, which
      // is what the duplicated findFemaleVoice here used to do by hand.
      const voice = resolveVoice(window.speechSynthesis.getVoices(), '').voice

      window.speechSynthesis.cancel()

      const u = new SpeechSynthesisUtterance('Ooooh baby')
      u.rate = 0.22; u.pitch = 1.2
      if (voice) u.voice = voice
      u.onend = () => resolve()

      window.speechSynthesis.speak(u)
    }

    if (window.speechSynthesis.getVoices().length > 0) {
      go()
    } else {
      let done = false
      const once = () => { if (done) return; done = true; go() }
      window.speechSynthesis.onvoiceschanged = () => { window.speechSynthesis.onvoiceschanged = null; once() }
      setTimeout(once, 1000)
    }
  })
}

export type VoiceOption = { label: string; value: string; sublabel?: string }

// Voices that respond to gender pitch-shifting
const GENDERED_VOICES = new Set(['Deranged', 'Hysterical', 'Bad News'])

const CHARACTER_VOICES: { name: string; label: string; sublabel: string }[] = [
  { name: 'Zarvox',     label: 'Zarvox',      sublabel: 'Robotic alien' },
  { name: 'Deranged',   label: 'Deranged',    sublabel: 'Unhinged' },
  { name: 'Hysterical', label: 'Hysterical',  sublabel: 'Manic' },
  { name: 'Bad News',   label: 'Bad News',    sublabel: 'Ominous' },
  { name: 'Pipe Organ', label: 'Pipe Organ',  sublabel: 'Musical tones' },
]

// Curated standard voices to show in the picker (checked by partial name match)
const CURATED_VOICE_FRAGMENTS: { fragment: string; label: string; sublabel: string }[] = [
  { fragment: 'Samantha', label: 'Samantha', sublabel: 'System voice' },
  { fragment: 'Zira',     label: 'Zira',     sublabel: 'System voice' },
]

// Priority-ordered name fragments for finding a good Australian voice
const AU_FRAGMENTS = ['Natasha', 'Karen', 'Lee', 'Mitchell']
// Priority-ordered name fragments for finding a good British voice
const GB_FRAGMENTS = ['Emma', 'Ryan', 'Daniel', 'Kate', 'Hazel', 'George', 'Oliver']

function findLocaleVoice(voices: SpeechSynthesisVoice[], fragments: string[], lang: string): SpeechSynthesisVoice | null {
  // Prefer a named match (usually higher quality Natural/online voices)
  for (const frag of fragments) {
    const v = voices.find(v => v.name.includes(frag) && v.lang.startsWith(lang))
    if (v) return v
  }
  // Fall back to any voice with the right locale
  return voices.find(v => v.lang.startsWith(lang)) ?? null
}

export function getAvailableVoices(): VoiceOption[] {
  const voices = window.speechSynthesis.getVoices()
  const result: VoiceOption[] = [
    { label: 'Default', value: '', sublabel: 'Auto-selected narrator' },
  ]

  // Add curated character voices (macOS-specific fun voices)
  for (const c of CHARACTER_VOICES) {
    if (voices.some(v => v.name === c.name)) {
      result.push({ label: c.label, value: c.name, sublabel: c.sublabel })
    }
  }

  // Add Samantha and Zira if available on this device
  for (const { fragment, label, sublabel } of CURATED_VOICE_FRAGMENTS) {
    const match = voices.find(v => v.name.includes(fragment) && v.lang.startsWith('en'))
    if (match) result.push({ label, value: match.name, sublabel })
  }

  // Australian accent
  const auVoice = findLocaleVoice(voices, AU_FRAGMENTS, 'en-AU')
  if (auVoice) result.push({ label: 'Australian', value: auVoice.name, sublabel: auVoice.name })

  // British accent
  const gbVoice = findLocaleVoice(voices, GB_FRAGMENTS, 'en-GB')
  if (gbVoice) result.push({ label: 'British', value: gbVoice.name, sublabel: gbVoice.name })

  return result
}

// Parse stored voice value — gender now comes from settings, not the value string
export function parseVoiceValue(value: string, gender?: 'female' | 'male'): { voiceName: string; pitch?: number } {
  // Legacy format "Deranged:female" — still handle gracefully
  if (value.includes(':')) {
    const [voiceName, g] = value.split(':')
    const pitch = g === 'female' ? 1.45 : g === 'male' ? 0.55 : undefined
    return { voiceName: voiceName ?? '', pitch }
  }
  const pitch = GENDERED_VOICES.has(value)
    ? (gender === 'male' ? 0.55 : 1.45)
    : undefined
  return { voiceName: value, pitch }
}
