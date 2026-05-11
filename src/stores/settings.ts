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

  // per-timer overrides
  const disableWalkUpTimer = ref<boolean>(
    localStorage.getItem('disableWalkUpTimer') === 'true'
  )
  const disableThrowTimer = ref<boolean>(
    localStorage.getItem('disableThrowTimer') === 'true'
  )

  function setVoiceName(name: string) {
    voiceName.value = name
    localStorage.setItem('voiceName', name)
  }

  function setQuietNarrator(val: boolean) {
    quietNarrator.value = val
    localStorage.setItem('quietNarrator', String(val))
  }

  function setDisableWalkUpTimer(val: boolean) {
    disableWalkUpTimer.value = val
    localStorage.setItem('disableWalkUpTimer', String(val))
  }
  function setDisableThrowTimer(val: boolean) {
    disableThrowTimer.value = val
    localStorage.setItem('disableThrowTimer', String(val))
  }

  const bullseyeSound = ref<string>(
    localStorage.getItem('bullseyeSound') ?? 'shotgun'
  )
  function setBullseyeSound(val: string) {
    bullseyeSound.value = val
    localStorage.setItem('bullseyeSound', val)
  }

  return { voiceName, setVoiceName, quietNarrator, setQuietNarrator, disableWalkUpTimer, setDisableWalkUpTimer, disableThrowTimer, setDisableThrowTimer, bullseyeSound, setBullseyeSound }
})
