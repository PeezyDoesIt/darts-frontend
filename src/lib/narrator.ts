/**
 * Every line the narrator says.
 *
 * These used to be written inline at each call site, so "hype" existed in four files with
 * no single definition of what hype sounds like. That is why clean mode had a hole for
 * savage that nobody noticed: there was nowhere to look and see the gap. Here the gaps are
 * enumerable — see missingCleanVariants().
 *
 * A returned value is a list of UTTERANCES, and each utterance is a list of interchangeable
 * ALTERNATIVES. The caller speaks one alternative per utterance, in order. An empty list
 * means say nothing at all, which is how "Names only" silences commentary.
 */
import type { NarratorMode } from '../types/index'

export type NarratorEvent =
  | 'walkUp'
  | 'bonusTurn'
  | 'zeroRoast'
  | 'timeout'
  | 'hurryUp'
  | 'twentySecondWalkUp'
  | 'twentySecondThrow'
  | 'throwNudge'
  | 'win'
  | 'gameTimeWarning'
  | 'gameOver'

/**
 * Events about the match rather than any one player, so nothing should expect a name in the
 * line. Everything else addresses whoever is up.
 */
export const GAME_EVENTS: NarratorEvent[] = ['gameTimeWarning', 'gameOver']

export interface LineContext {
  /** The player being addressed. */
  name: string
  /** The player who just finished, where the line is about them (timeouts). */
  prevName?: string
  /** How many times this has already happened to this player. */
  count?: number
  /** This player is the hot seat: the narrator is deliberately on their back. */
  heckled?: boolean
}

type Lines = (ctx: Required<Pick<LineContext, 'name'>> & LineContext) => string[][]

interface EventDef {
  /**
   * Commentary is everything except the functional announcements: whose turn it is, that
   * time is nearly up, and who won. "Names only" silences all of it.
   */
  commentary: boolean
  /**
   * What a non-commentary event says under "Names only".
   *
   * Without this, "Names only" only skipped the events marked as commentary and let the rest
   * speak their full line — so the most repeated line in the app, the walk-up, still
   * delivered a whole sentence on every single turn. It was called Names only and said
   * everything.
   */
  quiet?: Lines
  /** What this event says. */
  fallback: Lines
  /**
   * What this event says with clean mode on, which is the default. Never just the bare
   * name — a line that degrades to "Alice" is indistinguishable from a bug.
   */
  cleanFallback?: Lines
}

const EVENTS: Record<NarratorEvent, EventDef> = {
  // ── Whose turn it is. The one thing "Names only" keeps. ──────────────────────
  walkUp: {
    commentary: false,
    // Names only: the name, and nothing else. Eighty times a game, this is the whole point
    // of the setting.
    quiet: c => [[`${c.name}.`, `${c.name}, you're up.`]],
    // This is the most repeated line in the app — it fires on every single turn, so four
    // players over twenty rounds hear it eighty times. One variant each meant hearing the
    // identical sentence all eighty. These rotate.
    fallback: c => [[
      `${c.name} — it's your turn.`,
      `${c.name}, you're up.`,
      `Up next — ${c.name}.`,
    ]],
    // Previously this fell through to the bare name, so clean + savage said only "Alice".
    // Clean mode is on by default, so that was most new users' first experience.
    cleanFallback: c => [[`${c.name}, you're up.`]],
  },

  bonusTurn: {
    commentary: false,
    quiet: c => [[`${c.name}, bonus throw.`]],
    fallback: c => [[`${c.name} — bonus throw!`, `Bonus throw for ${c.name}.`]],
    // The unfiltered lines here carry no profanity, so clean mode keeps the same voices
    // rather than flattening all six into one neutral sentence.
    cleanFallback: c => [[`${c.name} — bonus throw.`, `Bonus throw for ${c.name}.`]],
  },

  // ── Commentary. All of this is silenced by "Names only". ─────────────────────
  zeroRoast: {
    commentary: true,
    fallback: () => [[`What the fuck was that?`, `Holy shit! Please, sit down. Who's next?`, `Who invited Helen Keller to play?`, `Damn!... That was trash.`, `Were you even facing the board?`]],
    cleanFallback: () => [[`No score that turn.`, `Zero. Next.`]],
  },

  timeout: {
    commentary: true,
    fallback: c => [
      [`${c.prevName} missed their turn.`, `Where the hell is ${c.prevName}?`, `${c.prevName} just wasted everyone's time.`],
      [`Be better.`, `Get your ass up here.`, `This ain't it.`],
      ...(escalated(c) ? [[`This is why nobody wants to play darts with you.`, `Three times. Sort it out.`, `Every single round with you.`]] : []),
    ],
    cleanFallback: c => [[`${c.prevName} missed their turn.`]],
  },

  hurryUp: {
    /*
     * Functional, not banter: the only warning that a turn is about to be lost, so it
     * survives Names only. Off still silences it — off means off.
     */
    commentary: false,
    quiet: c => [[`Hurry up, ${c.name}.`]],
    fallback: c => [repeat(c)
      ? [`${c.name}. Hurry the fuck up. This is why nobody wants to play darts with you.`, `${c.name}. I will not say it again. GET. UP. HERE.`, `${c.name}. Move your ass. NOW.`]
      : [`${c.name}. Hurry the fuck up. It's your turn.`, `${c.name}. Get up here. Right now.`, `${c.name}. Clock's running. Move it.`]],
    cleanFallback: c => [[`${c.name}, hurry up.`, `${c.name}, the clock is running.`]],
  },

  twentySecondWalkUp: {
    commentary: true,
    fallback: c => [[
      `${c.name}, walk up now.`,
      `${c.name}, twenty seconds.`,
    ]],
    cleanFallback: c => [[`${c.name}, twenty seconds.`, `${c.name}, walk up now.`]],
  },

  twentySecondThrow: {
    commentary: true,
    fallback: c => [[
      `${c.name}, you need to shoot.`,
      `${c.name}, twenty seconds to throw.`,
    ]],
    cleanFallback: c => [[`${c.name}, twenty seconds.`, `${c.name}, you need to throw.`]],
  },

  throwNudge: {
    commentary: true,
    fallback: c => [[
      `${c.name}, it's your turn`,
      `${c.name}, still your turn`,
    ]],
    cleanFallback: c => [[`${c.name}, it's your turn`, `${c.name}, still your turn`]],
  },

  win: {
    commentary: false,
    quiet: c => [[`${c.name} wins.`]],
    fallback: c => [[
      `${c.name} wins! Well played.`,
      `${c.name} takes it. Well played.`,
      `That's the game — ${c.name} wins.`,
    ]],
    cleanFallback: c => [[
      `${c.name} wins! Well played.`,
      `That's the game — ${c.name} wins.`,
    ]],
  },

  // ── The game clock. About the match, not any one player. ─────────────────────
  //
  // These were spoken with a bare speak() straight from GamePage, so they were the last
  // corner the narrator settings did not reach: "Names only" never silenced them.
  // `count` is the minutes remaining.
  gameTimeWarning: {
    commentary: true,
    fallback: c => [[
      `${c.count} minutes remaining in the game!`,
      `${c.count} minutes left.`,
    ]],
    cleanFallback: c => [[`${c.count} minutes remaining.`, `${c.count} minutes left.`]],
  },

  // Not commentary: the match ending is a state change, the same call as a win.
  gameOver: {
    commentary: false,
    quiet: () => [[`Game over.`]],
    fallback: () => [[`Time is up! Game over!`, `That's time — game over.`]],
    cleanFallback: () => [[`Time's up. Game over.`, `That's time — game over.`]],
  },
}

/**
 * Every event, derived from the definitions rather than restated. Tests sweep this, so a new
 * event is covered by every existing assertion the moment it is added — a hand-kept list
 * silently leaves new events untested, which is how the game clock stayed unexamined.
 */
export const ALL_EVENTS = Object.keys(EVENTS) as NarratorEvent[]

/** A hurry-up escalates the second time it happens to the same player. */
function repeat(c: LineContext): boolean {
  return (c.count ?? 0) > 0
}

/** A timeout only earns the extra roast at the third offence, matching the original. */
function escalated(c: LineContext): boolean {
  return (c.count ?? 0) >= 3
}

/**
 * The lines to speak, as utterances of interchangeable alternatives.
 *
 * Returns an empty list when nothing should be said — commentary under "Names only". The
 * caller does not need to know which events count as commentary, which is exactly the
 * knowledge that went missing when this lived at the call sites: GamePage never checked
 * quietNarrator at all, so every nudge, roast and warning played straight through it.
 */
/**
 * The extra line the hot-seat player gets, on the events that are about hurrying them along.
 *
 * Appended rather than replacing the line, so the target still gets told whose turn it is and
 * then gets the jab. Only the pressure events — the walk-up they are arriving at, and the two
 * nudges — because heckling somebody for winning is a different joke and this one is about
 * rushing them.
 */
const HECKLE_EVENTS: NarratorEvent[] = ['walkUp', 'hurryUp', 'throwNudge']

const HECKLE = (c: { name: string }) => [
  `And ${c.name} — I'm watching you.`,
  `Eyes on ${c.name}.`,
]

export function linesFor(
  event: NarratorEvent,
  opts: { cleanMode: boolean; mode: NarratorMode },
  ctx: LineContext,
): string[][] {
  const def = EVENTS[event]
  if (!def) return []

  // Off means off. There is no event important enough to speak over it.
  if (opts.mode === 'off') return []

  /*
   * The heckle rides on top of whatever the mode would have said anyway.
   *
   * Not under Names only or Off: those are somebody asking for less narrator, and a bit that
   * makes it louder has no business overriding that. Picking a target while quiet does
   * nothing until commentary goes back on, which is the honest behaviour — and the control
   * says so.
   */
  const heckle = ctx.heckled && opts.mode === 'full' && HECKLE_EVENTS.includes(event)
    ? [HECKLE({ name: ctx.name })]
    : []

  if (opts.mode === 'names') {
    if (def.commentary) return []
    // Falls through to the full line only for an event with no quiet form written, which is
    // better than silence for something functional like who just won.
    if (def.quiet) return def.quiet(ctx as Parameters<Lines>[0])
  }

  if (opts.cleanMode) {
    const clean = def.cleanFallback
    return clean ? [...clean(ctx), ...heckle] : []
  }
  return [...def.fallback(ctx), ...heckle]
}

/** Whether an event is silenced by "Names only". Exposed so the UI copy can stay honest. */
export function isCommentary(event: NarratorEvent): boolean {
  return EVENTS[event]?.commentary ?? false
}

