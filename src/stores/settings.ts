import { defineStore } from 'pinia'
import { ref } from 'vue'

export const useSettingsStore = defineStore('settings', () => {
  // voiceName stores the exact SpeechSynthesisVoice.name, or a special accent key
  const voiceName = ref<string>(
    localStorage.getItem('voiceName') ?? ''
  )

  function setVoiceName(name: string) {
    voiceName.value = name
    localStorage.setItem('voiceName', name)
  }

  return { voiceName, setVoiceName }
})
