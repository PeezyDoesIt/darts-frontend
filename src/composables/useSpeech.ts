import { useSettingsStore } from '../stores/settings'

const SOUTHERN_ACCENT = 'en-US-southern'
const PIRATE_ACCENT   = 'en-pirate'
const SENSUAL_ACCENT  = 'en-sensual'
const ASIAN_ACCENT    = 'en-asian'

// Female voice name fragments — used for sensual mode voice selection
const FEMALE_NAMES = ['Samantha', 'Ava', 'Nicky', 'Karen', 'Fiona', 'Moira', 'Tessa', 'Veena',
  'Zira', 'Eva', 'Susan', 'Victoria', 'Jenny', 'Hazel', 'Heera', 'Aria', 'Siri',
  'Emma', 'Alice', 'Grace', 'Catherine', 'Kate', 'Laura', 'Linda', 'Lisa',
  'Marie', 'Martha', 'Monica', 'Nicole', 'Nora', 'Sara', 'Serena', 'Stephanie',
  'Tracy', 'Yuna', 'Zoe', 'Shelley', 'Sandy', 'Allison']

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

function findFemaleVoice(voices: SpeechSynthesisVoice[]): SpeechSynthesisVoice | null {
  const en = voices.filter(v => v.lang.startsWith('en'))
  // Prefer known female names
  for (const name of FEMALE_NAMES) {
    const v = en.find(v => v.name.toLowerCase().includes(name.toLowerCase()))
    if (v) return v
  }
  return en[0] ?? null
}

function findAsianVoice(voices: SpeechSynthesisVoice[]): SpeechSynthesisVoice | null {
  // Prefer Singaporean English → Indian English → any Asian-accented English
  const bySG  = voices.find(v => v.lang === 'en-SG')
  if (bySG) return bySG
  const byIN  = voices.find(v => v.lang === 'en-IN')
  if (byIN) return byIN
  // Some devices have Asian-named English voices
  const named = voices.find(v => v.lang.startsWith('en') &&
    /rishi|lekha|moana|satu|yuna|sin.?ji|ting|mei|li.?na/i.test(v.name))
  if (named) return named
  // Last resort: any English
  return voices.find(v => v.lang.startsWith('en')) ?? null
}

function selectVoice(name: string): SpeechSynthesisVoice | null {
  const voices = window.speechSynthesis.getVoices()
  if (!voices.length) return null

  if (name === SOUTHERN_ACCENT || name === '') {
    return voices.find(v => v.lang === 'en-US') ?? voices.find(v => v.lang.startsWith('en')) ?? null
  }
  if (name === PIRATE_ACCENT) {
    return voices.find(v => v.lang === 'en-GB') ?? voices.find(v => v.lang.startsWith('en')) ?? null
  }
  if (name === SENSUAL_ACCENT) {
    return findFemaleVoice(voices)
  }
  if (name === ASIAN_ACCENT) {
    return findAsianVoice(voices)
  }

  // Direct name match
  return voices.find(v => v.name === name) ?? voices.find(v => v.lang.startsWith('en')) ?? null
}

function doSpeak(text: string, resolve: () => void) {
  const settings = useSettingsStore()
  const vn = settings.voiceName

  window.speechSynthesis.cancel()
  const spokenText = vn === PIRATE_ACCENT ? pirateify(text) : text
  const u = new SpeechSynthesisUtterance(spokenText)
  const voice = selectVoice(vn)
  if (voice) u.voice = voice

  if (vn === SOUTHERN_ACCENT) {
    u.rate = 0.70; u.pitch = 0.9
  } else if (vn === PIRATE_ACCENT) {
    u.rate = 0.78; u.pitch = 0.65
  } else if (vn === SENSUAL_ACCENT) {
    // Slow, breathy, lower pitch — intimate feel
    u.rate = 0.72; u.pitch = 0.82
  } else if (vn === ASIAN_ACCENT) {
    // Slightly faster, higher pitch — characteristic of many Asian English accents
    u.rate = 0.90; u.pitch = 1.2
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

export function getAvailableVoices(): VoiceOption[] {
  const voices = window.speechSynthesis.getVoices()
  const enVoices = voices.filter(v => v.lang.startsWith('en'))

  const result: VoiceOption[] = []

  // Special modes
  if (enVoices.length > 0) {
    result.push({ label: 'Sensual 💋',   value: SENSUAL_ACCENT, sublabel: 'Slow & sultry female' })
    result.push({ label: 'Asian Accent', value: ASIAN_ACCENT,   sublabel: 'Singaporean / Indian English' })
    result.push({ label: 'Southern',     value: SOUTHERN_ACCENT, sublabel: 'American drawl' })
    result.push({ label: 'Pirate 🏴‍☠️',   value: PIRATE_ACCENT,  sublabel: 'Arrr, matey' })
  }

  // All English voices by name
  for (const v of enVoices) {
    result.push({ label: v.name, value: v.name, sublabel: v.lang })
  }

  return result
}
