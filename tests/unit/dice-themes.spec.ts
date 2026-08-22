import { describe, expect, it } from 'vitest'
import {
  DICE_THEMES, DICE_FAMILIES, DIE_GRADIENTS, DIE_SOLID_FACES,
  GRADIENT_DIE_THEMES, RETIRED_DICE_THEMES, WHITE_PIP_DICE_THEMES,
  normalizeDiceTheme, type DiceTheme,
} from '../../src/types/index'

/**
 * The dice retirement.
 *
 * Thirty-four themes became ten. Twenty-five players' saved choices ride on the fallback map,
 * and a wrong entry there is invisible — the die still renders, it is just not the one that
 * person picked. So the map is asserted rather than trusted: every retired name resolves, no
 * name is both retired and surviving, and every target is a die that still exists.
 */

const SURVIVORS: DiceTheme[] = [
  'casino', 'onyx', 'midnight', 'gold', 'candy', 'fire', 'synthwave',
  'arctic', 'sapphire', 'oilslick',
]

/** Every name the app ever offered, so the sweep below cannot quietly lose one. */
const EVERY_OLD_NAME = [
  'default', 'casino', 'neon', 'metallic', 'wooden', 'vintage',
  'deepsea', 'oilslick', 'aurora', 'toxic',
  'magma', 'flamingo', 'candy', 'synthwave', 'nebula', 'storm', 'cyber', 'coffee',
  'crystal', 'fire',
  'rosegold', 'arctic', 'gold', 'midnight', 'lavender', 'slate',
  'silver', 'copper', 'sapphire', 'citrus', 'sunset', 'mint', 'peach', 'walnut',
]

describe('the ten that survived', () => {
  it('offers exactly ten', () => {
    expect(DICE_THEMES).toHaveLength(10)
    expect(DICE_THEMES.map(t => t.value).sort()).toEqual([...SURVIVORS].sort())
  })

  it('sorts them into three families', () => {
    expect(DICE_FAMILIES.map(f => f.key)).toEqual(['plain', 'warm', 'cool'])
    // Every die belongs to a family that exists, and every family has dice in it.
    const keys = new Set(DICE_FAMILIES.map(f => f.key))
    for (const t of DICE_THEMES) expect(keys.has(t.group)).toBe(true)
    for (const f of DICE_FAMILIES) {
      expect(DICE_THEMES.filter(t => t.group === f.key).length).toBeGreaterThan(0)
    }
  })

  it('gives every die something to render', () => {
    // A theme in neither map draws nothing at all, which is the one failure that looks broken
    // rather than merely wrong.
    for (const t of SURVIVORS) {
      const has = (t in DIE_GRADIENTS) || (t in DIE_SOLID_FACES)
      expect(has, `${t} has neither a gradient nor a solid face`).toBe(true)
    }
  })

  it('leaves Casino as the only flat stock', () => {
    expect(Object.keys(DIE_SOLID_FACES)).toEqual(['casino'])
    expect(GRADIENT_DIE_THEMES.has('casino')).toBe(false)
  })
})

describe('where the retired ones land', () => {
  it('resolves every name the app ever offered', () => {
    for (const name of EVERY_OLD_NAME) {
      expect(SURVIVORS).toContain(normalizeDiceTheme(name))
    }
  })

  it('never sends a name to a die that no longer exists', () => {
    for (const target of Object.values(RETIRED_DICE_THEMES)) {
      expect(SURVIVORS).toContain(target)
    }
  })

  it('does not retire a die it also offers', () => {
    for (const kept of SURVIVORS) {
      expect(RETIRED_DICE_THEMES[kept], `${kept} is both retired and offered`).toBeUndefined()
    }
  })

  it('lands each one on its nearest survivor, not all on Casino', () => {
    /*
     * The point of the map. A blanket reset would pass every test above while turning
     * twenty-five distinct choices into the same white die.
     */
    expect(normalizeDiceTheme('neon')).toBe('onyx')       // near-black stays black
    expect(normalizeDiceTheme('copper')).toBe('gold')     // warm metal stays warm
    expect(normalizeDiceTheme('wooden')).toBe('gold')
    expect(normalizeDiceTheme('magma')).toBe('fire')
    expect(normalizeDiceTheme('crystal')).toBe('arctic')  // cold stays cold
    expect(normalizeDiceTheme('toxic')).toBe('oilslick')

    // And only three land on Casino, all of them plain stock to begin with.
    const toCasino = Object.entries(RETIRED_DICE_THEMES)
      .filter(([, v]) => v === 'casino').map(([k]) => k).sort()
    expect(toCasino).toEqual(['default', 'silver', 'vintage'])
  })

  it('falls back to Casino only when there is nothing to infer from', () => {
    expect(normalizeDiceTheme(null)).toBe('casino')
    expect(normalizeDiceTheme(undefined)).toBe('casino')
    expect(normalizeDiceTheme('')).toBe('casino')
    expect(normalizeDiceTheme('a-theme-that-never-existed')).toBe('casino')
  })

  it('leaves a live name alone', () => {
    for (const t of SURVIVORS) expect(normalizeDiceTheme(t)).toBe(t)
  })
})

describe('Onyx', () => {
  it('is the one die with white beads', () => {
    // The exception exists because a dark bead vanishes on near-black stock, and the pips are
    // the only part of a die that carries information.
    expect([...WHITE_PIP_DICE_THEMES]).toEqual(['onyx'])
    for (const t of SURVIVORS) {
      if (t !== 'onyx') expect(WHITE_PIP_DICE_THEMES.has(t)).toBe(false)
    }
  })

  it('is lifted black rather than flat black', () => {
    // A flat black die reads as a hole in the table.
    expect(DIE_GRADIENTS.onyx).toContain('#2a2a33')
    expect(DIE_GRADIENTS.onyx).toContain('#0a0a0d')
  })
})
