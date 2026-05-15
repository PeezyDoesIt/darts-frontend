export function playBuzzer(): Promise<void> {
  return new Promise(resolve => {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext
    if (!AudioCtx) { resolve(); return }
    const ctx = new AudioCtx()
    const now = ctx.currentTime
    const duration = 0.75

    // Heavy hard-clip waveshaper — turns oscillators into ugly, electric square-ish buzz
    function makeShaper(amount: number): WaveShaperNode {
      const shaper = ctx.createWaveShaper()
      const n = 512
      const curve = new Float32Array(n)
      for (let i = 0; i < n; i++) {
        const x = (i * 2) / n - 1
        curve[i] = ((Math.PI + amount) * x) / (Math.PI + amount * Math.abs(x))
      }
      shaper.curve = curve
      shaper.oversample = '4x'
      return shaper
    }

    const master = ctx.createGain()
    master.gain.setValueAtTime(0, now)
    master.gain.linearRampToValueAtTime(1.0, now + 0.004) // instant slam
    master.gain.setValueAtTime(1.0, now + 0.60)
    master.gain.linearRampToValueAtTime(0, now + duration)
    master.connect(ctx.destination)

    // Three detuned square oscillators — the beating between them creates
    // the harsh "electric" character of a game show wrong-answer buzzer
    const freqs = [220, 227, 234]
    for (const freq of freqs) {
      const osc = ctx.createOscillator()
      osc.type = 'square'
      osc.frequency.setValueAtTime(freq, now)
      // Tiny pitch drop at the very end so it feels "final", not sci-fi
      osc.frequency.linearRampToValueAtTime(freq * 0.95, now + duration)
      const shaper = makeShaper(120)
      const oscGain = ctx.createGain()
      oscGain.gain.setValueAtTime(0.5, now)
      osc.connect(shaper)
      shaper.connect(oscGain)
      oscGain.connect(master)
      osc.start(now)
      osc.stop(now + duration)
    }

    // Sub rumble — gives it physical weight, like a relay slamming closed
    const sub = ctx.createOscillator()
    const subGain = ctx.createGain()
    sub.type = 'sawtooth'
    sub.frequency.setValueAtTime(110, now)
    sub.frequency.linearRampToValueAtTime(100, now + duration)
    subGain.gain.setValueAtTime(0.7, now)
    subGain.gain.linearRampToValueAtTime(0, now + duration)
    sub.connect(subGain)
    subGain.connect(master)
    sub.start(now)
    sub.stop(now + duration)

    // Electrical noise burst — crackle/spark texture at the attack
    const bufSize = Math.ceil(ctx.sampleRate * 0.06)
    const noiseBuf = ctx.createBuffer(1, bufSize, ctx.sampleRate)
    const nd = noiseBuf.getChannelData(0)
    for (let i = 0; i < bufSize; i++) nd[i] = Math.random() * 2 - 1
    const noise = ctx.createBufferSource()
    noise.buffer = noiseBuf
    const noiseHpf = ctx.createBiquadFilter(); noiseHpf.type = 'highpass'; noiseHpf.frequency.value = 1200
    const noiseGain = ctx.createGain()
    noiseGain.gain.setValueAtTime(1.8, now)
    noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.06)
    noise.connect(noiseHpf); noiseHpf.connect(noiseGain); noiseGain.connect(master)
    noise.start(now); noise.stop(now + 0.06)

    setTimeout(() => { ctx.close(); resolve() }, duration * 1000 + 80)
  })
}

export function playShotgun(): Promise<void> {
  return new Promise(resolve => {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext
    if (!AudioCtx) { resolve(); return }
    const ctx = new AudioCtx()
    const now = ctx.currentTime
    const duration = 1.5

    function makeNoise(dur: number): AudioBufferSourceNode {
      const buf = ctx.createBuffer(1, Math.ceil(ctx.sampleRate * dur), ctx.sampleRate)
      const d = buf.getChannelData(0)
      for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1
      const src = ctx.createBufferSource(); src.buffer = buf; return src
    }

    const master = ctx.createGain()
    master.gain.setValueAtTime(1.0, now)
    master.connect(ctx.destination)

    // ── MUZZLE CRACK: instantaneous broadband transient ───────────────────
    const crack = makeNoise(0.006)
    const crackGain = ctx.createGain()
    crackGain.gain.setValueAtTime(5.0, now)
    crackGain.gain.exponentialRampToValueAtTime(0.001, now + 0.006)
    crack.connect(crackGain); crackGain.connect(master)
    crack.start(now); crack.stop(now + 0.006)

    // ── HIGH SNAP: high-frequency bite right after crack ──────────────────
    const snap = makeNoise(0.05)
    const snapHpf = ctx.createBiquadFilter(); snapHpf.type = 'highpass'; snapHpf.frequency.value = 3500
    const snapGain = ctx.createGain()
    snapGain.gain.setValueAtTime(3.0, now)
    snapGain.gain.exponentialRampToValueAtTime(0.001, now + 0.05)
    snap.connect(snapHpf); snapHpf.connect(snapGain); snapGain.connect(master)
    snap.start(now); snap.stop(now + 0.05)

    // ── MID BANG: the body of the report, descends from 1kHz → 150Hz ─────
    const bang = makeNoise(duration)
    const bangBpf = ctx.createBiquadFilter(); bangBpf.type = 'bandpass'
    bangBpf.frequency.setValueAtTime(1000, now); bangBpf.frequency.exponentialRampToValueAtTime(150, now + 0.25); bangBpf.Q.value = 0.6
    const bangGain = ctx.createGain()
    bangGain.gain.setValueAtTime(0, now)
    bangGain.gain.linearRampToValueAtTime(2.8, now + 0.003)
    bangGain.gain.exponentialRampToValueAtTime(0.001, now + 0.4)
    bang.connect(bangBpf); bangBpf.connect(bangGain); bangGain.connect(master)
    bang.start(now); bang.stop(now + duration)

    // ── LOW BOOM: deep pressure wave through a low-pass ───────────────────
    const boom = makeNoise(duration)
    const boomLpf = ctx.createBiquadFilter(); boomLpf.type = 'lowpass'
    boomLpf.frequency.setValueAtTime(200, now); boomLpf.frequency.exponentialRampToValueAtTime(40, now + 0.85)
    const boomGain = ctx.createGain()
    boomGain.gain.setValueAtTime(0, now)
    boomGain.gain.linearRampToValueAtTime(3.2, now + 0.005)
    boomGain.gain.exponentialRampToValueAtTime(0.001, now + 1.0)
    boom.connect(boomLpf); boomLpf.connect(boomGain); boomGain.connect(master)
    boom.start(now); boom.stop(now + duration)

    // ── SUB THUMP: sine descending from 90Hz → 20Hz ───────────────────────
    const sub = ctx.createOscillator(); const subGain = ctx.createGain()
    sub.type = 'sine'
    sub.frequency.setValueAtTime(90, now); sub.frequency.exponentialRampToValueAtTime(20, now + 0.5)
    subGain.gain.setValueAtTime(3.0, now); subGain.gain.exponentialRampToValueAtTime(0.001, now + 0.55)
    sub.connect(subGain); subGain.connect(master); sub.start(now); sub.stop(now + 0.55)

    // ── TAIL: decaying room resonance ─────────────────────────────────────
    const tail = makeNoise(duration)
    const tailBpf = ctx.createBiquadFilter(); tailBpf.type = 'bandpass'; tailBpf.frequency.value = 500; tailBpf.Q.value = 0.4
    const tailGain = ctx.createGain()
    tailGain.gain.setValueAtTime(0, now + 0.06)
    tailGain.gain.linearRampToValueAtTime(0.6, now + 0.12)
    tailGain.gain.exponentialRampToValueAtTime(0.001, now + duration)
    tail.connect(tailBpf); tailBpf.connect(tailGain); tailGain.connect(master)
    tail.start(now); tail.stop(now + duration)

    setTimeout(() => { ctx.close(); resolve() }, duration * 1000 + 100)
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
