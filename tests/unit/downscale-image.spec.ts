import { describe, expect, it } from 'vitest'
import { AVATAR_MAX_PX, BACKGROUND_MAX_PX, fitWithin } from '@/lib/downscaleImage'

/**
 * The canvas work needs a real browser, but the sizing maths is where the bugs live —
 * upscaling a small image, or letting one dimension escape the cap on a very tall photo.
 */
describe('fitWithin', () => {
  it('caps the longest edge', () => {
    expect(fitWithin(1920, 1080, 512)).toEqual({ width: 512, height: 288 })
    expect(fitWithin(1080, 1920, 512)).toEqual({ width: 288, height: 512 })
  })

  it('never upscales a source smaller than the cap', () => {
    // blowing a 64px avatar up to 512 makes a bigger file showing the same detail
    expect(fitWithin(64, 64, 512)).toEqual({ width: 64, height: 64 })
  })

  it('keeps the aspect ratio', () => {
    const r = fitWithin(4000, 3000, 512)

    expect(r.width / r.height).toBeCloseTo(4 / 3, 2)
  })

  it('keeps a panorama inside the cap on its long edge', () => {
    const r = fitWithin(8000, 400, 512)

    expect(Math.max(r.width, r.height)).toBeLessThanOrEqual(512)
    expect(r.height).toBeGreaterThanOrEqual(1)   // never rounds a thin edge away to zero
  })

  it('survives degenerate input', () => {
    expect(fitWithin(0, 0, 512)).toEqual({ width: 0, height: 0 })
    expect(fitWithin(-5, 10, 512)).toEqual({ width: 0, height: 0 })
  })

  it('shrinks a phone photo by more than an order of magnitude in pixel count', () => {
    // this ratio is the whole point — it is what keeps the roster inside the storage quota
    const before = 4032 * 3024
    const { width, height } = fitWithin(4032, 3024, AVATAR_MAX_PX)

    expect(before / (width * height)).toBeGreaterThan(50)
  })

  it('gives backgrounds a larger cap than avatars', () => {
    expect(BACKGROUND_MAX_PX).toBeGreaterThan(AVATAR_MAX_PX)
  })
})
