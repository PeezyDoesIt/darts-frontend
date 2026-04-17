// Known male voice names to exclude
const MALE_NAMES = ['David', 'Mark', 'Alex', 'Daniel', 'Fred', 'Ralph', 'Albert', 'Guy', 'James', 'Richard', 'George', 'Tom', 'Bruce', 'Bob']

// Known female name fragments to prefer
const FEMALE_NAMES = ['Zira', 'Samantha', 'Karen', 'Susan', 'Victoria', 'Fiona', 'Moira', 'Aria', 'Jenny', 'Hazel', 'Eva', 'Heera', 'Cortana', 'Microsoft Eva', 'Siri']

function getSouthernVoice(): SpeechSynthesisVoice | null {
  const voices = window.speechSynthesis.getVoices()
  if (!voices.length) return null

  console.log('[useSpeech] available voices:', voices.map(v => `${v.name} (${v.lang})`))

  // 1. Female name match, en-US first
  for (const name of FEMALE_NAMES) {
    const v = voices.find(v => v.name.includes(name) && v.lang === 'en-US')
    if (v) { console.log('[useSpeech] picked:', v.name); return v }
  }
  // 2. Female name match, any English
  for (const name of FEMALE_NAMES) {
    const v = voices.find(v => v.name.includes(name) && v.lang.startsWith('en'))
    if (v) { console.log('[useSpeech] picked:', v.name); return v }
  }
  // 3. Any en-US voice that isn't a known male name
  const nonMale = voices.find(v =>
    v.lang === 'en-US' && !MALE_NAMES.some(m => v.name.includes(m))
  )
  if (nonMale) { console.log('[useSpeech] picked (non-male):', nonMale.name); return nonMale }

  // 4. Any English voice
  const anyEn = voices.find(v => v.lang.startsWith('en'))
  if (anyEn) { console.log('[useSpeech] picked (any en):', anyEn.name); return anyEn }

  console.log('[useSpeech] no suitable voice found, using default')
  return null
}

function doSpeak(text: string, resolve: () => void) {
  window.speechSynthesis.cancel()
  const u = new SpeechSynthesisUtterance(text)
  const voice = getSouthernVoice()
  if (voice) u.voice = voice
  u.rate = 0.88
  u.pitch = 1.15
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
