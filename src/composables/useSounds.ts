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

    const osc = ctx.createOscillator()
    osc.type = 'sawtooth'
    osc.frequency.setValueAtTime(4200, now)
    osc.frequency.linearRampToValueAtTime(3800, now + 0.3)
    osc.frequency.linearRampToValueAtTime(3200, now + 0.8)
    osc.frequency.linearRampToValueAtTime(2400, now + 1.4)
    osc.frequency.linearRampToValueAtTime(1600, now + duration)

    const bpf = ctx.createBiquadFilter()
    bpf.type = 'bandpass'
    bpf.frequency.value = 3500
    bpf.Q.value = 2
    osc.connect(bpf)
    bpf.connect(master)
    osc.start(now)
    osc.stop(now + duration)

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

    const bufSize = Math.ceil(ctx.sampleRate * duration)
    const noiseBuf = ctx.createBuffer(1, bufSize, ctx.sampleRate)
    const nd = noiseBuf.getChannelData(0)
    for (let i = 0; i < bufSize; i++) nd[i] = Math.random() * 2 - 1
    const noise = ctx.createBufferSource()
    noise.buffer = noiseBuf

    const lpf = ctx.createBiquadFilter()
    lpf.type = 'lowpass'
    lpf.frequency.value = 400
    const lpfGain = ctx.createGain()
    lpfGain.gain.setValueAtTime(0.9, now)
    lpfGain.gain.linearRampToValueAtTime(0, now + 0.5)
    noise.connect(lpf); lpf.connect(lpfGain); lpfGain.connect(master)

    const bpf = ctx.createBiquadFilter()
    bpf.type = 'bandpass'
    bpf.frequency.value = 1200
    bpf.Q.value = 0.8
    const bpfGain = ctx.createGain()
    bpfGain.gain.setValueAtTime(0.6, now)
    bpfGain.gain.linearRampToValueAtTime(0, now + 1.2)
    noise.connect(bpf); bpf.connect(bpfGain); bpfGain.connect(master)

    const hpf = ctx.createBiquadFilter()
    hpf.type = 'highpass'
    hpf.frequency.value = 3000
    const hpfGain = ctx.createGain()
    hpfGain.gain.setValueAtTime(0.3, now)
    hpfGain.gain.linearRampToValueAtTime(0, now + 1.8)
    noise.connect(hpf); hpf.connect(hpfGain); hpfGain.connect(master)

    noise.start(now)
    noise.stop(now + duration)

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
    const duration = 6.0

    // ── RHYTHM LFO ──────────────────────────────────────────────────────────
    // Simulates the physical rhythm — starts slow, builds, peaks, settles
    const rhythmLFO = ctx.createOscillator()
    rhythmLFO.type = 'sine'
    rhythmLFO.frequency.setValueAtTime(1.4, now)          // slow start
    rhythmLFO.frequency.linearRampToValueAtTime(1.8, now + 1.5)
    rhythmLFO.frequency.linearRampToValueAtTime(2.8, now + 3.0)
    rhythmLFO.frequency.linearRampToValueAtTime(4.5, now + 4.2)  // building fast
    rhythmLFO.frequency.linearRampToValueAtTime(5.5, now + 4.8)  // climax
    rhythmLFO.frequency.linearRampToValueAtTime(1.5, now + duration)

    // LFO depth increases as intensity builds
    const lfoDepth = ctx.createGain()
    lfoDepth.gain.setValueAtTime(0.06, now)
    lfoDepth.gain.linearRampToValueAtTime(0.10, now + 1.5)
    lfoDepth.gain.linearRampToValueAtTime(0.18, now + 3.0)
    lfoDepth.gain.linearRampToValueAtTime(0.24, now + 4.5)
    lfoDepth.gain.linearRampToValueAtTime(0.10, now + duration)
    rhythmLFO.connect(lfoDepth)

    // ── MASTER GAIN ─────────────────────────────────────────────────────────
    // Slow build → peak at ~4.8s → gentle sigh out
    const master = ctx.createGain()
    master.gain.setValueAtTime(0, now)
    master.gain.linearRampToValueAtTime(0.18, now + 0.5)
    master.gain.linearRampToValueAtTime(0.26, now + 2.0)
    master.gain.linearRampToValueAtTime(0.38, now + 3.5)
    master.gain.linearRampToValueAtTime(0.48, now + 4.8)  // peak
    master.gain.linearRampToValueAtTime(0.30, now + 5.2)
    master.gain.linearRampToValueAtTime(0, now + duration)
    lfoDepth.connect(master.gain)  // rhythm pulses ride on top of base gain
    master.connect(ctx.destination)

    // ── FORMANT FILTERS ──────────────────────────────────────────────────────
    // F1 — "ah/oh" vowel body, opens up as intensity rises
    const f1 = ctx.createBiquadFilter()
    f1.type = 'bandpass'
    f1.frequency.setValueAtTime(650, now)
    f1.frequency.linearRampToValueAtTime(800, now + 2.5)
    f1.frequency.linearRampToValueAtTime(1000, now + 4.5)
    f1.frequency.linearRampToValueAtTime(680, now + duration)
    f1.Q.value = 4
    f1.connect(master)

    // F2 — brightness / intelligibility
    const f2 = ctx.createBiquadFilter()
    f2.type = 'bandpass'
    f2.frequency.setValueAtTime(1100, now)
    f2.frequency.linearRampToValueAtTime(1500, now + 4.5)
    f2.frequency.linearRampToValueAtTime(1100, now + duration)
    f2.Q.value = 7
    f2.connect(master)

    // ── FUNDAMENTAL ──────────────────────────────────────────────────────────
    // Female pitch range; climbs steadily, sharp peak, melts down after
    const osc1 = ctx.createOscillator()
    osc1.type = 'sine'
    osc1.frequency.setValueAtTime(240, now)
    osc1.frequency.linearRampToValueAtTime(280, now + 1.0)
    osc1.frequency.linearRampToValueAtTime(340, now + 2.2)
    osc1.frequency.linearRampToValueAtTime(420, now + 3.4)
    osc1.frequency.linearRampToValueAtTime(500, now + 4.4)
    osc1.frequency.linearRampToValueAtTime(560, now + 4.9)  // peak
    osc1.frequency.linearRampToValueAtTime(400, now + 5.3)
    osc1.frequency.linearRampToValueAtTime(260, now + duration)

    // Subtle pitch wobble in sync with rhythm LFO for realism
    const pitchLFO = ctx.createGain()
    pitchLFO.gain.setValueAtTime(0, now)
    pitchLFO.gain.linearRampToValueAtTime(4, now + 1.5)
    pitchLFO.gain.linearRampToValueAtTime(10, now + 4.0)
    pitchLFO.gain.linearRampToValueAtTime(2, now + duration)
    lfoDepth.connect(pitchLFO.gain)
    rhythmLFO.connect(pitchLFO)
    pitchLFO.connect(osc1.frequency)

    osc1.connect(f1)
    osc1.connect(f2)
    osc1.start(now)
    osc1.stop(now + duration)

    // ── 2ND HARMONIC ────────────────────────────────────────────────────────
    const osc2 = ctx.createOscillator()
    const osc2g = ctx.createGain()
    osc2.type = 'sine'
    osc2.frequency.setValueAtTime(480, now)
    osc2.frequency.linearRampToValueAtTime(560, now + 1.0)
    osc2.frequency.linearRampToValueAtTime(680, now + 2.2)
    osc2.frequency.linearRampToValueAtTime(840, now + 3.4)
    osc2.frequency.linearRampToValueAtTime(1000, now + 4.4)
    osc2.frequency.linearRampToValueAtTime(1120, now + 4.9)
    osc2.frequency.linearRampToValueAtTime(800, now + 5.3)
    osc2.frequency.linearRampToValueAtTime(520, now + duration)
    osc2g.gain.value = 0.28
    osc2.connect(osc2g)
    osc2g.connect(f1)
    osc2g.connect(f2)
    osc2.start(now)
    osc2.stop(now + duration)

    // ── 3RD HARMONIC ────────────────────────────────────────────────────────
    const osc3 = ctx.createOscillator()
    const osc3g = ctx.createGain()
    osc3.type = 'sine'
    osc3.frequency.setValueAtTime(720, now)
    osc3.frequency.linearRampToValueAtTime(1020, now + 3.4)
    osc3.frequency.linearRampToValueAtTime(1680, now + 4.9)
    osc3.frequency.linearRampToValueAtTime(780, now + duration)
    osc3g.gain.setValueAtTime(0.08, now)
    osc3g.gain.linearRampToValueAtTime(0.20, now + 4.5)
    osc3g.gain.linearRampToValueAtTime(0.05, now + duration)
    osc3.connect(osc3g)
    osc3g.connect(f2)
    osc3.start(now)
    osc3.stop(now + duration)

    // ── BREATH NOISE ────────────────────────────────────────────────────────
    // Heavy breathiness that swells with the rhythm LFO at climax
    const bufSize = Math.ceil(ctx.sampleRate * duration)
    const noiseBuf = ctx.createBuffer(1, bufSize, ctx.sampleRate)
    const nd = noiseBuf.getChannelData(0)
    for (let i = 0; i < bufSize; i++) nd[i] = Math.random() * 2 - 1
    const noise = ctx.createBufferSource()
    noise.buffer = noiseBuf

    const noiseFilter = ctx.createBiquadFilter()
    noiseFilter.type = 'bandpass'
    noiseFilter.frequency.value = 3000
    noiseFilter.Q.value = 0.5

    const noiseGain = ctx.createGain()
    noiseGain.gain.setValueAtTime(0.02, now)
    noiseGain.gain.linearRampToValueAtTime(0.05, now + 1.5)
    noiseGain.gain.linearRampToValueAtTime(0.12, now + 3.5)
    noiseGain.gain.linearRampToValueAtTime(0.22, now + 4.8)  // breathy peak
    noiseGain.gain.linearRampToValueAtTime(0.06, now + duration)
    lfoDepth.connect(noiseGain.gain)  // breath noise also pulses with rhythm

    noise.connect(noiseFilter)
    noiseFilter.connect(noiseGain)
    noiseGain.connect(master)
    noise.start(now)
    noise.stop(now + duration)

    rhythmLFO.start(now)
    rhythmLFO.stop(now + duration)
    osc1.onended = () => { ctx.close(); resolve() }
  })
}
