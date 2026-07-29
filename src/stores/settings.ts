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

  const voiceRate = ref<number>(
    parseFloat(localStorage.getItem('voiceRate') ?? '0.88')
  )
  const voicePitch = ref<number>(
    parseFloat(localStorage.getItem('voicePitch') ?? '1.0')
  )

  function setVoiceName(name: string) {
    voiceName.value = name
    localStorage.setItem('voiceName', name)
  }
  function setVoiceRate(val: number) {
    voiceRate.value = val
    localStorage.setItem('voiceRate', String(val))
  }
  function setVoicePitch(val: number) {
    voicePitch.value = val
    localStorage.setItem('voicePitch', String(val))
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

  const disableTimerPause = ref<boolean>(
    localStorage.getItem('disableTimerPause') === 'true'
  )
  function setDisableTimerPause(val: boolean) {
    disableTimerPause.value = val
    localStorage.setItem('disableTimerPause', String(val))
  }

  const cleanMode = ref<boolean>(
    localStorage.getItem('cleanMode') !== 'false'
  )
  function setCleanMode(val: boolean) {
    cleanMode.value = val
    localStorage.setItem('cleanMode', String(val))
  }

  const soundTheme = ref<string>(
    localStorage.getItem('soundTheme') ?? 'default'
  )
  function setSoundTheme(val: string) {
    soundTheme.value = val
    localStorage.setItem('soundTheme', val)
  }

  const narratorGender = ref<'female' | 'male'>(
    (localStorage.getItem('narratorGender') as 'female' | 'male') ?? 'female'
  )
  function setNarratorGender(val: 'female' | 'male') {
    narratorGender.value = val
    localStorage.setItem('narratorGender', val)
  }

  const savedPersonality = localStorage.getItem('narratorPersonality')
  const narratorPersonality = ref<'default'>('default')
  if (savedPersonality && savedPersonality !== 'slj' && savedPersonality !== 'macho') {
    narratorPersonality.value = savedPersonality as 'default'
  }
  function setNarratorPersonality(val: 'default') {
    narratorPersonality.value = val
    localStorage.setItem('narratorPersonality', val)
  }

  const announceThrowAt20 = ref<boolean>(
    localStorage.getItem('announceThrowAt20') !== 'false'
  )
  function setAnnounceThrowAt20(val: boolean) {
    announceThrowAt20.value = val
    localStorage.setItem('announceThrowAt20', String(val))
  }

  const announceWalkupAt20 = ref<boolean>(
    localStorage.getItem('announceWalkupAt20') === 'true'
  )
  function setAnnounceWalkupAt20(val: boolean) {
    announceWalkupAt20.value = val
    localStorage.setItem('announceWalkupAt20', String(val))
  }

  return { voiceName, voiceRate, voicePitch, setVoiceName, setVoiceRate, setVoicePitch, quietNarrator, setQuietNarrator, disableWalkUpTimer, setDisableWalkUpTimer, disableThrowTimer, setDisableThrowTimer, bullseyeSound, setBullseyeSound, disableTimerPause, setDisableTimerPause, cleanMode, setCleanMode, soundTheme, setSoundTheme, narratorGender, setNarratorGender, narratorPersonality, setNarratorPersonality, announceThrowAt20, setAnnounceThrowAt20, announceWalkupAt20, setAnnounceWalkupAt20 }
})
