import { describe, expect, it } from 'vitest'
import { getAvailableVoices } from '../../src/composables/useSpeech'

/**
 * Which voices the picker offers.
 *
 * It used to return Default plus whichever of two hard-coded names happened to exist, plus
 * one Australian and one British pick. On a Windows machine carrying David, Mark and Zira it
 * offered exactly one of them, so "choose a voice" was a choice between Default and Zira —
 * and once the writing styles were removed, the voice became the only narrator setting that
 * changes what you hear at all.
 *
 * Fabricated rosters rather than this machine's: the CI runner has no speech engine, so
 * anything asserted against `window.speechSynthesis` there is asserted against an empty list.
 */

const v = (name: string, lang: string) => ({ name, lang }) as SpeechSynthesisVoice

const WINDOWS = [
  v('Microsoft David - English (United States)', 'en-US'),
  v('Microsoft Mark - English (United States)', 'en-US'),
  v('Microsoft Zira - English (United States)', 'en-US'),
  v('Microsoft Hazel - English (United Kingdom)', 'en-GB'),
  v('Microsoft Hedda - German (Germany)', 'de-DE'),
]

const MACOS = [
  v('Samantha', 'en-US'),
  v('Karen', 'en-AU'),
  v('Daniel', 'en-GB'),
  v('Deranged', 'en-US'),
  v('Bubbles', 'en-US'),
]

const ANDROID = [
  v('English United States', 'en-US'),
  v('English United Kingdom', 'en-GB'),
  v('Google UK English Male', 'en-GB'),
]

const labels = (roster: SpeechSynthesisVoice[]) => getAvailableVoices(roster).map(o => o.label)

describe('the voice list', () => {
  it('offers every English voice, not a curated handful', () => {
    const values = getAvailableVoices(WINDOWS).map(o => o.value)
    for (const voice of WINDOWS.filter(x => x.lang.startsWith('en'))) {
      expect(values, `${voice.name} is unreachable`).toContain(voice.name)
    }
  })

  it('leads with Default', () => {
    for (const roster of [WINDOWS, MACOS, ANDROID]) {
      expect(labels(roster)[0]).toBe('Default')
    }
  })

  it('leaves out voices that do not speak English', () => {
    const values = getAvailableVoices(WINDOWS).map(o => o.value)
    expect(values).not.toContain('Microsoft Hedda - German (Germany)')
  })

  it('strips the platform boilerplate off the names', () => {
    // "Microsoft David - English (United States)" is a row in a list where every row is a
    // voice and the accent is already shown beside it.
    expect(labels(WINDOWS)).toContain('David')
    expect(labels(WINDOWS)).toContain('Zira')
    expect(labels(ANDROID)).toContain('UK Male')
  })

  it('names the accent beside each voice', () => {
    const byValue = new Map(getAvailableVoices(WINDOWS).map(o => [o.value, o.sublabel]))
    expect(byValue.get('Microsoft David - English (United States)')).toBe('American')
    expect(byValue.get('Microsoft Hazel - English (United Kingdom)')).toBe('British')
  })

  it('keeps the character voices and their descriptions', () => {
    const options = getAvailableVoices(MACOS)
    const bubbles = options.find(o => o.value === 'Bubbles')
    expect(bubbles?.label).toBe('Bubbles')
    expect(bubbles?.sublabel).toBe('Underwater')
  })

  it('lists a character voice once, not again under its accent', () => {
    const values = getAvailableVoices(MACOS).map(o => o.value)
    expect(values.filter(x => x === 'Bubbles')).toHaveLength(1)
  })

  it('never produces a blank label', () => {
    // The tidying strips vendor and locale, and a name made only of those would tidy to
    // nothing — better to show the raw name than an empty row.
    const odd = [v('English', 'en-US'), v('Microsoft', 'en-GB')]
    for (const option of getAvailableVoices(odd)) {
      expect(option.label.trim()).not.toBe('')
    }
  })

  it('offers only Default when the device has no voices at all', () => {
    // The CI runner, and any browser without a speech engine.
    expect(getAvailableVoices([])).toEqual([
      { label: 'Default', value: '', sublabel: 'Auto-selected narrator' },
    ])
  })
})

/**
 * iOS names its character voices with the locale attached — "Rocko (English (US))" — while
 * macOS ships them bare, and Apple has renamed several of them over the years.
 *
 * The list held five character voices and three of those were retired names: Deranged became
 * Wobble, Hysterical became Jester, Pipe Organ became Organ. On a current iPad all three
 * matched nothing, so the voices that replaced them were unrecognised.
 */
const IOS = [
  v('Samantha', 'en-US'),
  v('Aaron', 'en-US'),
  v('Wobble (English (US))', 'en-US'),
  v('Organ (English (US))', 'en-US'),
  v('Rocko (English (US))', 'en-US'),
  v('Daniel', 'en-GB'),
]

const MACOS_OLD = [
  v('Deranged', 'en-US'),
  v('Hysterical', 'en-US'),
  v('Pipe Organ', 'en-US'),
]

describe('character voices', () => {
  it('recognises the modern Apple names', () => {
    const labels = getAvailableVoices(IOS).map(o => o.label)
    for (const name of ['Wobble', 'Organ', 'Rocko']) {
      expect(labels, `${name} is unrecognised`).toContain(name)
    }
  })

  it('still recognises the retired names, for an older device', () => {
    const labels = getAvailableVoices(MACOS_OLD).map(o => o.label)
    expect(labels).toContain('Deranged')
    expect(labels).toContain('Pipe Organ')
    // Hysterical is deliberately absent: it is Jester under Apple's older name, and Jester
    // is withdrawn. Removing one spelling while an older device still offers the other
    // would not be removing it.
    expect(labels).not.toContain('Hysterical')
  })

  it('describes them, so the list is not a wall of bare names', () => {
    const wobble = getAvailableVoices(IOS).find(o => o.label === 'Wobble')
    expect(wobble?.sublabel).toBe('Unhinged')
  })

  it('stores the real voice name, locale suffix and all', () => {
    // The tidy label is for reading. The value is handed back to the speech engine, so a
    // preference saved as "Wobble" would resolve to nothing on the device that offered it.
    const wobble = getAvailableVoices(IOS).find(o => o.label === 'Wobble')
    expect(wobble?.value).toBe('Wobble (English (US))')
  })

  it('lists each one once, not again under its accent', () => {
    const values = getAvailableVoices(IOS).map(o => o.value)
    expect(values.filter(x => x === 'Rocko (English (US))')).toHaveLength(1)
    expect(new Set(values).size).toBe(values.length)
  })

  it('still lists the ordinary voices alongside them', () => {
    const values = getAvailableVoices(IOS).map(o => o.value)
    expect(values).toContain('Samantha')
    expect(values).toContain('Aaron')
    expect(values).toContain('Daniel')
  })
})

/**
 * Voices the app will not offer.
 *
 * Dropping them from the described character list alone would not do it: the picker lists
 * every English voice the device has, so they would simply reappear as bare names filed under
 * their accent. Hysterical goes with Jester because they are the same voice under Apple's old
 * and new names — removing one while an older device still offers the other is not removing
 * it.
 */
const WITHDRAWN = ['Zarvox', 'Trinoids', 'Jester', 'Hysterical', 'Boing', 'Good News', 'Bad News']

const HAS_WITHDRAWN = [
  v('Zarvox', 'en-US'),
  v('Trinoids', 'en-US'),
  v('Jester (English (US))', 'en-US'),
  v('Hysterical', 'en-US'),
  v('Boing', 'en-US'),
  v('Good News', 'en-US'),
  v('Bad News', 'en-US'),
  v('Samantha', 'en-US'),
  v('Daniel', 'en-GB'),
]

describe('withdrawn voices', () => {
  it('are not offered, under any of their names', () => {
    const offered = getAvailableVoices(HAS_WITHDRAWN)
    for (const name of WITHDRAWN) {
      const found = offered.find(o => o.value === name || o.value.startsWith(`${name} (`) || o.label === name)
      expect(found, `${name} is still offered as ${found?.value}`).toBeUndefined()
    }
  })

  it('do not slip back in through the accent grouping', () => {
    // The failure mode: removed from the described list, then re-added by the sweep that
    // lists everything else the device has.
    const values = getAvailableVoices(HAS_WITHDRAWN).map(o => o.value)
    expect(values.some(x => /zarvox|trinoids|jester|hysterical|boing|news/i.test(x))).toBe(false)
  })

  it('leave every other voice on the device alone', () => {
    const values = getAvailableVoices(HAS_WITHDRAWN).map(o => o.value)
    expect(values).toContain('Samantha')
    expect(values).toContain('Daniel')
  })
})
