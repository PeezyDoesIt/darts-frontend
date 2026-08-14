import { describe, expect, it } from 'vitest'
import {
  ALL_EVENTS, GAME_EVENTS, PERSONALITIES, isCommentary, linesFor, missingCleanVariants,
} from '@/lib/narrator'

const ctx = { name: 'Alice', prevName: 'Bob', term: 'baby' }
const loud = { cleanMode: false, mode: 'full' as const }
const clean = { cleanMode: true, mode: 'full' as const }
const quiet = { cleanMode: false, mode: 'names' as const }
const silent = { cleanMode: false, mode: 'off' as const }

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
  it('reports nothing — every personality now has a clean voice for every event', () => {
    // It used to report 53 of 66 pairs, savage 0 of 11. Clean mode ships on, so choosing
    // savage got you the neutral fallback and nothing savage at all.
    expect(missingCleanVariants()).toEqual([])
  })

  it('is a worklist, not an error — any future gap still speaks a neutral line', () => {
    for (const { event, personality } of missingCleanVariants()) {
      expect(linesFor(event, personality, clean, ctx), `${event}/${personality}`).not.toEqual([])
    }
  })
})

/**
 * The point of choosing a personality is hearing it. Coverage alone does not deliver that —
 * six entries that happen to say the same sentence read exactly like having no choice at
 * all, which is what clean mode did for seven of the eleven events.
 */
describe('every personality actually sounds different', () => {
  for (const mode of [{ name: 'clean', opts: clean }, { name: 'unfiltered', opts: loud }]) {
    it(`in ${mode.name} mode, on every event`, () => {
      for (const event of ALL_EVENTS) {
        const said = PERSONALITIES.map(p => flat(linesFor(event, p, mode.opts, { ...ctx, count: 0 })))

        expect(new Set(said).size, `${event} — ${said.length - new Set(said).size} personalities share wording`)
          .toBe(PERSONALITIES.length)
      }
    })
  }
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

/**
 * Variety, not coverage.
 *
 * Every event/personality pair had a clean variant written, so coverage looked complete —
 * but eight of the eleven events offered exactly one line each, and `walkUp` fires on every
 * single turn. Four players over twenty rounds heard the identical sentence eighty times.
 *
 * The threshold is deliberately low. This is not a demand for wit, it is a floor that fails
 * if someone collapses a rotation back to a single line, which is invisible in review and
 * only shows up after an hour of play.
 */
describe('line variety', () => {
  const MIN_VARIANTS = 2

  for (const mode of [loud, clean]) {
    const label = mode.cleanMode ? 'clean' : 'unfiltered'

    for (const event of ALL_EVENTS) {
      for (const personality of PERSONALITIES) {
        it(`${label}: ${event}/${personality} has something to rotate through`, () => {
          const segments = linesFor(event, personality, mode, ctx) as string[][]
          expect(segments.length).toBeGreaterThan(0)
          // Every segment is spoken, so a one-line segment is a line heard every time.
          for (const segment of segments) {
            expect(segment.length).toBeGreaterThanOrEqual(MIN_VARIANTS)
          }
        })
      }
    }
  }

  it('never offers the same line twice within a segment', () => {
    for (const mode of [loud, clean]) {
      for (const event of ALL_EVENTS) {
        for (const personality of PERSONALITIES) {
          const segments = linesFor(event, personality, mode, ctx) as string[][]
          for (const segment of segments) {
            expect(new Set(segment).size, `${event}/${personality} repeats a variant`).toBe(segment.length)
          }
        }
      }
    }
  })
})

/**
 * The three narrator modes.
 *
 * "Names only" used to mean "skip the events flagged as commentary" and nothing more, so the
 * events that were *not* commentary still spoke their full personality line. The walk-up is
 * one of those and fires on every single turn, so the setting called Names only delivered
 * "Okay. Okay okay okay. Alice. You got this. Do you got this? You got this." eighty times a
 * game. And there was no way to turn the narrator off at all.
 */
describe('narrator modes', () => {
  it('says nothing whatsoever when off', () => {
    for (const event of ALL_EVENTS) {
      for (const personality of PERSONALITIES) {
        expect(linesFor(event, personality, silent, ctx), `${event}/${personality} spoke while off`)
          .toEqual([])
      }
    }
  })

  it('keeps the walk-up short under Names only, whatever the personality', () => {
    for (const personality of PERSONALITIES) {
      const said = flat(linesFor('walkUp', personality, quiet, ctx) as string[][])
      expect(said, `${personality} walk-up is silent`).toContain('Alice')
      // The longest full-personality walk-up runs past 70 characters; every quiet form is a
      // handful of words. The bound is what separates "a name" from "a performance".
      expect(said.length, `${personality} walk-up is not short: ${said}`).toBeLessThan(40)
    }
  })

  it('still warns that time is running out under Names only', () => {
    // The whole point of the 30-second warning is that a turn is about to be lost, which is
    // information rather than banter — it was classed as commentary and therefore silenced.
    for (const personality of PERSONALITIES) {
      const said = flat(linesFor('hurryUp', personality, quiet, ctx) as string[][])
      expect(said, `${personality} gives no hurry-up`).toContain('Hurry up')
      expect(said, `${personality} hurry-up does not name the player`).toContain('Alice')
    }
  })

  it('still says who won under Names only', () => {
    const said = flat(linesFor('win', 'farley', quiet, ctx) as string[][])
    expect(said).toContain('Alice')
    expect(said.length).toBeLessThan(40)
  })

  it('keeps silencing the trash talk under Names only', () => {
    for (const event of ALL_EVENTS) {
      if (!isCommentary(event)) continue
      for (const personality of PERSONALITIES) {
        expect(linesFor(event, personality, quiet, ctx), `${event}/${personality} leaked`).toEqual([])
      }
    }
  })
})
