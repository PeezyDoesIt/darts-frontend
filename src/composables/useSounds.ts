export function playBuzzer(): Promise<void> {
  return new Promise(resolve => {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext
    if (!AudioCtx) { resolve(); return }
    const ctx = new AudioCtx()
    const now = ctx.currentTime
    const duration = 0.82

    // Hard clipper / distortion waveshaper
    const shaper = ctx.createWaveShaper()
    const n = 512
    const curve = new Float32Array(n)
    for (let i = 0; i < n; i++) {
      const x = (i * 2) / n - 1
      curve[i] = ((Math.PI + 80) * x) / (Math.PI + 80 * Math.abs(x))
    }
    shaper.curve = curve
    shaper.oversample = '4x'

    const master = ctx.createGain()
    master.gain.setValueAtTime(0, now)
    master.gain.linearRampToValueAtTime(1.1, now + 0.008) // near-instant punch
    master.gain.setValueAtTime(1.1, now + 0.52)
    master.gain.linearRampToValueAtTime(0, now + duration)
    master.connect(ctx.destination)

    // Primary buzz — square wave, descending pitch
    const osc1 = ctx.createOscillator()
    osc1.type = 'square'
    osc1.frequency.setValueAtTime(195, now)
    osc1.frequency.linearRampToValueAtTime(145, now + 0.35)
    osc1.frequency.linearRampToValueAtTime(110, now + duration)
    osc1.connect(shaper)
    shaper.connect(master)
    osc1.start(now)
    osc1.stop(now + duration)

    // Sub layer — sawtooth one octave down for weight
    const osc2 = ctx.createOscillator()
    const osc2Gain = ctx.createGain()
    osc2.type = 'sawtooth'
    osc2.frequency.setValueAtTime(97, now)
    osc2.frequency.linearRampToValueAtTime(55, now + duration)
    osc2Gain.gain.setValueAtTime(0.55, now)
    osc2Gain.gain.linearRampToValueAtTime(0, now + duration)
    osc2.connect(osc2Gain)
    osc2Gain.connect(master)
    osc2.start(now)
    osc2.stop(now + duration)

    // Hard thud at the very start — percussive impact
    const thud = ctx.createOscillator()
    const thudGain = ctx.createGain()
    thud.type = 'sine'
    thud.frequency.setValueAtTime(90, now)
    thud.frequency.exponentialRampToValueAtTime(30, now + 0.12)
    thudGain.gain.setValueAtTime(1.4, now)
    thudGain.gain.exponentialRampToValueAtTime(0.001, now + 0.12)
    thud.connect(thudGain)
    thudGain.connect(master)
    thud.start(now)
    thud.stop(now + 0.12)

    setTimeout(() => { ctx.close(); resolve() }, duration * 1000 + 80)
  })
}

export function playShotgun(): Promise<void> {
  return new Promise(resolve => {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext
    if (!AudioCtx) { resolve(); return }
    const ctx = new AudioCtx()
    const now = ctx.currentTime

    const master = ctx.createGain()
    master.gain.setValueAtTime(1.0, now)
    master.connect(ctx.destination)

    function makeNoiseSrc(duration: number): AudioBufferSourceNode {
      const buf = ctx.createBuffer(1, Math.ceil(ctx.sampleRate * duration), ctx.sampleRate)
      const d = buf.getChannelData(0)
      for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1
      const src = ctx.createBufferSource(); src.buffer = buf; return src
    }

    // ── PUMP: slide back ───────────────────────────────────────────────────
    const n1 = makeNoiseSrc(0.09)
    const bpf1 = ctx.createBiquadFilter(); bpf1.type = 'bandpass'; bpf1.frequency.setValueAtTime(1400, now); bpf1.frequency.linearRampToValueAtTime(700, now + 0.09); bpf1.Q.value = 2.8
    const g1 = ctx.createGain(); g1.gain.setValueAtTime(0, now); g1.gain.linearRampToValueAtTime(0.75, now + 0.005); g1.gain.setValueAtTime(0.75, now + 0.04); g1.gain.linearRampToValueAtTime(0, now + 0.09)
    n1.connect(bpf1); bpf1.connect(g1); g1.connect(master); n1.start(now); n1.stop(now + 0.09)
    // low thud 1
    const t1 = ctx.createOscillator(); const tg1 = ctx.createGain()
    t1.type = 'sine'; t1.frequency.setValueAtTime(110, now); t1.frequency.exponentialRampToValueAtTime(55, now + 0.07)
    tg1.gain.setValueAtTime(0.65, now); tg1.gain.exponentialRampToValueAtTime(0.001, now + 0.07)
    t1.connect(tg1); tg1.connect(master); t1.start(now); t1.stop(now + 0.07)

    // ── PUMP: slide forward + lock ─────────────────────────────────────────
    const t2 = now + 0.23
    const n2 = makeNoiseSrc(0.11)
    const bpf2 = ctx.createBiquadFilter(); bpf2.type = 'bandpass'; bpf2.frequency.setValueAtTime(900, t2); bpf2.frequency.linearRampToValueAtTime(450, t2 + 0.11); bpf2.Q.value = 2.2
    const g2 = ctx.createGain(); g2.gain.setValueAtTime(0, t2); g2.gain.linearRampToValueAtTime(1.0, t2 + 0.006); g2.gain.setValueAtTime(1.0, t2 + 0.03); g2.gain.linearRampToValueAtTime(0, t2 + 0.11)
    n2.connect(bpf2); bpf2.connect(g2); g2.connect(master); n2.start(t2); n2.stop(t2 + 0.11)
    // heavier thud 2
    const osc2 = ctx.createOscillator(); const tg2 = ctx.createGain()
    osc2.type = 'sine'; osc2.frequency.setValueAtTime(75, t2); osc2.frequency.exponentialRampToValueAtTime(28, t2 + 0.1)
    tg2.gain.setValueAtTime(1.1, t2); tg2.gain.exponentialRampToValueAtTime(0.001, t2 + 0.1)
    osc2.connect(tg2); tg2.connect(master); osc2.start(t2); osc2.stop(t2 + 0.1)

    // ── BLAST ──────────────────────────────────────────────────────────────
    const tFire = now + 0.52
    const blastDur = 1.35

    const bMaster = ctx.createGain()
    bMaster.gain.setValueAtTime(1.3, tFire)
    bMaster.gain.linearRampToValueAtTime(0, tFire + blastDur)
    bMaster.connect(ctx.destination)

    const blastNoise = makeNoiseSrc(blastDur)

    // Ultra-sharp initial crack
    const crackGain = ctx.createGain()
    crackGain.gain.setValueAtTime(3.0, tFire)
    crackGain.gain.exponentialRampToValueAtTime(0.001, tFire + 0.03)
    blastNoise.connect(crackGain); crackGain.connect(bMaster)

    // Low boom
    const boomLpf = ctx.createBiquadFilter(); boomLpf.type = 'lowpass'; boomLpf.frequency.setValueAtTime(220, tFire); boomLpf.frequency.exponentialRampToValueAtTime(55, tFire + 0.9)
    const boomGain = ctx.createGain(); boomGain.gain.setValueAtTime(0, tFire); boomGain.gain.linearRampToValueAtTime(2.2, tFire + 0.018); boomGain.gain.exponentialRampToValueAtTime(0.001, tFire + 1.0)
    blastNoise.connect(boomLpf); boomLpf.connect(boomGain); boomGain.connect(bMaster)

    // Mid crack
    const midBpf = ctx.createBiquadFilter(); midBpf.type = 'bandpass'; midBpf.frequency.setValueAtTime(1400, tFire); midBpf.frequency.exponentialRampToValueAtTime(350, tFire + 0.28); midBpf.Q.value = 0.7
    const midGain = ctx.createGain(); midGain.gain.setValueAtTime(1.6, tFire); midGain.gain.exponentialRampToValueAtTime(0.001, tFire + 0.32)
    blastNoise.connect(midBpf); midBpf.connect(midGain); midGain.connect(bMaster)

    // Sub cannon oscillator
    const sub = ctx.createOscillator(); const subGain = ctx.createGain()
    sub.type = 'sine'; sub.frequency.setValueAtTime(85, tFire); sub.frequency.exponentialRampToValueAtTime(28, tFire + 0.55)
    subGain.gain.setValueAtTime(2.0, tFire); subGain.gain.exponentialRampToValueAtTime(0.001, tFire + 0.65)
    sub.connect(subGain); subGain.connect(bMaster); sub.start(tFire); sub.stop(tFire + 0.65)

    blastNoise.start(tFire); blastNoise.stop(tFire + blastDur)

    setTimeout(() => { ctx.close(); resolve() }, (tFire - now + blastDur) * 1000 + 100)
  })
}

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
    const duration = 2.2

    const master = ctx.createGain()
    master.gain.setValueAtTime(0, now)
    master.gain.linearRampToValueAtTime(0.85, now + 0.1)   // soft attack
    master.gain.setValueAtTime(0.85, now + 1.6)
    master.gain.linearRampToValueAtTime(0, now + duration)
    master.connect(ctx.destination)

    // Vocal formant filter — shapes sawtooth into a voice-like timbre
    const formant = ctx.createBiquadFilter()
    formant.type = 'bandpass'
    formant.frequency.setValueAtTime(800, now)    // "mmm" closed
    formant.frequency.linearRampToValueAtTime(1200, now + 0.35) // mouth opens → "ohh"
    formant.frequency.linearRampToValueAtTime(900, now + 1.5)   // trailing off
    formant.Q.value = 3.5
    formant.connect(master)

    // Second formant for body / chest resonance
    const formant2 = ctx.createBiquadFilter()
    formant2.type = 'bandpass'
    formant2.frequency.setValueAtTime(280, now)
    formant2.frequency.linearRampToValueAtTime(340, now + 0.4)
    formant2.frequency.linearRampToValueAtTime(260, now + 1.8)
    formant2.Q.value = 6
    formant2.connect(master)

    // Main vocal oscillator — sawtooth for rich harmonic content
    const osc = ctx.createOscillator()
    osc.type = 'sawtooth'
    // Pitch arc: starts low-ish, peaks, then relaxes down — the classic moan contour
    osc.frequency.setValueAtTime(290, now)
    osc.frequency.linearRampToValueAtTime(370, now + 0.55)
    osc.frequency.linearRampToValueAtTime(410, now + 0.9)
    osc.frequency.linearRampToValueAtTime(300, now + 1.7)
    osc.frequency.linearRampToValueAtTime(260, now + duration)
    osc.connect(formant)
    osc.connect(formant2)
    osc.start(now)
    osc.stop(now + duration)

    // Vibrato LFO — kicks in after the initial attack
    const lfo = ctx.createOscillator()
    const lfoGain = ctx.createGain()
    lfo.type = 'sine'
    lfo.frequency.value = 5.8
    lfoGain.gain.setValueAtTime(0, now)
    lfoGain.gain.linearRampToValueAtTime(0, now + 0.2)
    lfoGain.gain.linearRampToValueAtTime(14, now + 0.6)  // vibrato depth in Hz
    lfoGain.gain.setValueAtTime(14, now + 1.4)
    lfoGain.gain.linearRampToValueAtTime(6, now + duration)
    lfo.connect(lfoGain)
    lfoGain.connect(osc.frequency)
    lfo.start(now)
    lfo.stop(now + duration)

    // Breathiness — filtered noise adds air/texture
    const bufSize = Math.ceil(ctx.sampleRate * duration)
    const noiseBuf = ctx.createBuffer(1, bufSize, ctx.sampleRate)
    const nd = noiseBuf.getChannelData(0)
    for (let i = 0; i < bufSize; i++) nd[i] = Math.random() * 2 - 1
    const noise = ctx.createBufferSource()
    noise.buffer = noiseBuf
    const noiseFilter = ctx.createBiquadFilter()
    noiseFilter.type = 'bandpass'
    noiseFilter.frequency.value = 2800
    noiseFilter.Q.value = 1.5
    const noiseGain = ctx.createGain()
    noiseGain.gain.setValueAtTime(0, now)
    noiseGain.gain.linearRampToValueAtTime(0.12, now + 0.08)
    noiseGain.gain.setValueAtTime(0.12, now + 1.5)
    noiseGain.gain.linearRampToValueAtTime(0, now + duration)
    noise.connect(noiseFilter)
    noiseFilter.connect(noiseGain)
    noiseGain.connect(master)
    noise.start(now)
    noise.stop(now + duration)

    setTimeout(() => { ctx.close(); resolve() }, duration * 1000 + 100)
  })
}
