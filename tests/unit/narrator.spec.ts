import { describe, expect, it } from 'vitest'
import {
  ALL_EVENTS, GAME_EVENTS, PERSONALITIES, isCommentary, linesFor, missingCleanVariants,
} from '@/lib/narrator'

const ctx = { name: 'Alice', prevName: 'Bob', term: 'baby' }
const loud = { cleanMode: false, quietNarrator: false }
const clean = { cleanMode: true, quietNarrator: false }
const quiet = { cleanMode: false, quietNarrator: true }

const flat = (out: string[][]) => out.flat().join(' ')

// ALL_EVENTS comes from the source rather than being restated here, so a newly added event
// is swept by every assertion below without anyone remembering to list it.

/**
 * "Names only" advertises "Only announces whose turn it is — no commentary" and delivered
 * none of that outside the walk-up screen: GamePage never consulted the setting, so nudges,
 * warnings and roasts all played straight through it.
 */
describe('Names only', () => {
  it('silences every commentary event', () => {
    for (const event of ALL_EVENTS) {
      if (!isCommentary(event)) continue
      for (const p of PERSONALITIES) {
        expect(linesFor(event, p, quiet, ctx), `${event}/${p}`).toEqual([])
      }
    }
  })

  it('still says whose turn it is', () => {
    for (const p of PERSONALITIES) {
      expect(linesFor('walkUp', p, quiet, ctx).length).toBeGreaterThan(0)
      expect(flat(linesFor('walkUp', p, quiet, ctx))).toContain('Alice')
    }
  })

  it('still announces a bonus throw and a win, which are not commentary', () => {
    expect(linesFor('bonusTurn', 'hype', quiet, ctx)).not.toEqual([])
    expect(linesFor('win', 'hype', quiet, ctx)).not.toEqual([])
  })

  it('silences the zero roast, which is commentary however the mode is read', () => {
    // this previously fired even in quiet mode
    expect(linesFor('zeroRoast', 'savage', quiet, ctx)).toEqual([])
  })
})

/**
 * Clean mode is ON by default, and savage had no clean variant, so it fell through to the
 * bare player name — a new user choosing savage effectively got no narrator at all.
 */
describe('Clean mode', () => {
  it('never reduces a personality to just the bare name', () => {
    for (const p of PERSONALITIES) {
      const said = flat(linesFor('walkUp', p, clean, ctx))

      expect(said.trim()).not.toBe('Alice')
      expect(said.length).toBeGreaterThan('Alice'.length + 3)
    }
  })

  it('gives savage a real clean line rather than silence', () => {
    const said = linesFor('walkUp', 'savage', clean, ctx)

    expect(said).not.toEqual([])
    expect(flat(said)).toContain('Alice')
  })

  it('produces something for every personality and every event', () => {
    for (const event of ALL_EVENTS) {
      for (const p of PERSONALITIES) {
        expect(linesFor(event, p, clean, ctx), `${event}/${p}`).not.toEqual([])
      }
    }
  })

  it('keeps profanity out of the default voice', () => {
    // the default voice is the crude one, and clean mode is what holds it back
    const dirty = flat(linesFor('zeroRoast', 'default', loud, ctx))
    const scrubbed = flat(linesFor('zeroRoast', 'default', clean, ctx))

    expect(dirty).toMatch(/fuck|shit/i)
    expect(scrubbed).not.toMatch(/fuck|shit/i)
  })

  it('keeps profanity out of every clean line', () => {
    for (const event of ALL_EVENTS) {
      for (const p of PERSONALITIES) {
        expect(flat(linesFor(event, p, clean, ctx)), `${event}/${p}`).not.toMatch(/fuck|shit|ass\b/i)
      }
    }
  })
})

describe('personality', () => {
  it('gives each personality a distinct walk-up line', () => {
    const said = PERSONALITIES.map(p => flat(linesFor('walkUp', p, loud, ctx)))

    expect(new Set(said).size).toBe(PERSONALITIES.length)
  })

  it('names the player in every line of every event', () => {
    for (const event of ALL_EVENTS) {
      for (const p of PERSONALITIES) {
        const said = flat(linesFor(event, p, loud, { ...ctx, count: 0 }))
        // timeout talks about the player who just left, not the one arriving
        const expected = event === 'timeout' ? 'Bob' : 'Alice'
        if (event === 'zeroRoast') continue   // the roast is about the throw, not the name
        if (GAME_EVENTS.includes(event)) continue  // the game clock is about the match
        expect(said, `${event}/${p}`).toContain(expected)
      }
    }
  })

  it('escalates a repeated timeout with an extra line', () => {
    for (const p of PERSONALITIES) {
      const first = linesFor('timeout', p, loud, { ...ctx, count: 0 })
      const again = linesFor('timeout', p, loud, { ...ctx, count: 3 })

      expect(again.length, p).toBeGreaterThan(first.length)
    }
  })

  it('escalates a repeated hurry-up to different wording', () => {
    const first = flat(linesFor('hurryUp', 'savage', loud, { ...ctx, count: 0 }))
    const again = flat(linesFor('hurryUp', 'savage', loud, { ...ctx, count: 1 }))

    expect(again).not.toBe(first)
  })

  it('falls back to the default voice for an unwritten personality', () => {
    // throwNudge has no per-personality lines; every voice should still say something
    for (const p of PERSONALITIES) {
      expect(linesFor('throwNudge', p, loud, ctx)).not.toEqual([])
    }
  })
})

describe('missingCleanVariants', () => {
  it('reports savage as having no clean walk-up of its own', () => {
    const gaps = missingCleanVariants()

    expect(gaps).toContainEqual({ event: 'walkUp', personality: 'savage' })
  })

  it('does not report personalities that do have one', () => {
    const gaps = missingCleanVariants()

    expect(gaps).not.toContainEqual({ event: 'walkUp', personality: 'hype' })
  })

  it('is a worklist, not an error — every gap still speaks a neutral line', () => {
    for (const { event, personality } of missingCleanVariants()) {
      expect(linesFor(event, personality, clean, ctx), `${event}/${personality}`).not.toEqual([])
    }
  })
})

/**
 * The game clock was the last corner the settings did not reach. GamePage spoke these three
 * announcements with a bare speak(), so "Names only" never silenced them and the chosen
 * personality never applied to them.
 */
describe('the game clock', () => {
  const gameCtx = { ...ctx, count: 10 }

  it('silences the time warning under Names only, like every other nudge', () => {
    for (const p of PERSONALITIES) {
      expect(linesFor('gameTimeWarning', p, quiet, gameCtx), p).toEqual([])
    }
  })

  it('still announces the game ending, which is a state change rather than commentary', () => {
    for (const p of PERSONALITIES) {
      expect(linesFor('gameOver', p, quiet, gameCtx).length, p).toBeGreaterThan(0)
    }
  })

  it('speaks the minutes remaining it was handed', () => {
    for (const p of PERSONALITIES) {
      expect(flat(linesFor('gameTimeWarning', p, loud, { ...ctx, count: 5 })), p).toContain('5')
      expect(flat(linesFor('gameTimeWarning', p, loud, { ...ctx, count: 10 })), p).toContain('10')
    }
  })

  it('gives the time warning a distinct voice per personality', () => {
    const said = PERSONALITIES.map(p => flat(linesFor('gameTimeWarning', p, loud, gameCtx)))
    expect(new Set(said).size).toBeGreaterThan(1)
  })

  it('names no player, because the clock belongs to the match', () => {
    for (const event of GAME_EVENTS) {
      for (const p of PERSONALITIES) {
        expect(flat(linesFor(event, p, loud, gameCtx)), `${event}/${p}`).not.toContain('Alice')
      }
    }
  })
})
