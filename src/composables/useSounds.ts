export function playBullseye(): Promise<void> {
  return new Promise(resolve => {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext
    if (!AudioCtx) { resolve(); return }
    const ctx = new AudioCtx()
    const now = ctx.currentTime
    const duration = 4.2

    // Master gain — builds slowly, peaks hard at ~2.4s, then sighs out
    const master = ctx.createGain()
    master.gain.setValueAtTime(0, now)
    master.gain.linearRampToValueAtTime(0.18, now + 0.3)
    master.gain.linearRampToValueAtTime(0.26, now + 1.2)
    master.gain.linearRampToValueAtTime(0.42, now + 2.2)
    master.gain.linearRampToValueAtTime(0.48, now + 2.6)   // climax peak
    master.gain.linearRampToValueAtTime(0.28, now + 3.0)
    master.gain.linearRampToValueAtTime(0.08, now + 3.9)
    master.gain.linearRampToValueAtTime(0, now + duration)
    master.connect(ctx.destination)

    // Amplitude pulse LFO — rapid breath pulses near the climax
    const pulseLFO = ctx.createOscillator()
    const pulseLFOGain = ctx.createGain()
    pulseLFO.type = 'sine'
    pulseLFO.frequency.setValueAtTime(3.5, now)
    pulseLFO.frequency.linearRampToValueAtTime(5.5, now + 2.6)  // speeds up toward peak
    pulseLFO.frequency.linearRampToValueAtTime(3.0, now + 3.5)
    pulseLFOGain.gain.setValueAtTime(0, now)
    pulseLFOGain.gain.linearRampToValueAtTime(0, now + 1.4)
    pulseLFOGain.gain.linearRampToValueAtTime(0.10, now + 2.2)  // pulses kick in
    pulseLFOGain.gain.linearRampToValueAtTime(0.14, now + 2.6)
    pulseLFOGain.gain.linearRampToValueAtTime(0, now + 3.2)
    pulseLFO.connect(pulseLFOGain)
    pulseLFO.start(now)
    pulseLFO.stop(now + duration)

    // F1 — "ah/oh" vowel body, shifts higher as it climbs
    const f1 = ctx.createBiquadFilter()
    f1.type = 'bandpass'
    f1.frequency.setValueAtTime(600, now)
    f1.frequency.linearRampToValueAtTime(750, now + 1.2)
    f1.frequency.linearRampToValueAtTime(900, now + 2.4)   // opens up at peak
    f1.frequency.linearRampToValueAtTime(650, now + 3.5)
    f1.Q.value = 5
    f1.connect(master)

    // F2 — upper formant, brightness
    const f2 = ctx.createBiquadFilter()
    f2.type = 'bandpass'
    f2.frequency.setValueAtTime(1100, now)
    f2.frequency.linearRampToValueAtTime(1400, now + 2.4)
    f2.frequency.linearRampToValueAtTime(1000, now + 3.5)
    f2.Q.value = 7
    f2.connect(master)

    // Pulse modulated gain node — connects oscillators through pulseLFO for climax tremor
    const pulseGain = ctx.createGain()
    pulseGain.gain.value = 1
    pulseLFOGain.connect(pulseGain.gain)
    pulseGain.connect(f1)
    pulseGain.connect(f2)

    // Fundamental — female pitch range, dramatic arc peaking at ~560 Hz
    const osc1 = ctx.createOscillator()
    osc1.type = 'sine'
    osc1.frequency.setValueAtTime(240, now)
    osc1.frequency.linearRampToValueAtTime(310, now + 0.5)
    osc1.frequency.linearRampToValueAtTime(380, now + 1.2)
    osc1.frequency.linearRampToValueAtTime(460, now + 1.9)
    osc1.frequency.linearRampToValueAtTime(540, now + 2.4)   // sharp rise to peak
    osc1.frequency.linearRampToValueAtTime(560, now + 2.65)  // holds at top
    osc1.frequency.linearRampToValueAtTime(420, now + 3.1)   // falls
    osc1.frequency.linearRampToValueAtTime(280, now + 3.8)
    osc1.frequency.linearRampToValueAtTime(240, now + duration)
    osc1.connect(pulseGain)
    osc1.start(now)
    osc1.stop(now + duration)

    // 2nd harmonic — richness
    const osc2 = ctx.createOscillator()
    const osc2Gain = ctx.createGain()
    osc2.type = 'sine'
    osc2.frequency.setValueAtTime(480, now)
    osc2.frequency.linearRampToValueAtTime(760, now + 1.2)
    osc2.frequency.linearRampToValueAtTime(1080, now + 2.4)
    osc2.frequency.linearRampToValueAtTime(1120, now + 2.65)
    osc2.frequency.linearRampToValueAtTime(840, now + 3.1)
    osc2.frequency.linearRampToValueAtTime(480, now + duration)
    osc2Gain.gain.value = 0.30
    osc2.connect(osc2Gain)
    osc2Gain.connect(pulseGain)
    osc2.start(now)
    osc2.stop(now + duration)

    // 3rd harmonic — edge and presence
    const osc3 = ctx.createOscillator()
    const osc3Gain = ctx.createGain()
    osc3.type = 'sine'
    osc3.frequency.setValueAtTime(720, now)
    osc3.frequency.linearRampToValueAtTime(1140, now + 1.9)
    osc3.frequency.linearRampToValueAtTime(1680, now + 2.65)
    osc3.frequency.linearRampToValueAtTime(840, now + 3.5)
    osc3.frequency.linearRampToValueAtTime(720, now + duration)
    osc3Gain.gain.setValueAtTime(0.08, now)
    osc3Gain.gain.linearRampToValueAtTime(0.20, now + 2.4)   // gets brighter at peak
    osc3Gain.gain.linearRampToValueAtTime(0.06, now + 3.5)
    osc3.connect(osc3Gain)
    osc3Gain.connect(pulseGain)
    osc3.start(now)
    osc3.stop(now + duration)

    // Breathiness noise — swells heavily at the climax
    const bufferSize = Math.ceil(ctx.sampleRate * duration)
    const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate)
    const noiseData = noiseBuffer.getChannelData(0)
    for (let i = 0; i < bufferSize; i++) noiseData[i] = Math.random() * 2 - 1
    const noise = ctx.createBufferSource()
    noise.buffer = noiseBuffer
    const noiseFilter = ctx.createBiquadFilter()
    noiseFilter.type = 'bandpass'
    noiseFilter.frequency.value = 3200
    noiseFilter.Q.value = 0.5
    const noiseGain = ctx.createGain()
    noiseGain.gain.setValueAtTime(0, now)
    noiseGain.gain.linearRampToValueAtTime(0.04, now + 0.4)
    noiseGain.gain.linearRampToValueAtTime(0.08, now + 1.5)
    noiseGain.gain.linearRampToValueAtTime(0.18, now + 2.5)   // breathy peak
    noiseGain.gain.linearRampToValueAtTime(0.10, now + 3.1)
    noiseGain.gain.linearRampToValueAtTime(0, now + duration)
    noise.connect(noiseFilter)
    noiseFilter.connect(noiseGain)
    noiseGain.connect(master)
    noise.start(now)
    noise.stop(now + duration)

    pulseLFO.onended = () => {}
    osc1.onended = () => { ctx.close(); resolve() }
  })
}
