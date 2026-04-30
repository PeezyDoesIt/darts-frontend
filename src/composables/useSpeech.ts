import { useSettingsStore } from '../stores/settings'

const ALLOWED_VOICES = ['Karen', 'Daniel', 'Moira', 'Fred', 'Rishi']

function selectVoice(name: string): SpeechSynthesisVoice | null {
  const voices = window.speechSynthesis.getVoices()
  if (!voices.length) return null
  return voices.find(v => v.name === name) ?? voices.find(v => v.lang.startsWith('en')) ?? null
}

function doSpeak(text: string, resolve: () => void) {
  const settings = useSettingsStore()
  window.speechSynthesis.cancel()
  const u = new SpeechSynthesisUtterance(text)
  const voice = selectVoice(settings.voiceName)
  if (voice) u.voice = voice
  u.rate = 0.88
  u.pitch = 1.0
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
  const result: VoiceOption[] = []
  for (const name of ALLOWED_VOICES) {
    const v = voices.find(v => v.name === name)
    if (v) result.push({ label: v.name, value: v.name, sublabel: v.lang })
  }
  return result
}
