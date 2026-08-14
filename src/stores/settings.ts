import { defineStore } from 'pinia'
import { ref } from 'vue'
import { NARRATOR_PERSONALITIES, type NarratorMode, type NarratorPersonality } from '../types/index'
import { DEFAULT_BOT_NAMES, botName, normaliseBotName } from '../lib/spadesBot'

export const useSettingsStore = defineStore('settings', () => {
  // voiceName stores the exact SpeechSynthesisVoice.name, or a special accent key
  const voiceName = ref<string>(
    localStorage.getItem('voiceName') ?? ''
  )

  /**
   * How much the narrator says: everything, functional announcements only, or nothing.
   *
   * This replaces the `quietNarrator` boolean, which had no way to turn the narrator off at
   * all. Anyone who had set it keeps the equivalent choice — the old key is read once and
   * then written forward under the new one — so nobody's setting resets on upgrade.
   */
  const narratorMode = ref<NarratorMode>((() => {
    const stored = localStorage.getItem('narratorMode')
    if (stored === 'full' || stored === 'names' || stored === 'off') return stored
    return localStorage.getItem('quietNarrator') === 'true' ? 'names' : 'full'
  })())

  /**
   * What the computer seats in Spades are called. Persisted like every other preference, so
   * a table that renames them keeps those names.
   */
  const botNames = ref<string[]>(loadBotNames())
  function loadBotNames(): string[] {
    try {
      const raw = localStorage.getItem('spadesBotNames')
      const parsed = raw ? JSON.parse(raw) : null
      if (!Array.isArray(parsed)) return DEFAULT_BOT_NAMES.map((_, i) => botName(i))
      // Normalised on read as well as write: this comes back off disk, where anything could
      // have been put in it.
      return DEFAULT_BOT_NAMES.map((_, i) =>
        normaliseBotName(typeof parsed[i] === 'string' ? parsed[i] : '', i))
    } catch { return DEFAULT_BOT_NAMES.map((_, i) => botName(i)) }
  }
  function setBotName(seat: number, value: string) {
    if (seat < 0 || seat >= DEFAULT_BOT_NAMES.length) return
    const next = [...botNames.value]
    next[seat] = normaliseBotName(value, seat)
    botNames.value = next
    localStorage.setItem('spadesBotNames', JSON.stringify(next))
  }

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

  function setNarratorMode(val: NarratorMode) {
    narratorMode.value = val
    localStorage.setItem('narratorMode', val)
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

  const _savedPersonality = localStorage.getItem('narratorPersonality') as NarratorPersonality | null
  const narratorPersonality = ref<NarratorPersonality>(
    _savedPersonality && NARRATOR_PERSONALITIES.includes(_savedPersonality) ? _savedPersonality : 'default'
  )
  function setNarratorPersonality(val: NarratorPersonality) {
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

  const coinHeadsImage = ref<string | null>(localStorage.getItem('coinHeadsImage'))
  const coinTailsImage = ref<string | null>(localStorage.getItem('coinTailsImage'))
  function setCoinHeadsImage(val: string | null) {
    coinHeadsImage.value = val
    if (val) localStorage.setItem('coinHeadsImage', val)
    else localStorage.removeItem('coinHeadsImage')
  }
  function setCoinTailsImage(val: string | null) {
    coinTailsImage.value = val
    if (val) localStorage.setItem('coinTailsImage', val)
    else localStorage.removeItem('coinTailsImage')
  }

  return { voiceName, voiceRate, voicePitch, setVoiceName, setVoiceRate, setVoicePitch, narratorMode, setNarratorMode, disableWalkUpTimer, setDisableWalkUpTimer, disableThrowTimer, setDisableThrowTimer, bullseyeSound, setBullseyeSound, disableTimerPause, setDisableTimerPause, cleanMode, setCleanMode, soundTheme, setSoundTheme, narratorGender, setNarratorGender, narratorPersonality, setNarratorPersonality, announceThrowAt20, setAnnounceThrowAt20, announceWalkupAt20, setAnnounceWalkupAt20, coinHeadsImage, coinTailsImage, setCoinHeadsImage, setCoinTailsImage, botNames, setBotName }
})
