export function playBullseye(): Promise<void> {
  return new Promise(resolve => {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext
    if (!AudioCtx) { resolve(); return }
    const ctx = new AudioCtx()
    const now = ctx.currentTime
    const duration = 3.0

    // Master gain — slow, sensual fade in, long sustain, soft release
    const master = ctx.createGain()
    master.gain.setValueAtTime(0, now)
    master.gain.linearRampToValueAtTime(0.32, now + 0.18)
    master.gain.setValueAtTime(0.32, now + 2.0)
    master.gain.linearRampToValueAtTime(0, now + duration)
    master.connect(ctx.destination)

    // F1 formant — "oh" vowel body (~600 Hz)
    const f1 = ctx.createBiquadFilter()
    f1.type = 'bandpass'
    f1.frequency.setValueAtTime(520, now)
    f1.frequency.linearRampToValueAtTime(680, now + 0.6)
    f1.frequency.linearRampToValueAtTime(620, now + 1.6)
    f1.frequency.linearRampToValueAtTime(480, now + duration)
    f1.Q.value = 6
    f1.connect(master)

    // F2 formant — adds brightness and intelligibility (~1100 Hz)
    const f2 = ctx.createBiquadFilter()
    f2.type = 'bandpass'
    f2.frequency.value = 1100
    f2.Q.value = 8
    f2.connect(master)

    // Fundamental — smooth pitch arc: starts low, rises, peaks, melts back down
    const osc1 = ctx.createOscillator()
    osc1.type = 'sine'
    osc1.frequency.setValueAtTime(260, now)
    osc1.frequency.linearRampToValueAtTime(370, now + 0.35)
    osc1.frequency.linearRampToValueAtTime(440, now + 0.9)
    osc1.frequency.linearRampToValueAtTime(420, now + 1.6)
    osc1.frequency.linearRampToValueAtTime(300, now + 2.5)
    osc1.frequency.linearRampToValueAtTime(260, now + duration)
    osc1.connect(f1)
    osc1.connect(f2)
    osc1.start(now)
    osc1.stop(now + duration)

    // 2nd harmonic — warmth and body
    const osc2 = ctx.createOscillator()
    const osc2Gain = ctx.createGain()
    osc2.type = 'sine'
    osc2.frequency.setValueAtTime(520, now)
    osc2.frequency.linearRampToValueAtTime(740, now + 0.35)
    osc2.frequency.linearRampToValueAtTime(880, now + 0.9)
    osc2.frequency.linearRampToValueAtTime(840, now + 1.6)
    osc2.frequency.linearRampToValueAtTime(600, now + 2.5)
    osc2.frequency.linearRampToValueAtTime(520, now + duration)
    osc2Gain.gain.value = 0.28
    osc2.connect(osc2Gain)
    osc2Gain.connect(f1)
    osc2Gain.connect(f2)
    osc2.start(now)
    osc2.stop(now + duration)

    // 3rd harmonic — adds a little edge
    const osc3 = ctx.createOscillator()
    const osc3Gain = ctx.createGain()
    osc3.type = 'sine'
    osc3.frequency.setValueAtTime(780, now)
    osc3.frequency.linearRampToValueAtTime(1110, now + 0.9)
    osc3.frequency.linearRampToValueAtTime(780, now + duration)
    osc3Gain.gain.value = 0.12
    osc3.connect(osc3Gain)
    osc3Gain.connect(f2)
    osc3.start(now)
    osc3.stop(now + duration)

    // Breathiness — filtered noise for an airy, intimate quality
    const bufferSize = Math.ceil(ctx.sampleRate * duration)
    const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate)
    const data = noiseBuffer.getChannelData(0)
    for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1
    const noise = ctx.createBufferSource()
    noise.buffer = noiseBuffer
    const noiseFilter = ctx.createBiquadFilter()
    noiseFilter.type = 'bandpass'
    noiseFilter.frequency.value = 2800
    noiseFilter.Q.value = 0.6
    const noiseGain = ctx.createGain()
    noiseGain.gain.setValueAtTime(0, now)
    noiseGain.gain.linearRampToValueAtTime(0.055, now + 0.2)
    noiseGain.gain.setValueAtTime(0.055, now + 2.2)
    noiseGain.gain.linearRampToValueAtTime(0, now + duration)
    noise.connect(noiseFilter)
    noiseFilter.connect(noiseGain)
    noiseGain.connect(master)
    noise.start(now)
    noise.stop(now + duration)

    osc1.onended = () => { ctx.close(); resolve() }
  })
}
