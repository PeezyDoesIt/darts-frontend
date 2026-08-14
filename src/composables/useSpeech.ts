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

/**
 * Apple's novelty and character voices, under every name they have shipped under.
 *
 * The list used to hold five, and three of those were names Apple had already retired:
 * Deranged became Wobble, Hysterical became Jester, and Pipe Organ became Organ. So on any
 * current iPad those three entries matched nothing at all, and the voices that had replaced
 * them were unrecognised — they appeared, if at all, as bare names filed under American.
 *
 * Both spellings are kept because an older device still has the old ones, and matching a
 * name that is not there costs nothing.
 */
const CHARACTER_VOICES: { name: string; label: string; sublabel: string }[] = [
  // Novelty — the singing and shouting ones.
  { name: 'Zarvox',     label: 'Zarvox',     sublabel: 'Robotic alien' },
  { name: 'Trinoids',   label: 'Trinoids',   sublabel: 'Alien chorus' },
  { name: 'Wobble',     label: 'Wobble',     sublabel: 'Unhinged' },
  { name: 'Deranged',   label: 'Deranged',   sublabel: 'Unhinged' },
  { name: 'Jester',     label: 'Jester',     sublabel: 'Manic' },
  { name: 'Hysterical', label: 'Hysterical', sublabel: 'Manic' },
  { name: 'Bad News',   label: 'Bad News',   sublabel: 'Ominous — sung as a dirge' },
  { name: 'Good News',  label: 'Good News',  sublabel: 'Cheerful fanfare' },
  { name: 'Organ',      label: 'Organ',      sublabel: 'Musical tones' },
  { name: 'Pipe Organ', label: 'Pipe Organ', sublabel: 'Musical tones' },
  { name: 'Cellos',     label: 'Cellos',     sublabel: 'Sung over cellos' },
  { name: 'Bells',      label: 'Bells',      sublabel: 'Sung through bells' },
  { name: 'Boing',      label: 'Boing',      sublabel: 'Springy' },
  { name: 'Bubbles',    label: 'Bubbles',    sublabel: 'Underwater' },
  { name: 'Bahh',       label: 'Bahh',       sublabel: 'Sheep' },
  { name: 'Whisper',    label: 'Whisper',    sublabel: 'Whispered' },
  { name: 'Albert',     label: 'Albert',     sublabel: 'Small and squeaky' },
  { name: 'Superstar',  label: 'Superstar',  sublabel: 'Theatrical' },
  { name: 'Princess',   label: 'Princess',   sublabel: 'Theatrical' },
  { name: 'Junior',     label: 'Junior',     sublabel: 'Young' },
  { name: 'Ralph',      label: 'Ralph',      sublabel: 'Gravelly' },
  { name: 'Kathy',      label: 'Kathy',      sublabel: 'Flat and dry' },
  { name: 'Fred',       label: 'Fred',       sublabel: 'Old-school Mac' },
  // Character — newer, natural-sounding, and the ones worth using for a whole game.
  { name: 'Eddy',       label: 'Eddy',       sublabel: 'Character voice' },
  { name: 'Flo',        label: 'Flo',        sublabel: 'Character voice' },
  { name: 'Grandma',    label: 'Grandma',    sublabel: 'Character voice' },
  { name: 'Grandpa',    label: 'Grandpa',    sublabel: 'Character voice' },
  { name: 'Reed',       label: 'Reed',       sublabel: 'Character voice' },
  { name: 'Rocko',      label: 'Rocko',      sublabel: 'Character voice' },
  { name: 'Sandy',      label: 'Sandy',      sublabel: 'Character voice' },
  { name: 'Shelley',    label: 'Shelley',    sublabel: 'Character voice' },
]

/**
 * iOS ships these with the locale in the name — "Rocko (English (US))" — while macOS ships
 * them bare. Matching both is what makes the same list work on the iPad and the laptop.
 */
function matchesCharacter(voiceName: string, characterName: string): boolean {
  return voiceName === characterName || voiceName.startsWith(`${characterName} (`)
}


/** en-GB → British, so the list reads as accents rather than locale codes. */
const LOCALE_NAMES: Record<string, string> = {
  'en-us': 'American', 'en-gb': 'British', 'en-au': 'Australian', 'en-ie': 'Irish',
  'en-in': 'Indian', 'en-za': 'South African', 'en-nz': 'New Zealand', 'en-ca': 'Canadian',
  'en-sg': 'Singaporean', 'en-hk': 'Hong Kong', 'en-ph': 'Filipino', 'en-ng': 'Nigerian',
  'en-ke': 'Kenyan', 'en-tz': 'Tanzanian', 'en-scotland': 'Scottish',
}

function accentOf(lang: string): string {
  return LOCALE_NAMES[lang.toLowerCase()] ?? lang
}

/**
 * Strips the platform's boilerplate off a voice name.
 *
 * Windows ships "Microsoft David - English (United States)" and Chrome ships "Google UK
 * English Male". The vendor and the locale are noise in a list where every row is a voice
 * and the accent is already shown beside it.
 */
function tidyVoiceName(name: string): string {
  return name
    .replace(/^(Microsoft|Google|Apple)\s+/i, '')
    .replace(/\s*[-–]\s*English.*$/i, '')
    .replace(/\s*\(.*\)\s*$/, '')
    .replace(/\bEnglish\b/gi, '')
    .replace(/\s{2,}/g, ' ')
    .trim() || name
}

/**
 * Every English voice the device has, not a hand-picked handful.
 *
 * This used to return Default plus whichever of two named voices happened to exist, plus one
 * Australian and one British pick. On a Windows machine with David, Mark and Zira installed
 * it offered exactly one of them — so "choose a voice" was a choice between Default and Zira,
 * and the other two were unreachable. Since the voice is now the only narrator setting that
 * changes what you hear, hiding most of them is hiding the whole feature.
 *
 * Character voices keep their friendly labels and stay at the top; the rest are grouped by
 * accent, because two American voices differ far less than an American and a Scottish one.
 */
export function getAvailableVoices(
  // Takes the roster rather than only reading the global, so the grouping and the name
  // tidying can be tested against fabricated Windows, macOS and Android rosters — the CI
  // runner has no speech engine at all, and a test that can only run on a laptop is not
  // protecting anything.
  voices: SpeechSynthesisVoice[] = window.speechSynthesis.getVoices(),
): VoiceOption[] {
  const result: VoiceOption[] = [
    { label: 'Default', value: '', sublabel: 'Auto-selected narrator' },
  ]

  const claimed = new Set<string>()

  /*
   * Character voices first, with their descriptions.
   *
   * The stored value is the voice's real name, locale suffix and all, because that is what
   * has to be handed back to the speech engine — only the label is tidied. Storing the tidy
   * name would save a preference that resolves to nothing.
   */
  for (const c of CHARACTER_VOICES) {
    const match = voices.find(v => matchesCharacter(v.name, c.name))
    if (match && !claimed.has(match.name)) {
      result.push({ label: c.label, value: match.name, sublabel: c.sublabel })
      claimed.add(match.name)
    }
  }

  const english = voices.filter(v => v.lang && v.lang.toLowerCase().startsWith('en') && !claimed.has(v.name))

  // Grouped by accent, and the groups ordered by how many voices they hold, so the accents
  // this device actually supports well come first.
  const byAccent = new Map<string, SpeechSynthesisVoice[]>()
  for (const v of english) {
    const accent = accentOf(v.lang)
    if (!byAccent.has(accent)) byAccent.set(accent, [])
    byAccent.get(accent)!.push(v)
  }

  for (const [accent, group] of [...byAccent.entries()].sort((a, b) => b[1].length - a[1].length)) {
    for (const v of group) {
      result.push({ label: tidyVoiceName(v.name), value: v.name, sublabel: accent })
    }
  }

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
