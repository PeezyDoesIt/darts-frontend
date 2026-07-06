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

// Preferred female voice name fragments, in priority order
const FEMALE_FRAGMENTS = ['Zira', 'Aria', 'Jenny', 'Michelle', 'Ana', 'Emma', 'Natasha', 'Samantha', 'Karen', 'Allison', 'Zoe', 'Tessa']

function selectVoice(name: string): SpeechSynthesisVoice | null {
  const voices = window.speechSynthesis.getVoices()
  if (!voices.length) return null
  if (name) return voices.find(v => v.name === name) ?? voices.find(v => v.lang.startsWith('en')) ?? null
  // No preference set — find a female English voice using partial name matching
  for (const fragment of FEMALE_FRAGMENTS) {
    const v = voices.find(v => v.name.includes(fragment) && v.lang.startsWith('en'))
    if (v) return v
  }
  return voices.find(v => v.lang.startsWith('en')) ?? null
}

const PRONUNCIATIONS: [RegExp, string][] = [
  [/Neshaun/gi, 'Neshawn'],
  [/Meho/gi, 'Meh-oh'],
  [/babyyy/gi, 'baby'],
  [/mothafuckin/gi, 'mothuhfuckin'],
  [/mothafucking/gi, 'mothuhfucking'],
]

function applyPronunciations(text: string): string {
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
  try { window.speechSynthesis.cancel() } catch {}
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
    const voice = selectVoice(settings.voiceName)
    if (voice) u.voice = voice
    u.rate = Math.max(0.1, opts?.rate ?? settings.voiceRate)
    u.pitch = opts?.pitch ?? settings.voicePitch
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
    function findFemaleVoice(voices: SpeechSynthesisVoice[]): SpeechSynthesisVoice | null {
      for (const fragment of FEMALE_FRAGMENTS) {
        const v = voices.find(v => v.name.includes(fragment) && v.lang.startsWith('en'))
        if (v) return v
      }
      return voices.find(v => v.lang.startsWith('en')) ?? null
    }

    function go() {
      const voices = window.speechSynthesis.getVoices()
      const voice = findFemaleVoice(voices)

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

const BLOCKED_VOICES = ['Good News', 'Bad News', 'Bubbles', 'Sandy', 'Junior', 'Whisper', 'Wobble']

export type VoiceOption = { label: string; value: string; sublabel?: string }

// Strip " - Language (Region)" suffix to get a base name for deduplication
function baseName(name: string): string {
  return name.replace(/\s*-\s*[A-Z][\w\s]+\([\w\s]+\)\s*$/, '').trim()
}

export function getAvailableVoices(): VoiceOption[] {
  const voices = window.speechSynthesis.getVoices()
  const seen = new Set<string>()
  return voices
    .filter(v => v.lang.startsWith('en') && !BLOCKED_VOICES.some(b => v.name.includes(b)))
    .filter(v => {
      const base = baseName(v.name)
      if (seen.has(base)) return false
      seen.add(base)
      return true
    })
    .map(v => ({ label: baseName(v.name), value: v.name, sublabel: v.lang }))
}
