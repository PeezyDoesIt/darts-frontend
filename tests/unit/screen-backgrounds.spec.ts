import { describe, expect, it } from 'vitest'

/**
 * The fallback chain for the two screens a player's background appears on.
 *
 * Mirrored here rather than imported because both live inside component computeds — the
 * rule is the thing worth pinning, and it is the part that will rot: someone adds a third
 * screen, copies one of the chains, and gets the order subtly wrong. GamePage falls through
 * to the game's own theme; BetweenTurnsPage deliberately does not.
 */

type P = { throwBackground: string | null; walkupBackground: string | null; playerBackground: string | null }

const throwBg = (p: P, gameTheme: string | null) =>
  p.throwBackground ?? p.playerBackground ?? gameTheme ?? null

const walkupBg = (p: P) =>
  p.walkupBackground ?? p.playerBackground ?? null

const player = (over: Partial<P> = {}): P =>
  ({ throwBackground: null, walkupBackground: null, playerBackground: null, ...over })

describe('throw screen background', () => {
  it('prefers the throw-screen pick', () => {
    expect(throwBg(player({ throwBackground: 'throw.png', playerBackground: 'default.png' }), 'theme')).toBe('throw.png')
  })

  it('falls back to the default background', () => {
    expect(throwBg(player({ playerBackground: 'default.png' }), 'theme')).toBe('default.png')
  })

  it('falls back to the game theme when the player has nothing', () => {
    expect(throwBg(player(), 'theme')).toBe('theme')
  })

  it('is null when nothing is set anywhere', () => {
    expect(throwBg(player(), null)).toBeNull()
  })
})

describe('walk-up screen background', () => {
  it('prefers the walk-up pick', () => {
    expect(walkupBg(player({ walkupBackground: 'walkup.png', playerBackground: 'default.png' }))).toBe('walkup.png')
  })

  it('falls back to the default background', () => {
    expect(walkupBg(player({ playerBackground: 'default.png' }))).toBe('default.png')
  })

  it('ignores the throw-screen pick entirely', () => {
    // Setting one screen must not quietly change the other — that is the whole feature.
    expect(walkupBg(player({ throwBackground: 'throw.png' }))).toBeNull()
  })
})

describe('the two screens stay independent', () => {
  it('lets each screen differ', () => {
    const p = player({ throwBackground: 'throw.png', walkupBackground: 'walkup.png', playerBackground: 'default.png' })
    expect(throwBg(p, 'theme')).toBe('throw.png')
    expect(walkupBg(p)).toBe('walkup.png')
  })

  it('behaves exactly as before when only the default is set', () => {
    // The upgrade path: every existing player has just playerBackground, and nothing about
    // their game should look different until they choose otherwise.
    const p = player({ playerBackground: 'default.png' })
    expect(throwBg(p, 'theme')).toBe('default.png')
    expect(walkupBg(p)).toBe('default.png')
  })

  it('lets one screen be set without disturbing the other', () => {
    const p = player({ throwBackground: 'throw.png', playerBackground: 'default.png' })
    expect(throwBg(p, 'theme')).toBe('throw.png')
    expect(walkupBg(p)).toBe('default.png')
  })
})
