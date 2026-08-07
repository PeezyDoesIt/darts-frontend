import { beforeEach, describe, expect, it, vi } from 'vitest'

/**
 * The turn-submit sound used to be a single downbeat thud fired on every cricket submit,
 * regardless of what the player hit — so a 3-triple turn and a complete whiff sounded
 * identical, and both sounded like a failure. These tests pin the scored/scoreless split.
 *
 * jsdom has no Web Audio, so this stubs AudioContext and asserts on the oscillator
 * frequencies actually scheduled. That is the only observable difference between the two
 * sounds, so asserting anything less would pass even if both branches played the thud.
 */
const scheduled: number[] = []

class FakeGain {
  gain = {
    setValueAtTime: vi.fn(),
    linearRampToValueAtTime: vi.fn(),
    exponentialRampToValueAtTime: vi.fn(),
  }
  connect = vi.fn()
}

class FakeOsc {
  type = ''
  frequency = { value: 0, setValueAtTime: vi.fn(), linearRampToValueAtTime: vi.fn() }
  connect = vi.fn()
  stop = vi.fn()
  start = vi.fn(() => { scheduled.push(this.frequency.value) })
}

class FakeAudioContext {
  state = 'running'
  currentTime = 0
  destination = {}
  createOscillator() { return new FakeOsc() }
  createGain() { return new FakeGain() }
  resume() { return Promise.resolve() }
  close() { return Promise.resolve() }
}

;(window as unknown as { AudioContext: unknown }).AudioContext = FakeAudioContext

const { playTurnResultSound, playTurnEndBeep, playTurnScoreChime } =
  await import('@/composables/useSounds')

const SCORELESS = [196.0, 146.83]              // G3 → D3, falling
const SCORED = [523.25, 659.25, 783.99]        // C5 → E5 → G5, rising

describe('turn-submit sound', () => {
  beforeEach(() => { scheduled.length = 0 })

  it('plays the falling thud when the turn scored nothing', () => {
    playTurnResultSound(true)
    expect(scheduled).toEqual(SCORELESS)
  })

  it('plays the rising chime when the turn scored something', () => {
    playTurnResultSound(false)
    expect(scheduled).toEqual(SCORED)
  })

  it('plays a different sound for each branch', () => {
    // guards against a future refactor pointing both branches at the same function
    playTurnResultSound(true)
    const miss = [...scheduled]
    scheduled.length = 0
    playTurnResultSound(false)

    expect(scheduled).not.toEqual(miss)
  })

  it('rises for a scoring turn and falls for a scoreless one', () => {
    // the emotional direction is the whole point — a scoring turn must not sound downbeat
    playTurnScoreChime()
    expect(scheduled[scheduled.length - 1]!).toBeGreaterThan(scheduled[0]!)

    scheduled.length = 0
    playTurnEndBeep()
    expect(scheduled[scheduled.length - 1]!).toBeLessThan(scheduled[0]!)
  })
})
