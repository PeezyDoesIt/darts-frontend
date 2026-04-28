import { useSettingsStore } from '../stores/settings'

const SOUTHERN_ACCENT = 'en-US-southern'
const PIRATE_ACCENT   = 'en-pirate'

// Pirate text transformation
function pirateify(text: string): string {
  const replacements: [RegExp, string][] = [
    [/\bit'?s your turn\b/gi,                                        "it be yer turn"],
    [/\bhurry the fuck up\b/gi,                                       "hurry it up, ye landlubber"],
    [/\bhurry up\b/gi,                                                "make haste"],
    [/\bready to play some darts\?/gi,                                "ready to throw some darts, ye scallywag?"],
    [/\btesting\b/gi,                                                 "testin"],
    [/\byou\b/gi,                                                     "ye"],
    [/\byour\b/gi,                                                    "yer"],
    [/\bmy\b/gi,                                                      "me"],
    [/\bis\b/gi,                                                      "be"],
    [/\bare\b/gi,                                                     "be"],
    [/\bwas\b/gi,                                                     "were"],
    [/\byes\b/gi,                                                     "aye"],
    [/\bhello\b/gi,                                                   "ahoy"],
    [/\bnobody\b/gi,                                                  "no soul"],
    [/\beveryone\b/gi,                                                "all ye crew"],
    [/\bplayer\b/gi,                                                  "scallywag"],
    [/\bplayers\b/gi,                                                 "scallywags"],
    [/\bthis is why nobody wants to play darts with you\b/gi,         "ye be bringin' shame upon this ship"],
    [/\bbe better\b/gi,                                               "do better, ye barnacle"],
    [/\bone, two, three\b/gi,                                         "one, two, three, shiver me timbers"],
  ]
  let result = text
  for (const [pattern, replacement] of replacements) result = result.replace(pattern, replacement)
  return result
}

function selectVoice(name: string): SpeechSynthesisVoice | null {
  const voices = window.speechSynthesis.getVoices()
  if (!voices.length) return null

  // Special accent keys resolve to a lang-based search
  if (name === SOUTHERN_ACCENT || name === '') {
    return voices.find(v => v.lang === 'en-US') ?? voices.find(v => v.lang.startsWith('en')) ?? null
  }
  if (name === PIRATE_ACCENT) {
    return voices.find(v => v.lang === 'en-GB') ?? voices.find(v => v.lang.startsWith('en')) ?? null
  }

  // Direct name match
  return voices.find(v => v.name === name) ?? voices.find(v => v.lang.startsWith('en')) ?? null
}

function doSpeak(text: string, resolve: () => void) {
  const settings = useSettingsStore()
  const isPirate   = settings.voiceName === PIRATE_ACCENT
  const isSouthern = settings.voiceName === SOUTHERN_ACCENT

  window.speechSynthesis.cancel()
  const spokenText = isPirate ? pirateify(text) : text
  const u = new SpeechSynthesisUtterance(spokenText)
  const voice = selectVoice(settings.voiceName)
  if (voice) u.voice = voice

  if (isSouthern) {
    u.rate = 0.70; u.pitch = 0.9
  } else if (isPirate) {
    u.rate = 0.78; u.pitch = 0.65
  } else {
    u.rate = 0.88; u.pitch = 1.0
  }

  u.onend = () => resolve()
  window.speechSynthesis.speak(u)
}

export function speak(text: string): Promise<void> {
  return new Promise(resolve => {
    const voices = window.speechSynthesis.getVoices()
    if (voices.length > 0) {
      doSpeak(text, resolve)
    } else {
      window.speechSynthesis.onvoiceschanged = () => {
        window.speechSynthesis.onvoiceschanged = null
        doSpeak(text, resolve)
      }
      setTimeout(() => doSpeak(text, resolve), 600)
    }
  })
}

export type VoiceOption = { label: string; value: string; sublabel?: string }

// Returns all selectable voice options: special modes first, then every available voice by name
export function getAvailableVoices(): VoiceOption[] {
  const voices = window.speechSynthesis.getVoices()
  const enVoices = voices.filter(v => v.lang.startsWith('en'))

  const result: VoiceOption[] = []

  // Special modes
  if (enVoices.some(v => v.lang === 'en-US')) {
    result.push({ label: 'Southern', value: SOUTHERN_ACCENT, sublabel: 'American drawl' })
  }
  if (enVoices.length > 0) {
    result.push({ label: 'Pirate 🏴‍☠️', value: PIRATE_ACCENT, sublabel: 'Arrr, matey' })
  }

  // All English voices by name
  for (const v of enVoices) {
    result.push({ label: v.name, value: v.name, sublabel: v.lang })
  }

  return result
}
