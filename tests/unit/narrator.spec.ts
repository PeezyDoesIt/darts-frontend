import { describe, expect, it } from 'vitest'
import { ALL_EVENTS, GAME_EVENTS, isCommentary, linesFor } from '@/lib/narrator'

/**
 * What the narrator says, now that there is one set of words rather than eleven.
 *
 * The personality system was removed. A style changed which words were picked and nothing
 * about how they sounded — the narrator never passed a rate or a pitch to the speech engine,
 * so eleven "voices" were eleven scripts read identically. What is left is one set of lines
 * and a real choice of speech voice, which is the part that actually changes what you hear.
 *
 * ALL_EVENTS comes from the source rather than being restated here, so a newly added event is
 * swept by every assertion below without anyone remembering to list it.
 */

const ctx = { name: 'Alice', prevName: 'Bob' }
const loud = { cleanMode: false, mode: 'full' as const }
const clean = { cleanMode: true, mode: 'full' as const }
const quiet = { cleanMode: false, mode: 'names' as const }
const silent = { cleanMode: false, mode: 'off' as const }

const flat = (out: string[][]) => out.flat().join(' ')

describe('every event has something to say', () => {
  it('in full commentary', () => {
    for (const event of ALL_EVENTS) {
      expect(linesFor(event, loud, ctx), event).not.toEqual([])
    }
  })

  it('in clean mode, which is the default', () => {
    // Clean mode ships on, so a gap here is what a new user hears: nothing at all.
    for (const event of ALL_EVENTS) {
      expect(linesFor(event, clean, ctx), event).not.toEqual([])
    }
  })

  it('names the player it is addressing', () => {
    for (const event of ALL_EVENTS) {
      // The roast is about the throw, and the game clock is about the match, not a person.
      if (event === 'zeroRoast' || GAME_EVENTS.includes(event)) continue
      const expected = event === 'timeout' ? 'Bob' : 'Alice'
      expect(flat(linesFor(event, loud, { ...ctx, count: 0 })), event).toContain(expected)
    }
  })

  it('offers more than one wording, so a game does not repeat itself', () => {
    // The walk-up alone fires eighty times across a four-player game.
    for (const event of ALL_EVENTS) {
      const segments = linesFor(event, loud, { ...ctx, count: 0 })
      const alternatives = Math.max(...segments.map(s => s.length))
      expect(alternatives, `${event} has one fixed line`).toBeGreaterThan(1)
    }
  })

  it('never offers the same wording twice within a segment', () => {
    for (const opts of [loud, clean]) {
      for (const event of ALL_EVENTS) {
        for (const segment of linesFor(event, opts, { ...ctx, count: 0 })) {
          expect(new Set(segment).size, `${event} repeats an alternative`).toBe(segment.length)
        }
      }
    }
  })
})

describe('clean mode', () => {
  it('keeps profanity out of every line', () => {
    for (const event of ALL_EVENTS) {
      expect(flat(linesFor(event, clean, { ...ctx, count: 0 })), event).not.toMatch(/fuck|shit|ass\b/i)
    }
  })

  it('still has profanity to remove', () => {
    // Guards the test above from passing because the unfiltered lines went mild.
    const dirty = ALL_EVENTS.map(e => flat(linesFor(e, loud, { ...ctx, count: 0 }))).join(' ')
    expect(dirty).toMatch(/fuck|shit/i)
  })

  it('never reduces a line to just the bare name', () => {
    const said = flat(linesFor('walkUp', clean, ctx))
    expect(said.trim()).not.toBe('Alice')
    expect(said.length).toBeGreaterThan('Alice'.length + 3)
  })
})

/**
 * The three modes. "Names only" used to mean "skip the events flagged as commentary" and
 * nothing more, so the events that were not commentary spoke their whole line — the walk-up
 * among them, on every single turn. And there was no way to turn the narrator off at all.
 */
describe('narrator modes', () => {
  it('says nothing whatsoever when off', () => {
    for (const event of ALL_EVENTS) {
      expect(linesFor(event, silent, { ...ctx, count: 0 }), event).toEqual([])
    }
  })

  it('silences the trash talk under Names only', () => {
    for (const event of ALL_EVENTS) {
      if (!isCommentary(event)) continue
      expect(linesFor(event, quiet, { ...ctx, count: 0 }), event).toEqual([])
    }
  })

  it('keeps the functional announcements short under Names only', () => {
    for (const event of ALL_EVENTS) {
      if (isCommentary(event)) continue
      const said = flat(linesFor(event, quiet, { ...ctx, count: 0 }))
      expect(said, `${event} is silent`).not.toBe('')
      // The bound is what separates "a name" from "a performance".
      expect(said.length, `${event} is not short: ${said}`).toBeLessThan(40)
    }
  })

  it('still warns that time is running out', () => {
    // The one announcement that says a turn is about to be lost. It was classed as
    // commentary, so choosing Names only silenced exactly the thing worth keeping.
    const said = flat(linesFor('hurryUp', quiet, ctx))
    expect(said).toContain('Hurry up')
    expect(said).toContain('Alice')
  })
})

describe('escalation', () => {
  it('adds a line when somebody times out again', () => {
    const first = linesFor('timeout', loud, { ...ctx, count: 0 })
    const again = linesFor('timeout', loud, { ...ctx, count: 3 })
    expect(again.length).toBeGreaterThan(first.length)
  })

  it('changes the wording when somebody is hurried again', () => {
    const first = flat(linesFor('hurryUp', loud, { ...ctx, count: 0 }))
    const again = flat(linesFor('hurryUp', loud, { ...ctx, count: 1 }))
    expect(again).not.toBe(first)
  })
})

/**
 * The hot seat — the narrator picking on one player on purpose. Appended to the line rather
 * than replacing it, so the target still gets told whose turn it is and then gets the jab.
 */
describe('the hot seat', () => {
  const heckled = { ...ctx, heckled: true }

  it('adds a line to the events about hurrying somebody along', () => {
    for (const event of ['walkUp', 'hurryUp', 'throwNudge'] as const) {
      const normal = linesFor(event, loud, ctx)
      const targeted = linesFor(event, loud, heckled)
      expect(targeted.length, `${event} says no more than usual`).toBeGreaterThan(normal.length)
      expect(flat(targeted), `${event} heckle omits the name`).toContain('Alice')
    }
  })

  it('leaves what would have been said intact', () => {
    const normal = flat(linesFor('walkUp', loud, ctx))
    const targeted = flat(linesFor('walkUp', loud, heckled))
    expect(targeted.length).toBeGreaterThan(normal.length)
  })

  it('does not heckle on events that are not about hurrying somebody', () => {
    for (const event of ['win', 'gameOver', 'zeroRoast', 'timeout'] as const) {
      expect(linesFor(event, loud, { ...heckled, count: 0 }), event)
        .toEqual(linesFor(event, loud, { ...ctx, count: 0 }))
    }
  })

  it('stays quiet when the narrator is quiet', () => {
    // Somebody who asked for less narrator does not get more of it because a bit is on.
    for (const event of ['walkUp', 'hurryUp'] as const) {
      expect(linesFor(event, quiet, heckled), event).toEqual(linesFor(event, quiet, ctx))
      expect(linesFor(event, silent, heckled), event).toEqual([])
    }
  })
})
