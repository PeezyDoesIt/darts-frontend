import { useSettingsStore } from '../stores/settings'

const ALLOWED_VOICES = [
  // macOS / iOS
  'Karen', 'Zoe', 'Tessa', 'Allison', 'Samantha', 'Serena', 'Kate', 'Daniel', 'Moira', 'Fred', 'Rishi', 'Veena',
  // macOS character voices
  'Ralph', 'Bad News', 'Deranged', 'Hysterical', 'Bells', 'Boing', 'Bubbles', 'Cellos', 'Good News', 'Pipe Organ', 'Trinoids', 'Wobble', 'Zarvox',
  // Windows built-in (Edge reports short names; Chrome appends the language)
  'Microsoft Zira Desktop', 'Microsoft Zira Desktop - English (United States)',
  'Microsoft Hazel Desktop', 'Microsoft Hazel Desktop - English (Great Britain)',
  'Microsoft David Desktop', 'Microsoft David Desktop - English (United States)',
  'Microsoft Mark Desktop', 'Microsoft Mark Desktop - English (United States)',
  'Microsoft George Desktop', 'Microsoft George Desktop - English (Great Britain)',
  // Windows neural (online) — available in Edge; female voices listed first
  'Microsoft Aria Online (Natural) - English (United States)',
  'Microsoft Jenny Online (Natural) - English (United States)',
  'Microsoft Michelle Online (Natural) - English (United States)',
  'Microsoft Ana Online (Natural) - English (United States)',
  'Microsoft Emma Online (Natural) - English (United Kingdom)',
  'Microsoft Natasha Online (Natural) - English (Australia)',
  'Microsoft Guy Online (Natural) - English (United States)',
  'Microsoft Ryan Online (Natural) - English (United Kingdom)',
  'Microsoft William Online (Natural) - English (Australia)',
  // Chrome / Edge
  'Google UK English Female', 'Google UK English Male', 'Google US English',
]

const FEMALE_DEFAULTS = [
  'Microsoft Zira Desktop - English (United States)', // Windows / Chrome
  'Microsoft Zira Desktop',                           // Windows / Edge
  'Microsoft Aria Online (Natural) - English (United States)', // Edge neural
  'Samantha',                                         // macOS
  'Karen',                                            // macOS / iOS
]

function selectVoice(name: string): SpeechSynthesisVoice | null {
  const voices = window.speechSynthesis.getVoices()
  if (!voices.length) return null
  if (name) return voices.find(v => v.name === name) ?? voices.find(v => v.lang.startsWith('en')) ?? null
  // No preference set — try female defaults before falling back to any English voice
  for (const fn of FEMALE_DEFAULTS) {
    const v = voices.find(v => v.name === fn)
    if (v) return v
  }
  return voices.find(v => v.lang.startsWith('en')) ?? null
}

const PRONUNCIATIONS: [RegExp, string][] = [
  [/Neshaun/gi, 'Neshawn'],
  [/Meho/gi, 'Meh-oh'],
  [/Oh babyyy/gi, 'Ohhhhh, bay beeeeeeeee'],
  [/babyyy/gi, 'bay beeeeeeeee'],
]

function applyPronunciations(text: string): string {
  for (const [pattern, replacement] of PRONUNCIATIONS) {
    text = text.replace(pattern, replacement)
  }
  return text
}

function doSpeak(text: string, resolve: () => void, opts?: { rate?: number; pitch?: number }) {
  const settings = useSettingsStore()
  window.speechSynthesis.cancel()
  const u = new SpeechSynthesisUtterance(applyPronunciations(text))
  const voice = selectVoice(settings.voiceName)
  if (voice) u.voice = voice
  u.rate = opts?.rate ?? settings.voiceRate
  u.pitch = opts?.pitch ?? settings.voicePitch
  u.onend = () => resolve()
  window.speechSynthesis.speak(u)
}

export function speak(text: string, opts?: { rate?: number; pitch?: number }): Promise<void> {
  return new Promise(resolve => {
    const voices = window.speechSynthesis.getVoices()
    if (voices.length > 0) {
      doSpeak(text, resolve, opts)
    } else {
      window.speechSynthesis.onvoiceschanged = () => {
        window.speechSynthesis.onvoiceschanged = null
        doSpeak(text, resolve, opts)
      }
      setTimeout(() => doSpeak(text, resolve, opts), 600)
    }
  })
}

export type VoiceOption = { label: string; value: string; sublabel?: string }

export function getAvailableVoices(): VoiceOption[] {
  const voices = window.speechSynthesis.getVoices()
  const result: VoiceOption[] = []
  for (const name of ALLOWED_VOICES) {
    const v = voices.find(v => v.name === name)
    if (v) result.push({ label: v.name, value: v.name, sublabel: v.lang })
  }
  return result
}
