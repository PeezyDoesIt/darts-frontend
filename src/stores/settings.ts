import { defineStore } from 'pinia'
import { ref } from 'vue'

export type VoiceGender = 'female' | 'male'

export const useSettingsStore = defineStore('settings', () => {
  const voiceGender = ref<VoiceGender>(
    (localStorage.getItem('voiceGender') as VoiceGender) ?? 'female'
  )
  const voiceAccent = ref<string>(
    localStorage.getItem('voiceAccent') ?? 'en-US'
  )

  function setVoiceGender(g: VoiceGender) {
    voiceGender.value = g
    localStorage.setItem('voiceGender', g)
  }

  function setVoiceAccent(a: string) {
    voiceAccent.value = a
    localStorage.setItem('voiceAccent', a)
  }

  return { voiceGender, voiceAccent, setVoiceGender, setVoiceAccent }
})
