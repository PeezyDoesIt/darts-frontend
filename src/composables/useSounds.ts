export function playBullseye(): Promise<void> {
  return new Promise(resolve => {
  const AudioCtx = window.AudioContext || (window as any).webkitAudioContext
  if (!AudioCtx) return
  const ctx = new AudioCtx()
  const now = ctx.currentTime
  const duration = 2.0

  // Master gain
  const master = ctx.createGain()
  master.gain.setValueAtTime(0, now)
  master.gain.linearRampToValueAtTime(0.28, now + 0.08)
  master.gain.setValueAtTime(0.28, now + 1.3)
  master.gain.linearRampToValueAtTime(0, now + duration)
  master.connect(ctx.destination)

  // Formant filter — gives it a vocal "oh/mm" quality
  const formant = ctx.createBiquadFilter()
  formant.type = 'bandpass'
  formant.frequency.setValueAtTime(900, now)
  formant.frequency.linearRampToValueAtTime(700, now + 0.5)
  formant.frequency.linearRampToValueAtTime(600, now + duration)
  formant.Q.value = 4
  formant.connect(master)

  // LFO for vibrato
  const lfo = ctx.createOscillator()
  const lfoGain = ctx.createGain()
  lfo.frequency.value = 5.5
  lfoGain.gain.setValueAtTime(0, now)
  lfoGain.gain.linearRampToValueAtTime(12, now + 0.4)
  lfo.connect(lfoGain)

  // Fundamental — the voice
  const osc1 = ctx.createOscillator()
  osc1.type = 'sine'
  osc1.frequency.setValueAtTime(280, now)
  osc1.frequency.linearRampToValueAtTime(420, now + 0.25)
  osc1.frequency.linearRampToValueAtTime(460, now + 0.65)
  osc1.frequency.linearRampToValueAtTime(380, now + 1.2)
  osc1.frequency.linearRampToValueAtTime(320, now + duration)
  lfoGain.connect(osc1.frequency)
  osc1.connect(formant)
  osc1.start(now)
  osc1.stop(now + duration)

  // 2nd harmonic for richness
  const osc2 = ctx.createOscillator()
  const osc2Gain = ctx.createGain()
  osc2.type = 'sine'
  osc2.frequency.setValueAtTime(560, now)
  osc2.frequency.linearRampToValueAtTime(840, now + 0.25)
  osc2.frequency.linearRampToValueAtTime(920, now + 0.65)
  osc2.frequency.linearRampToValueAtTime(760, now + 1.2)
  osc2.frequency.linearRampToValueAtTime(640, now + duration)
  osc2Gain.gain.value = 0.35
  lfoGain.connect(osc2.frequency)
  osc2.connect(osc2Gain)
  osc2Gain.connect(formant)
  osc2.start(now)
  osc2.stop(now + duration)

  // Breathiness — gentle noise layer
  const bufferSize = ctx.sampleRate * duration
  const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate)
  const data = noiseBuffer.getChannelData(0)
  for (let i = 0; i < bufferSize; i++) data[i] = (Math.random() * 2 - 1) * 0.04
  const noise = ctx.createBufferSource()
  noise.buffer = noiseBuffer
  const noiseFilter = ctx.createBiquadFilter()
  noiseFilter.type = 'bandpass'
  noiseFilter.frequency.value = 3000
  noiseFilter.Q.value = 0.8
  noise.connect(noiseFilter)
  noiseFilter.connect(master)
  noise.start(now)
  noise.stop(now + duration)

  lfo.start(now)
  lfo.stop(now + duration)
  osc1.onended = () => { ctx.close(); resolve() }
  })
}
