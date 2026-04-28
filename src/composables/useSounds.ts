export function playBrakeSqueal(): Promise<void> {
  return new Promise(resolve => {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext
    if (!AudioCtx) { resolve(); return }
    const ctx = new AudioCtx()
    const now = ctx.currentTime
    const duration = 1.8

    const master = ctx.createGain()
    master.gain.setValueAtTime(0, now)
    master.gain.linearRampToValueAtTime(0.5, now + 0.05)
    master.gain.setValueAtTime(0.5, now + 1.2)
    master.gain.linearRampToValueAtTime(0, now + duration)
    master.connect(ctx.destination)

    // High-pitched squeal oscillator — pitch drops as car slows
    const osc = ctx.createOscillator()
    osc.type = 'sawtooth'
    osc.frequency.setValueAtTime(4200, now)
    osc.frequency.linearRampToValueAtTime(3800, now + 0.3)
    osc.frequency.linearRampToValueAtTime(3200, now + 0.8)
    osc.frequency.linearRampToValueAtTime(2400, now + 1.4)
    osc.frequency.linearRampToValueAtTime(1600, now + duration)

    // Bandpass to shape the squeal tone
    const bpf = ctx.createBiquadFilter()
    bpf.type = 'bandpass'
    bpf.frequency.value = 3500
    bpf.Q.value = 2
    osc.connect(bpf)
    bpf.connect(master)
    osc.start(now)
    osc.stop(now + duration)

    // Noise layer — tire friction texture
    const bufSize = Math.ceil(ctx.sampleRate * duration)
    const noiseBuf = ctx.createBuffer(1, bufSize, ctx.sampleRate)
    const nd = noiseBuf.getChannelData(0)
    for (let i = 0; i < bufSize; i++) nd[i] = Math.random() * 2 - 1
    const noise = ctx.createBufferSource()
    noise.buffer = noiseBuf
    const noiseFilter = ctx.createBiquadFilter()
    noiseFilter.type = 'highpass'
    noiseFilter.frequency.value = 2000
    const noiseGain = ctx.createGain()
    noiseGain.gain.setValueAtTime(0.15, now)
    noiseGain.gain.linearRampToValueAtTime(0.08, now + duration)
    noise.connect(noiseFilter)
    noiseFilter.connect(noiseGain)
    noiseGain.connect(master)
    noise.start(now)
    noise.stop(now + duration)

    osc.onended = () => { ctx.close(); resolve() }
  })
}

export function playCarCrash(): Promise<void> {
  return new Promise(resolve => {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext
    if (!AudioCtx) { resolve(); return }
    const ctx = new AudioCtx()
    const now = ctx.currentTime
    const duration = 2.2

    const master = ctx.createGain()
    master.gain.setValueAtTime(0.7, now)
    master.gain.linearRampToValueAtTime(0.4, now + 0.15)
    master.gain.linearRampToValueAtTime(0.2, now + 0.6)
    master.gain.linearRampToValueAtTime(0.05, now + 1.4)
    master.gain.linearRampToValueAtTime(0, now + duration)
    master.connect(ctx.destination)

    // Deep impact thud — low oscillator burst
    const thud = ctx.createOscillator()
    const thudGain = ctx.createGain()
    thud.type = 'sine'
    thud.frequency.setValueAtTime(120, now)
    thud.frequency.linearRampToValueAtTime(40, now + 0.3)
    thudGain.gain.setValueAtTime(1, now)
    thudGain.gain.linearRampToValueAtTime(0, now + 0.4)
    thud.connect(thudGain)
    thudGain.connect(master)
    thud.start(now)
    thud.stop(now + 0.4)

    // Metal crunch — noise burst with mid bandpass
    const bufSize = Math.ceil(ctx.sampleRate * duration)
    const noiseBuf = ctx.createBuffer(1, bufSize, ctx.sampleRate)
    const nd = noiseBuf.getChannelData(0)
    for (let i = 0; i < bufSize; i++) nd[i] = Math.random() * 2 - 1
    const noise = ctx.createBufferSource()
    noise.buffer = noiseBuf

    // Low rumble layer
    const lpf = ctx.createBiquadFilter()
    lpf.type = 'lowpass'
    lpf.frequency.value = 400
    const lpfGain = ctx.createGain()
    lpfGain.gain.setValueAtTime(0.9, now)
    lpfGain.gain.linearRampToValueAtTime(0, now + 0.5)
    noise.connect(lpf)
    lpf.connect(lpfGain)
    lpfGain.connect(master)

    // Mid crunch layer
    const bpf = ctx.createBiquadFilter()
    bpf.type = 'bandpass'
    bpf.frequency.value = 1200
    bpf.Q.value = 0.8
    const bpfGain = ctx.createGain()
    bpfGain.gain.setValueAtTime(0.6, now)
    bpfGain.gain.linearRampToValueAtTime(0.15, now + 0.4)
    bpfGain.gain.linearRampToValueAtTime(0, now + 1.2)
    noise.connect(bpf)
    bpf.connect(bpfGain)
    bpfGain.connect(master)

    // High glass/metal tinkle
    const hpf = ctx.createBiquadFilter()
    hpf.type = 'highpass'
    hpf.frequency.value = 3000
    const hpfGain = ctx.createGain()
    hpfGain.gain.setValueAtTime(0.3, now)
    hpfGain.gain.linearRampToValueAtTime(0.1, now + 0.3)
    hpfGain.gain.linearRampToValueAtTime(0, now + 1.8)
    noise.connect(hpf)
    hpf.connect(hpfGain)
    hpfGain.connect(master)

    noise.start(now)
    noise.stop(now + duration)

    // Resolve after full duration
    thud.onended = () => {}
    setTimeout(() => { ctx.close(); resolve() }, duration * 1000)
  })
}

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
