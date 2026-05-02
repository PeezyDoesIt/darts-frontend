import { defineStore } from 'pinia'
import { ref } from 'vue'

export const useSettingsStore = defineStore('settings', () => {
  // voiceName stores the exact SpeechSynthesisVoice.name, or a special accent key
  const voiceName = ref<string>(
    localStorage.getItem('voiceName') ?? ''
  )

  // quietNarrator: only announce whose turn it is, skip commentary
  const quietNarrator = ref<boolean>(
    localStorage.getItem('quietNarrator') === 'true'
  )

  // disableTimers: force both walk-up and throw timers off for all games
  const disableTimers = ref<boolean>(
    localStorage.getItem('disableTimers') === 'true'
  )

  function setVoiceName(name: string) {
    voiceName.value = name
    localStorage.setItem('voiceName', name)
  }

  function setQuietNarrator(val: boolean) {
    quietNarrator.value = val
    localStorage.setItem('quietNarrator', String(val))
  }

  function setDisableTimers(val: boolean) {
    disableTimers.value = val
    localStorage.setItem('disableTimers', String(val))
  }

  return { voiceName, setVoiceName, quietNarrator, setQuietNarrator, disableTimers, setDisableTimers }
})
