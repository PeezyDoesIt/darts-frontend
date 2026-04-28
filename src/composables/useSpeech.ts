import { useSettingsStore } from '../stores/settings'

// Known male voice name fragments
const MALE_NAMES = ['David', 'Mark', 'Alex', 'Daniel', 'Fred', 'Ralph', 'Albert', 'Guy', 'James', 'Richard', 'George', 'Tom', 'Bruce', 'Bob', 'Lee', 'Reed', 'Ryan', 'Aaron', 'Liam', 'Nathan', 'Oliver']

// Known female voice name fragments
const FEMALE_NAMES = ['Zira', 'Samantha', 'Karen', 'Susan', 'Victoria', 'Fiona', 'Moira', 'Aria', 'Jenny', 'Hazel', 'Eva', 'Heera', 'Cortana', 'Microsoft Eva', 'Siri', 'Ava', 'Emma', 'Alice', 'Grace', 'Nicky', 'Catherine', 'Kate', 'Kyoko', 'Laura', 'Linda', 'Lisa', 'Marie', 'Martha', 'Monica', 'Nicole', 'Nora', 'Paulina', 'Petra', 'Sara', 'Serena', 'Stephanie', 'Tessa', 'Ting-Ting', 'Tracy', 'Veena', 'Xander', 'Yelena', 'Yuna', 'Zoe']

const SOUTHERN_ACCENT = 'en-US-southern'
const PIRATE_ACCENT = 'en-pirate'

// Pirate text transformation — replaces common words/phrases with pirate-speak
function pirateify(text: string): string {
  const replacements: [RegExp, string][] = [
    // Greetings / transitions
    [/\bit'?s your turn\b/gi, "it be yer turn"],
    [/\bhurry the fuck up\b/gi, "hurry it up, ye landlubber"],
    [/\bhurry up\b/gi, "make haste"],
    [/\bready to play some darts\?/gi, "ready to throw some darts, ye scallywag?"],
    [/\btesting\b/gi, "testin"],
    // Pronouns & articles
    [/\byou\b/gi, "ye"],
    [/\byour\b/gi, "yer"],
    [/\bmy\b/gi, "me"],
    [/\bthe\b/gi, "the"],
    [/\bis\b/gi, "be"],
    [/\bare\b/gi, "be"],
    [/\bwas\b/gi, "were"],
    // Common words
    [/\byes\b/gi, "aye"],
    [/\bhello\b/gi, "ahoy"],
    [/\bhi\b/gi, "ahoy"],
    [/\btheir\b/gi, "their"],
    [/\bthey\b/gi, "they"],
    [/\bhe\b/gi, "he"],
    [/\bshe\b/gi, "she"],
    [/\bwhat\b/gi, "what"],
    [/\bwhy\b/gi, "why"],
    [/\bnobody\b/gi, "no soul"],
    [/\beveryone\b/gi, "all ye crew"],
    [/\bplayer\b/gi, "scallywag"],
    [/\bplayers\b/gi, "scallywags"],
    [/\bturn\b/gi, "turn"],
    [/\bmissed\b/gi, "missed"],
    // Insults & flavour
    [/\bthis is why nobody wants to play darts with you\b/gi, "ye be bringin' shame upon this ship"],
    [/\bbe better\b/gi, "do better, ye barnacle"],
    [/\bone, two, three\b/gi, "one, two, three, shiver me timbers"],
  ]

  let result = text
  for (const [pattern, replacement] of replacements) {
    result = result.replace(pattern, replacement)
  }
  return result
}

function isMaleVoice(voice: SpeechSynthesisVoice): boolean {
  return MALE_NAMES.some(n => voice.name.toLowerCase().includes(n.toLowerCase()))
}

function isFemaleVoice(voice: SpeechSynthesisVoice): boolean {
  return FEMALE_NAMES.some(n => voice.name.toLowerCase().includes(n.toLowerCase()))
}

function selectVoice(gender: 'female' | 'male', accent: string): SpeechSynthesisVoice | null {
  const voices = window.speechSynthesis.getVoices()
  if (!voices.length) return null

  // Special accents map to real lang codes for voice selection
  let langAccent = accent
  if (accent === SOUTHERN_ACCENT) langAccent = 'en-US'
  if (accent === PIRATE_ACCENT) langAccent = 'en-GB' // West Country = closest to pirate

  console.log('[useSpeech] available voices:', voices.map(v => `${v.name} (${v.lang})`))
  console.log('[useSpeech] selecting gender:', gender, 'accent:', accent)

  const genderCheck = gender === 'female' ? isFemaleVoice : isMaleVoice
  const oppositeCheck = gender === 'female' ? isMaleVoice : isFemaleVoice

  // 1. Exact accent match + gender match
  const exactGender = voices.find(v => v.lang === langAccent && genderCheck(v))
  if (exactGender) { console.log('[useSpeech] picked (exact+gender):', exactGender.name); return exactGender }

  // 2. Exact accent match + not opposite gender (unknown/neutral)
  const exactNeutral = voices.find(v => v.lang === langAccent && !oppositeCheck(v))
  if (exactNeutral) { console.log('[useSpeech] picked (exact+neutral):', exactNeutral.name); return exactNeutral }

  // 3. Exact accent match, any voice
  const exactAny = voices.find(v => v.lang === langAccent)
  if (exactAny) { console.log('[useSpeech] picked (exact):', exactAny.name); return exactAny }

  // 4. Accent language prefix match + gender match (e.g. 'en-GB' → 'en')
  const prefix = langAccent.split('-')[0]
  const prefixGender = voices.find(v => v.lang.startsWith(prefix + '-') && genderCheck(v))
  if (prefixGender) { console.log('[useSpeech] picked (prefix+gender):', prefixGender.name); return prefixGender }

  // 5. Any English + gender match
  const anyEngGender = voices.find(v => v.lang.startsWith('en') && genderCheck(v))
  if (anyEngGender) { console.log('[useSpeech] picked (en+gender):', anyEngGender.name); return anyEngGender }

  // 6. Any English, not opposite gender
  const anyEngNeutral = voices.find(v => v.lang.startsWith('en') && !oppositeCheck(v))
  if (anyEngNeutral) { console.log('[useSpeech] picked (en+neutral):', anyEngNeutral.name); return anyEngNeutral }

  // 7. Any English voice
  const anyEng = voices.find(v => v.lang.startsWith('en'))
  if (anyEng) { console.log('[useSpeech] picked (any en):', anyEng.name); return anyEng }

  console.log('[useSpeech] no suitable voice found, using default')
  return null
}

function doSpeak(text: string, resolve: () => void) {
  const settings = useSettingsStore()
  const isSouthern = settings.voiceAccent === SOUTHERN_ACCENT
  const isPirate = settings.voiceAccent === PIRATE_ACCENT

  window.speechSynthesis.cancel()
  const spokenText = isPirate ? pirateify(text) : text
  const u = new SpeechSynthesisUtterance(spokenText)
  const voice = selectVoice(settings.voiceGender, settings.voiceAccent)
  if (voice) u.voice = voice

  if (isSouthern) {
    u.rate = settings.voiceGender === 'male' ? 0.68 : 0.72
    u.pitch = settings.voiceGender === 'male' ? 0.78 : 1.0
  } else if (isPirate) {
    // Gruff, growling pirate voice
    u.rate = settings.voiceGender === 'male' ? 0.78 : 0.82
    u.pitch = settings.voiceGender === 'male' ? 0.6 : 0.85
  } else {
    u.rate = 0.88
    u.pitch = settings.voiceGender === 'male' ? 0.85 : 1.15
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

// Utility: get all available English accent options from the browser
export function getAvailableAccents(): { label: string; value: string }[] {
  const ACCENT_LABELS: Record<string, string> = {
    'en-US': 'American (en-US)',
    'en-GB': 'British (en-GB)',
    'en-AU': 'Australian (en-AU)',
    'en-IN': 'Indian (en-IN)',
    'en-IE': 'Irish (en-IE)',
    'en-ZA': 'South African (en-ZA)',
    'en-CA': 'Canadian (en-CA)',
    'en-NZ': 'New Zealand (en-NZ)',
    'en-PH': 'Filipino (en-PH)',
    'en-SG': 'Singaporean (en-SG)',
  }

  const voices = window.speechSynthesis.getVoices()
  const found = new Set<string>()
  for (const v of voices) {
    if (v.lang.startsWith('en')) found.add(v.lang)
  }

  const result: { label: string; value: string }[] = []

  // Special accents — always show if a base en voice is available
  if (found.has('en-US')) {
    result.push({ label: 'Southern (en-US)', value: SOUTHERN_ACCENT })
  }
  if (found.size > 0) {
    result.push({ label: 'Pirate 🏴‍☠️', value: PIRATE_ACCENT })
  }

  for (const lang of found) {
    result.push({ label: ACCENT_LABELS[lang] ?? lang, value: lang })
  }

  result.sort((a, b) => a.label.localeCompare(b.label))
  return result
}
