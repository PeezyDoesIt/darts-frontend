import { useSettingsStore } from '../stores/settings'

// Known male voice name fragments
const MALE_NAMES = ['David', 'Mark', 'Alex', 'Daniel', 'Fred', 'Ralph', 'Albert', 'Guy', 'James', 'Richard', 'George', 'Tom', 'Bruce', 'Bob', 'Lee', 'Reed', 'Ryan', 'Aaron', 'Liam', 'Nathan', 'Oliver']

// Known female voice name fragments
const FEMALE_NAMES = ['Zira', 'Samantha', 'Karen', 'Susan', 'Victoria', 'Fiona', 'Moira', 'Aria', 'Jenny', 'Hazel', 'Eva', 'Heera', 'Cortana', 'Microsoft Eva', 'Siri', 'Ava', 'Emma', 'Alice', 'Grace', 'Nicky', 'Catherine', 'Kate', 'Kyoko', 'Laura', 'Linda', 'Lisa', 'Marie', 'Martha', 'Monica', 'Nicole', 'Nora', 'Paulina', 'Petra', 'Sara', 'Serena', 'Stephanie', 'Tessa', 'Ting-Ting', 'Tracy', 'Veena', 'Victoria', 'Xander', 'Yelena', 'Yuna', 'Zoe']

function isMaleVoice(voice: SpeechSynthesisVoice): boolean {
  return MALE_NAMES.some(n => voice.name.toLowerCase().includes(n.toLowerCase()))
}

function isFemaleVoice(voice: SpeechSynthesisVoice): boolean {
  return FEMALE_NAMES.some(n => voice.name.toLowerCase().includes(n.toLowerCase()))
}

function selectVoice(gender: 'female' | 'male', accent: string): SpeechSynthesisVoice | null {
  const voices = window.speechSynthesis.getVoices()
  if (!voices.length) return null

  console.log('[useSpeech] available voices:', voices.map(v => `${v.name} (${v.lang})`))
  console.log('[useSpeech] selecting gender:', gender, 'accent:', accent)

  const genderCheck = gender === 'female' ? isFemaleVoice : isMaleVoice
  const oppositeCheck = gender === 'female' ? isMaleVoice : isFemaleVoice

  // 1. Exact accent match + gender match
  const exactGender = voices.find(v => v.lang === accent && genderCheck(v))
  if (exactGender) { console.log('[useSpeech] picked (exact+gender):', exactGender.name); return exactGender }

  // 2. Exact accent match + not opposite gender (unknown/neutral)
  const exactNeutral = voices.find(v => v.lang === accent && !oppositeCheck(v))
  if (exactNeutral) { console.log('[useSpeech] picked (exact+neutral):', exactNeutral.name); return exactNeutral }

  // 3. Exact accent match, any voice
  const exactAny = voices.find(v => v.lang === accent)
  if (exactAny) { console.log('[useSpeech] picked (exact):', exactAny.name); return exactAny }

  // 4. Accent language prefix match + gender match (e.g. 'en-GB' → 'en')
  const prefix = accent.split('-')[0]
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
  window.speechSynthesis.cancel()
  const u = new SpeechSynthesisUtterance(text)
  const voice = selectVoice(settings.voiceGender, settings.voiceAccent)
  if (voice) u.voice = voice
  u.rate = 0.88
  u.pitch = settings.voiceGender === 'male' ? 0.85 : 1.15
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

  // Always include common ones even if not found, filter to only found
  const result: { label: string; value: string }[] = []
  for (const lang of found) {
    result.push({ label: ACCENT_LABELS[lang] ?? lang, value: lang })
  }
  result.sort((a, b) => a.label.localeCompare(b.label))
  return result
}
