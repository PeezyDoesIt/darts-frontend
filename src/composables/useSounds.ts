// Shared AudioContext kept alive for beeps fired from setInterval.
// Call unlockAudio() from any user-gesture handler to pre-warm it.
const AudioCtxCtor = () => window.AudioContext || (window as any).webkitAudioContext
let _beepCtx: AudioContext | null = null

function getBeepCtx(): AudioContext | null {
  const Ctor = AudioCtxCtor()
  if (!Ctor) return null
  if (!_beepCtx || _beepCtx.state === 'closed') _beepCtx = new Ctor()
  return _beepCtx
}

export function unlockAudio(): void {
  const ctx = getBeepCtx()
  if (ctx && ctx.state === 'suspended') ctx.resume().catch(() => {})
  // Also unlock speech synthesis within the user gesture context
  try { window.speechSynthesis.resume() } catch {}
}

function scheduleBeep(ctx: AudioContext): void {
  const now = ctx.currentTime
  const osc = ctx.createOscillator()
  osc.type = 'sine'
  osc.frequency.value = 880

  const clickOsc = ctx.createOscillator()
  clickOsc.type = 'square'
  clickOsc.frequency.value = 1760

  const master = ctx.createGain()
  master.gain.setValueAtTime(0, now)
  master.gain.linearRampToValueAtTime(1.0, now + 0.004)
  master.gain.setValueAtTime(1.0, now + 0.06)
  master.gain.exponentialRampToValueAtTime(0.001, now + 0.2)
  master.connect(ctx.destination)

  const clickGain = ctx.createGain()
  clickGain.gain.setValueAtTime(0.45, now)
  clickGain.gain.exponentialRampToValueAtTime(0.001, now + 0.012)
  clickOsc.connect(clickGain)
  clickGain.connect(master)

  osc.connect(master)
  osc.start(now); osc.stop(now + 0.2)
  clickOsc.start(now); clickOsc.stop(now + 0.012)
}

export function playStartChime(): void {
  const ctx = getBeepCtx()
  if (!ctx) return
  const go = () => {
    const now = ctx.currentTime
    // 4-note ascending arpeggio: C5 → E5 → G5 → C6
    const notes = [523.25, 659.25, 783.99, 1046.50]
    notes.forEach((freq, i) => {
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.type = 'sine'
      osc.frequency.value = freq
      const t = now + i * 0.13
      gain.gain.setValueAtTime(0, t)
      gain.gain.linearRampToValueAtTime(0.6, t + 0.01)
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.55)
      osc.connect(gain)
      gain.connect(ctx.destination)
      osc.start(t)
      osc.stop(t + 0.55)
    })
  }
  ctx.state === 'suspended' ? ctx.resume().then(go).catch(() => {}) : go()
}

export function playChime(): void {
  const ctx = getBeepCtx()
  if (!ctx) return
  const go = () => {
    const now = ctx.currentTime
    // Two-note rising chime: root then major third up
    const notes = [523.25, 659.25] // C5 → E5
    notes.forEach((freq, i) => {
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.type = 'sine'
      osc.frequency.value = freq
      const t = now + i * 0.18
      gain.gain.setValueAtTime(0, t)
      gain.gain.linearRampToValueAtTime(0.55, t + 0.01)
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.55)
      osc.connect(gain)
      gain.connect(ctx.destination)
      osc.start(t)
      osc.stop(t + 0.55)
    })
  }
  ctx.state === 'suspended' ? ctx.resume().then(go).catch(() => {}) : go()
}

export function playCountdownBeep(): void {
  const ctx = getBeepCtx()
  if (!ctx) return
  if (ctx.state === 'suspended') {
    ctx.resume().then(() => scheduleBeep(ctx)).catch(() => {})
  } else {
    scheduleBeep(ctx)
  }
}

export function playBuzzer(): Promise<void> {
  return new Promise(resolve => {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext
    if (!AudioCtx) { resolve(); return }
    const ctx = new AudioCtx()

    const schedule = () => {
    const now = ctx.currentTime
    const duration = 0.49

    // Brick-wall clipper: converts sawtooth into a filthy, square-ish buzz
    const shaper = ctx.createWaveShaper()
    const n = 512
    const curve = new Float32Array(n)
    for (let i = 0; i < n; i++) {
      const x = (i * 2) / n - 1
      curve[i] = Math.max(-0.95, Math.min(0.95, x * 18))
    }
    shaper.curve = curve
    shaper.oversample = '4x'

    const master = ctx.createGain()
    master.gain.setValueAtTime(0, now)
    master.gain.linearRampToValueAtTime(0.9, now + 0.003) // instant slam on
    master.gain.setValueAtTime(0.9, now + 0.39)
    master.gain.linearRampToValueAtTime(0, now + duration) // hard cutoff
    master.connect(ctx.destination)

    // Main buzz — sawtooth at 130 Hz, no pitch sweep (sweep = laser, not buzzer)
    // Sawtooth through a brick-wall clip becomes brutally harsh
    const osc = ctx.createOscillator()
    osc.type = 'sawtooth'
    osc.frequency.value = 130
    osc.connect(shaper)
    shaper.connect(master)
    osc.start(now)
    osc.stop(now + duration)

    // Octave harmonic — adds grit/buzz texture without creating beating
    const osc2 = ctx.createOscillator()
    const osc2Gain = ctx.createGain()
    osc2.type = 'sawtooth'
    osc2.frequency.value = 260
    osc2Gain.gain.setValueAtTime(0.35, now)
    osc2Gain.gain.linearRampToValueAtTime(0, now + duration)
    osc2.connect(osc2Gain)
    osc2Gain.connect(master)
    osc2.start(now)
    osc2.stop(now + duration)

    // Electrical tremolo — fast amplitude modulation (12 Hz) simulates a buzzing relay
    // Adds the choppy "electric" texture without a pitch sweep
    const tremLFO = ctx.createOscillator()
    const tremDepth = ctx.createGain()
    tremLFO.type = 'square'
    tremLFO.frequency.value = 12
    tremDepth.gain.value = 0.18  // modulates master gain ±0.18 around its base
    tremLFO.connect(tremDepth)
    tremDepth.connect(master.gain)
    tremLFO.start(now)
    tremLFO.stop(now + duration)

    // Electric crack at the attack — the "spark" when the relay first closes
    const bufSize = Math.ceil(ctx.sampleRate * 0.035)
    const noiseBuf = ctx.createBuffer(1, bufSize, ctx.sampleRate)
    const nd = noiseBuf.getChannelData(0)
    for (let i = 0; i < bufSize; i++) nd[i] = Math.random() * 2 - 1
    const noise = ctx.createBufferSource()
    noise.buffer = noiseBuf
    const noiseGain = ctx.createGain()
    noiseGain.gain.setValueAtTime(3.0, now)
    noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.035)
    noise.connect(noiseGain)
    noiseGain.connect(master)
    noise.start(now); noise.stop(now + 0.035)

    setTimeout(() => { ctx.close(); resolve() }, duration * 1000 + 80)
    }

    ctx.resume().then(schedule)
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

// ─────────────────────────────────────────────────────────────────────────────
// SPACE THEME
// ─────────────────────────────────────────────────────────────────────────────

export function playSpaceChime(): void {
  const ctx = getBeepCtx()
  if (!ctx) return
  const go = () => {
    const now = ctx.currentTime
    const notes = [330, 440, 660, 880, 1320]
    notes.forEach((freq, i) => {
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.type = 'sine'
      osc.frequency.value = freq
      const t = now + i * 0.09
      gain.gain.setValueAtTime(0, t)
      gain.gain.linearRampToValueAtTime(0.5, t + 0.008)
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.35)
      osc.connect(gain); gain.connect(ctx.destination)
      osc.start(t); osc.stop(t + 0.35)
    })
  }
  ctx.state === 'suspended' ? ctx.resume().then(go).catch(() => {}) : go()
}

export function scheduleSpaceTick(ctx: AudioContext): void {
  const now = ctx.currentTime
  const osc = ctx.createOscillator()
  const gain = ctx.createGain()
  osc.type = 'sine'
  osc.frequency.setValueAtTime(1200, now)
  osc.frequency.exponentialRampToValueAtTime(400, now + 0.08)
  gain.gain.setValueAtTime(0.7, now)
  gain.gain.exponentialRampToValueAtTime(0.001, now + 0.1)
  osc.connect(gain); gain.connect(ctx.destination)
  osc.start(now); osc.stop(now + 0.1)
}

export function playSpaceBuzzer(): Promise<void> {
  return new Promise(resolve => {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext
    if (!AudioCtx) { resolve(); return }
    const ctx = new AudioCtx()
    const schedule = () => {
      const now = ctx.currentTime
      const duration = 0.9
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.type = 'sine'
      osc.frequency.setValueAtTime(300, now)
      osc.frequency.exponentialRampToValueAtTime(60, now + duration)
      gain.gain.setValueAtTime(0, now)
      gain.gain.linearRampToValueAtTime(0.8, now + 0.02)
      gain.gain.setValueAtTime(0.8, now + 0.5)
      gain.gain.linearRampToValueAtTime(0, now + duration)
      osc.connect(gain); gain.connect(ctx.destination)
      osc.start(now); osc.stop(now + duration)
      const lfo = ctx.createOscillator()
      const lfoGain = ctx.createGain()
      lfo.type = 'sine'; lfo.frequency.value = 18
      lfoGain.gain.value = 30
      lfo.connect(lfoGain); lfoGain.connect(osc.frequency)
      lfo.start(now); lfo.stop(now + duration)
      setTimeout(() => { ctx.close(); resolve() }, duration * 1000 + 80)
    }
    ctx.resume().then(schedule)
  })
}

export function playSpaceLaser(): Promise<void> {
  return new Promise(resolve => {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext
    if (!AudioCtx) { resolve(); return }
    const ctx = new AudioCtx()
    const schedule = () => {
      const now = ctx.currentTime
      const duration = 0.6
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.type = 'sawtooth'
      osc.frequency.setValueAtTime(2200, now)
      osc.frequency.exponentialRampToValueAtTime(200, now + duration)
      gain.gain.setValueAtTime(0, now)
      gain.gain.linearRampToValueAtTime(0.7, now + 0.005)
      gain.gain.exponentialRampToValueAtTime(0.001, now + duration)
      const filter = ctx.createBiquadFilter()
      filter.type = 'lowpass'; filter.frequency.value = 3000
      osc.connect(filter); filter.connect(gain); gain.connect(ctx.destination)
      osc.start(now); osc.stop(now + duration)
      setTimeout(() => { ctx.close(); resolve() }, duration * 1000 + 80)
    }
    ctx.resume().then(schedule)
  })
}

// ─────────────────────────────────────────────────────────────────────────────
// RETRO ARCADE THEME
// ─────────────────────────────────────────────────────────────────────────────

export function playArcadeChime(): void {
  const ctx = getBeepCtx()
  if (!ctx) return
  const go = () => {
    const now = ctx.currentTime
    const notes = [261.63, 329.63, 392, 523.25]
    notes.forEach((freq, i) => {
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.type = 'square'
      osc.frequency.value = freq
      const t = now + i * 0.08
      gain.gain.setValueAtTime(0.4, t)
      gain.gain.setValueAtTime(0.4, t + 0.06)
      gain.gain.linearRampToValueAtTime(0, t + 0.08)
      osc.connect(gain); gain.connect(ctx.destination)
      osc.start(t); osc.stop(t + 0.08)
    })
  }
  ctx.state === 'suspended' ? ctx.resume().then(go).catch(() => {}) : go()
}

export function scheduleArcadeTick(ctx: AudioContext): void {
  const now = ctx.currentTime
  const osc = ctx.createOscillator()
  const gain = ctx.createGain()
  osc.type = 'square'
  osc.frequency.value = 1047
  gain.gain.setValueAtTime(0.4, now)
  gain.gain.setValueAtTime(0.4, now + 0.05)
  gain.gain.linearRampToValueAtTime(0, now + 0.07)
  osc.connect(gain); gain.connect(ctx.destination)
  osc.start(now); osc.stop(now + 0.07)
}

export function playArcadeBuzzer(): Promise<void> {
  return new Promise(resolve => {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext
    if (!AudioCtx) { resolve(); return }
    const ctx = new AudioCtx()
    const schedule = () => {
      const now = ctx.currentTime
      const freqs = [220, 196, 174.61, 155.56, 130.81]
      freqs.forEach((freq, i) => {
        const osc = ctx.createOscillator()
        const gain = ctx.createGain()
        osc.type = 'square'
        osc.frequency.value = freq
        const t = now + i * 0.07
        gain.gain.setValueAtTime(0.4, t)
        gain.gain.setValueAtTime(0.4, t + 0.06)
        gain.gain.linearRampToValueAtTime(0, t + 0.07)
        osc.connect(gain); gain.connect(ctx.destination)
        osc.start(t); osc.stop(t + 0.07)
      })
      setTimeout(() => { ctx.close(); resolve() }, 500)
    }
    ctx.resume().then(schedule)
  })
}

export function playArcadeFanfare(): Promise<void> {
  return new Promise(resolve => {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext
    if (!AudioCtx) { resolve(); return }
    const ctx = new AudioCtx()
    const schedule = () => {
      const now = ctx.currentTime
      const notes = [523.25, 659.25, 783.99, 1046.5, 783.99, 1046.5]
      const times  = [0,      0.1,    0.2,    0.3,    0.45,   0.55]
      const durs   = [0.09,   0.09,   0.09,   0.14,   0.09,   0.4]
      notes.forEach((freq, i) => {
        const osc = ctx.createOscillator()
        const gain = ctx.createGain()
        osc.type = 'square'
        osc.frequency.value = freq
        const t = now + times[i]
        gain.gain.setValueAtTime(0.35, t)
        gain.gain.setValueAtTime(0.35, t + durs[i] - 0.01)
        gain.gain.linearRampToValueAtTime(0, t + durs[i])
        osc.connect(gain); gain.connect(ctx.destination)
        osc.start(t); osc.stop(t + durs[i])
      })
      setTimeout(() => { ctx.close(); resolve() }, 1100)
    }
    ctx.resume().then(schedule)
  })
}

// ─────────────────────────────────────────────────────────────────────────────
// WESTERN THEME
// ─────────────────────────────────────────────────────────────────────────────

export function playWesternChime(): void {
  const ctx = getBeepCtx()
  if (!ctx) return
  const go = () => {
    const now = ctx.currentTime
    const notes = [392, 493.88, 587.33]
    notes.forEach((freq, i) => {
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.type = 'triangle'
      osc.frequency.value = freq
      const t = now + i * 0.15
      gain.gain.setValueAtTime(0, t)
      gain.gain.linearRampToValueAtTime(0.7, t + 0.005)
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.7)
      osc.connect(gain); gain.connect(ctx.destination)
      osc.start(t); osc.stop(t + 0.7)
    })
  }
  ctx.state === 'suspended' ? ctx.resume().then(go).catch(() => {}) : go()
}

export function scheduleWesternTick(ctx: AudioContext): void {
  const now = ctx.currentTime
  const osc = ctx.createOscillator()
  const gain = ctx.createGain()
  osc.type = 'triangle'
  osc.frequency.value = 1200
  gain.gain.setValueAtTime(0, now)
  gain.gain.linearRampToValueAtTime(0.6, now + 0.003)
  gain.gain.exponentialRampToValueAtTime(0.001, now + 0.18)
  osc.connect(gain); gain.connect(ctx.destination)
  osc.start(now); osc.stop(now + 0.18)
}

export function playWesternBuzzer(): Promise<void> {
  return new Promise(resolve => {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext
    if (!AudioCtx) { resolve(); return }
    const ctx = new AudioCtx()
    const schedule = () => {
      const now = ctx.currentTime
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.type = 'sawtooth'
      osc.frequency.setValueAtTime(440, now)
      osc.frequency.linearRampToValueAtTime(220, now + 0.3)
      osc.frequency.setValueAtTime(349.23, now + 0.35)
      osc.frequency.linearRampToValueAtTime(196, now + 0.65)
      osc.frequency.setValueAtTime(261.63, now + 0.7)
      osc.frequency.linearRampToValueAtTime(146.83, now + 1.1)
      const bpf = ctx.createBiquadFilter()
      bpf.type = 'bandpass'; bpf.frequency.value = 800; bpf.Q.value = 1.5
      gain.gain.setValueAtTime(0, now)
      gain.gain.linearRampToValueAtTime(0.55, now + 0.02)
      gain.gain.setValueAtTime(0.55, now + 0.9)
      gain.gain.linearRampToValueAtTime(0, now + 1.2)
      osc.connect(bpf); bpf.connect(gain); gain.connect(ctx.destination)
      osc.start(now); osc.stop(now + 1.2)
      setTimeout(() => { ctx.close(); resolve() }, 1350)
    }
    ctx.resume().then(schedule)
  })
}

export function playWesternGunshot(): Promise<void> {
  return new Promise(resolve => {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext
    if (!AudioCtx) { resolve(); return }
    const ctx = new AudioCtx()
    const schedule = () => {
      const now = ctx.currentTime
      const duration = 1.2
      const master = ctx.createGain()
      master.gain.setValueAtTime(0.9, now)
      master.connect(ctx.destination)
      const bufSize = Math.ceil(ctx.sampleRate * 0.008)
      const noiseBuf = ctx.createBuffer(1, bufSize, ctx.sampleRate)
      const nd = noiseBuf.getChannelData(0)
      for (let i = 0; i < bufSize; i++) nd[i] = Math.random() * 2 - 1
      const crack = ctx.createBufferSource(); crack.buffer = noiseBuf
      const crackGain = ctx.createGain()
      crackGain.gain.setValueAtTime(4.0, now)
      crackGain.gain.exponentialRampToValueAtTime(0.001, now + 0.008)
      crack.connect(crackGain); crackGain.connect(master)
      crack.start(now); crack.stop(now + 0.008)
      const bodyBuf = ctx.createBuffer(1, Math.ceil(ctx.sampleRate * duration), ctx.sampleRate)
      const bd = bodyBuf.getChannelData(0)
      for (let i = 0; i < bd.length; i++) bd[i] = Math.random() * 2 - 1
      const body = ctx.createBufferSource(); body.buffer = bodyBuf
      const lpf = ctx.createBiquadFilter(); lpf.type = 'lowpass'
      lpf.frequency.setValueAtTime(600, now); lpf.frequency.exponentialRampToValueAtTime(80, now + 0.5)
      const bodyGain = ctx.createGain()
      bodyGain.gain.setValueAtTime(2.0, now)
      bodyGain.gain.exponentialRampToValueAtTime(0.001, now + 0.55)
      body.connect(lpf); lpf.connect(bodyGain); bodyGain.connect(master)
      body.start(now); body.stop(now + duration)
      setTimeout(() => { ctx.close(); resolve() }, duration * 1000 + 80)
    }
    ctx.resume().then(schedule)
  })
}

// ─────────────────────────────────────────────────────────────────────────────
// BOXING THEME
// ─────────────────────────────────────────────────────────────────────────────

export function playBoxingChime(): void {
  const ctx = getBeepCtx()
  if (!ctx) return
  const go = () => {
    const now = ctx.currentTime
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.type = 'sine'
    osc.frequency.setValueAtTime(900, now)
    osc.frequency.linearRampToValueAtTime(860, now + 0.5)
    gain.gain.setValueAtTime(0, now)
    gain.gain.linearRampToValueAtTime(0.9, now + 0.005)
    gain.gain.exponentialRampToValueAtTime(0.001, now + 1.2)
    osc.connect(gain); gain.connect(ctx.destination)
    osc.start(now); osc.stop(now + 1.2)
    const osc2 = ctx.createOscillator()
    const gain2 = ctx.createGain()
    osc2.type = 'sine'; osc2.frequency.value = 1800
    gain2.gain.setValueAtTime(0, now)
    gain2.gain.linearRampToValueAtTime(0.3, now + 0.005)
    gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.6)
    osc2.connect(gain2); gain2.connect(ctx.destination)
    osc2.start(now); osc2.stop(now + 0.6)
  }
  ctx.state === 'suspended' ? ctx.resume().then(go).catch(() => {}) : go()
}

export function scheduleBoxingTick(ctx: AudioContext): void {
  const now = ctx.currentTime
  const osc = ctx.createOscillator()
  const gain = ctx.createGain()
  osc.type = 'sine'
  osc.frequency.setValueAtTime(200, now)
  osc.frequency.exponentialRampToValueAtTime(80, now + 0.05)
  gain.gain.setValueAtTime(0.8, now)
  gain.gain.exponentialRampToValueAtTime(0.001, now + 0.07)
  osc.connect(gain); gain.connect(ctx.destination)
  osc.start(now); osc.stop(now + 0.07)
}

export function playBoxingBuzzer(): Promise<void> {
  return new Promise(resolve => {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext
    if (!AudioCtx) { resolve(); return }
    const ctx = new AudioCtx()
    const schedule = () => {
      const now = ctx.currentTime
      const times = [0, 0.18, 0.36]
      times.forEach(offset => {
        const t = now + offset
        const osc = ctx.createOscillator()
        const gain = ctx.createGain()
        osc.type = 'sine'; osc.frequency.value = 900
        gain.gain.setValueAtTime(0, t)
        gain.gain.linearRampToValueAtTime(0.8, t + 0.005)
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.15)
        osc.connect(gain); gain.connect(ctx.destination)
        osc.start(t); osc.stop(t + 0.15)
      })
      setTimeout(() => { ctx.close(); resolve() }, 600)
    }
    ctx.resume().then(schedule)
  })
}

export function playBoxingImpact(): Promise<void> {
  return new Promise(resolve => {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext
    if (!AudioCtx) { resolve(); return }
    const ctx = new AudioCtx()
    const schedule = () => {
      const now = ctx.currentTime
      const duration = 0.5
      const master = ctx.createGain()
      master.gain.setValueAtTime(0.9, now)
      master.connect(ctx.destination)
      const bufSize = Math.ceil(ctx.sampleRate * duration)
      const noiseBuf = ctx.createBuffer(1, bufSize, ctx.sampleRate)
      const nd = noiseBuf.getChannelData(0)
      for (let i = 0; i < bufSize; i++) nd[i] = Math.random() * 2 - 1
      const noise = ctx.createBufferSource(); noise.buffer = noiseBuf
      const lpf = ctx.createBiquadFilter(); lpf.type = 'lowpass'; lpf.frequency.value = 300
      const noiseGain = ctx.createGain()
      noiseGain.gain.setValueAtTime(2.5, now)
      noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.12)
      noise.connect(lpf); lpf.connect(noiseGain); noiseGain.connect(master)
      noise.start(now); noise.stop(now + duration)
      const sub = ctx.createOscillator()
      const subGain = ctx.createGain()
      sub.type = 'sine'
      sub.frequency.setValueAtTime(120, now)
      sub.frequency.exponentialRampToValueAtTime(40, now + 0.15)
      subGain.gain.setValueAtTime(2.0, now)
      subGain.gain.exponentialRampToValueAtTime(0.001, now + 0.2)
      sub.connect(subGain); subGain.connect(master)
      sub.start(now); sub.stop(now + 0.2)
      const bufSize2 = Math.ceil(ctx.sampleRate * 0.01)
      const slapBuf = ctx.createBuffer(1, bufSize2, ctx.sampleRate)
      const sd = slapBuf.getChannelData(0)
      for (let i = 0; i < bufSize2; i++) sd[i] = Math.random() * 2 - 1
      const slap = ctx.createBufferSource(); slap.buffer = slapBuf
      const hpf = ctx.createBiquadFilter(); hpf.type = 'highpass'; hpf.frequency.value = 2000
      const slapGain = ctx.createGain()
      slapGain.gain.setValueAtTime(3.0, now)
      slapGain.gain.exponentialRampToValueAtTime(0.001, now + 0.01)
      slap.connect(hpf); hpf.connect(slapGain); slapGain.connect(master)
      slap.start(now); slap.stop(now + 0.01)
      setTimeout(() => { ctx.close(); resolve() }, duration * 1000 + 80)
    }
    ctx.resume().then(schedule)
  })
}

// ─────────────────────────────────────────────────────────────────────────────
// Game show wrong-answer buzzer — descending "BWAAAH", loud, harsh
export function playGameShowBuzzer(): void {
  const AudioCtx = window.AudioContext || (window as any).webkitAudioContext
  if (!AudioCtx) return
  const ctx = new AudioCtx()
  const schedule = () => {
    const now = ctx.currentTime
    const duration = 0.75

    // Brick-wall clipper for maximum harshness
    const shaper = ctx.createWaveShaper()
    const n = 512
    const curve = new Float32Array(n)
    for (let i = 0; i < n; i++) {
      const x = (i * 2) / n - 1
      curve[i] = Math.max(-0.97, Math.min(0.97, x * 22))
    }
    shaper.curve = curve
    shaper.oversample = '4x'

    const master = ctx.createGain()
    master.gain.setValueAtTime(0, now)
    master.gain.linearRampToValueAtTime(1.2, now + 0.004) // instant slam
    master.gain.setValueAtTime(1.2, now + 0.55)
    master.gain.linearRampToValueAtTime(0, now + duration)
    master.connect(ctx.destination)

    // Main descending buzz — starts high, sweeps down fast (classic "BWAAAH")
    const osc = ctx.createOscillator()
    osc.type = 'sawtooth'
    osc.frequency.setValueAtTime(220, now)
    osc.frequency.exponentialRampToValueAtTime(75, now + 0.45)
    osc.frequency.setValueAtTime(70, now + 0.45)
    osc.connect(shaper)
    shaper.connect(master)
    osc.start(now)
    osc.stop(now + duration)

    // Octave layer adds thickness
    const osc2 = ctx.createOscillator()
    const osc2Gain = ctx.createGain()
    osc2.type = 'sawtooth'
    osc2.frequency.setValueAtTime(440, now)
    osc2.frequency.exponentialRampToValueAtTime(150, now + 0.45)
    osc2Gain.gain.setValueAtTime(0.4, now)
    osc2Gain.gain.linearRampToValueAtTime(0, now + duration)
    osc2.connect(osc2Gain)
    osc2Gain.connect(master)
    osc2.start(now)
    osc2.stop(now + duration)

    // Attack transient noise — the initial "crack" that makes it feel punchy
    const bufSize = Math.ceil(ctx.sampleRate * 0.04)
    const noiseBuf = ctx.createBuffer(1, bufSize, ctx.sampleRate)
    const nd = noiseBuf.getChannelData(0)
    for (let i = 0; i < bufSize; i++) nd[i] = Math.random() * 2 - 1
    const noise = ctx.createBufferSource()
    noise.buffer = noiseBuf
    const noiseGain = ctx.createGain()
    noiseGain.gain.setValueAtTime(4.0, now)
    noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.04)
    noise.connect(noiseGain)
    noiseGain.connect(master)
    noise.start(now)
    noise.stop(now + 0.04)

    setTimeout(() => ctx.close(), duration * 1000 + 100)
  }
  ctx.resume().then(schedule)
}

// ─────────────────────────────────────────────────────────────────────────────
// Loud bomb-countdown beep — lower-pitched, heavy, used for final 5s of throw timer
export function playBombBeep(): void {
  const ctx = getBeepCtx()
  if (!ctx) return
  const run = () => {
    const now = ctx.currentTime

    const master = ctx.createGain()
    master.gain.setValueAtTime(0, now)
    master.gain.linearRampToValueAtTime(1.0, now + 0.003) // instant hard slam
    master.gain.setValueAtTime(1.0, now + 0.09)
    master.gain.exponentialRampToValueAtTime(0.001, now + 0.26)
    master.connect(ctx.destination)

    // Primary tone: 660 Hz — lower and more ominous than the standard 880 Hz tick
    const osc = ctx.createOscillator()
    osc.type = 'sine'
    osc.frequency.value = 660
    osc.connect(master)
    osc.start(now); osc.stop(now + 0.26)

    // Sub harmonic at 330 Hz adds weight/thump
    const sub = ctx.createOscillator()
    const subGain = ctx.createGain()
    sub.type = 'sine'
    sub.frequency.value = 330
    subGain.gain.setValueAtTime(0.55, now)
    subGain.gain.exponentialRampToValueAtTime(0.001, now + 0.26)
    sub.connect(subGain); subGain.connect(master)
    sub.start(now); sub.stop(now + 0.26)

    // Sharp transient click at attack for that hard-beep edge
    const click = ctx.createOscillator()
    const clickGain = ctx.createGain()
    click.type = 'square'
    click.frequency.value = 1320
    clickGain.gain.setValueAtTime(0.7, now)
    clickGain.gain.exponentialRampToValueAtTime(0.001, now + 0.012)
    click.connect(clickGain); clickGain.connect(master)
    click.start(now); click.stop(now + 0.012)
  }
  ctx.state === 'suspended' ? ctx.resume().then(run).catch(() => {}) : run()
}

// THEMED DISPATCHERS
// theme: 'default' | 'space' | 'arcade' | 'western' | 'boxing'
// ─────────────────────────────────────────────────────────────────────────────

export function playThemedChime(theme: string): void {
  switch (theme) {
    case 'space':   return playSpaceChime()
    case 'arcade':  return playArcadeChime()
    case 'western': return playWesternChime()
    case 'boxing':  return playBoxingChime()
    default:        return playChime()
  }
}

export function playThemedTick(theme: string): void {
  const ctx = getBeepCtx()
  if (!ctx) return
  const run = () => {
    switch (theme) {
      case 'space':   return scheduleSpaceTick(ctx)
      case 'arcade':  return scheduleArcadeTick(ctx)
      case 'western': return scheduleWesternTick(ctx)
      case 'boxing':  return scheduleBoxingTick(ctx)
      default:        return scheduleBeep(ctx)
    }
  }
  ctx.state === 'suspended' ? ctx.resume().then(run).catch(() => {}) : run()
}

export function playThemedBuzzer(theme: string): Promise<void> {
  switch (theme) {
    case 'space':   return playSpaceBuzzer()
    case 'arcade':  return playArcadeBuzzer()
    case 'western': return playWesternBuzzer()
    case 'boxing':  return playBoxingBuzzer()
    default:        return playBuzzer()
  }
}

export function playThemedBullseye(theme: string): Promise<void> {
  switch (theme) {
    case 'space':   return playSpaceLaser()
    case 'arcade':  return playArcadeFanfare()
    case 'western': return playWesternGunshot()
    case 'boxing':  return playBoxingImpact()
    default:        return playBullseye()
  }
}

// Bright rising 3-note arpeggio — plays when a player's turn begins
export function playTurnStartTone(): void {
  const ctx = getBeepCtx()
  if (!ctx) return
  const go = () => {
    const now = ctx.currentTime
    // E5 → G#5 → B5 — bright, welcoming, "your turn" feel
    const notes = [659.25, 830.61, 987.77]
    notes.forEach((freq, i) => {
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.type = 'triangle'
      osc.frequency.value = freq
      const t = now + i * 0.11
      gain.gain.setValueAtTime(0, t)
      gain.gain.linearRampToValueAtTime(0.45, t + 0.015)
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.38)
      osc.connect(gain)
      gain.connect(ctx.destination)
      osc.start(t)
      osc.stop(t + 0.4)
    })
  }
  ctx.state === 'suspended' ? ctx.resume().then(go).catch(() => {}) : go()
}

/**
 * Short falling 2-note thud. This is the *scoreless* turn sound — it plays only when a
 * player submits a turn having hit nothing. It used to fire on every submit, so a good
 * turn was rewarded with a downbeat thud; see playTurnResultSound.
 */
export function playTurnEndBeep(): void {
  const ctx = getBeepCtx()
  if (!ctx) return
  const go = () => {
    const now = ctx.currentTime
    // G3 → D3 — lower, heavier, "done / submit" feel
    const notes = [196.00, 146.83]
    notes.forEach((freq, i) => {
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.type = 'square'
      osc.frequency.value = freq
      const t = now + i * 0.13
      gain.gain.setValueAtTime(0, t)
      gain.gain.linearRampToValueAtTime(0.3, t + 0.01)
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.22)
      osc.connect(gain)
      gain.connect(ctx.destination)
      osc.start(t)
      osc.stop(t + 0.25)
    })
  }
  ctx.state === 'suspended' ? ctx.resume().then(go).catch(() => {}) : go()
}

// Rising 3-note major triad — plays when a player submits a turn having scored something.
// Deliberately shorter than playTurnStartTone so it clears before the narrator speaks.
export function playTurnScoreChime(): void {
  const ctx = getBeepCtx()
  if (!ctx) return
  const go = () => {
    const now = ctx.currentTime
    // C5 → E5 → G5 — bright, affirming, "you got points" feel
    const notes = [523.25, 659.25, 783.99]
    notes.forEach((freq, i) => {
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.type = 'triangle'
      osc.frequency.value = freq
      const t = now + i * 0.075
      gain.gain.setValueAtTime(0, t)
      gain.gain.linearRampToValueAtTime(0.4, t + 0.012)
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.3)
      osc.connect(gain)
      gain.connect(ctx.destination)
      osc.start(t)
      osc.stop(t + 0.32)
    })
  }
  ctx.state === 'suspended' ? ctx.resume().then(go).catch(() => {}) : go()
}

/**
 * Single entry point for the turn-submit sound, so the scored/scoreless split can never
 * drift between call sites. Callers pass the game store's own `lastTurnWasZero` verdict
 * rather than re-deriving "did they hit anything", which differs per game type (a number
 * for oh-one/ATC, a map of marks for cricket).
 */
export function playTurnResultSound(scoredNothing: boolean): void {
  scoredNothing ? playTurnEndBeep() : playTurnScoreChime()
}
