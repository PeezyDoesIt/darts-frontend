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
import { NARRATOR_PERSONALITIES, type NarratorPersonality } from '../types/index'

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

export { NARRATOR_PERSONALITIES as PERSONALITIES }

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
  /** 'brother' or 'baby', from the narrator gender setting. */
  term?: string
  /** How many times this has already happened to this player. */
  count?: number
}

type Lines = (ctx: Required<Pick<LineContext, 'name'>> & LineContext) => string[][]

interface EventDef {
  /**
   * Commentary is everything except telling people whose turn it is. "Names only" silences
   * all of it — that setting promises "no commentary" and previously delivered none of it
   * outside the walk-up screen.
   */
  commentary: boolean
  byPersonality: Partial<Record<NarratorPersonality, Lines>>
  /** Used when a personality has no entry of its own. */
  fallback: Lines
  /** Clean-mode overrides. A personality missing here falls back to cleanFallback. */
  clean?: Partial<Record<NarratorPersonality, Lines>>
  /**
   * Neutral clean line for personalities with no clean voice written yet. Deliberately
   * plain rather than an invented impression of that personality — but never just the bare
   * name, which is what savage degraded to before.
   */
  cleanFallback?: Lines
}

const term = (c: LineContext) => c.term ?? 'baby'

const EVENTS: Record<NarratorEvent, EventDef> = {
  // ── Whose turn it is. The one thing "Names only" keeps. ──────────────────────
  walkUp: {
    commentary: false,
    byPersonality: {
      hype: c => [[`LET'S GO! ${c.name}, get up here — it's your time!`]],
      savage: c => [[`${c.name}. Get up there.`]],
      announcer: c => [[`Now stepping up to the oche — ${c.name}! The crowd falls silent.`]],
      sarcastic: c => [[`${c.name} — it's your turn. Try not to embarrass yourself.`]],
      smooth: c => [[`Alright ${c.name}, it's your turn. Make it smooth.`]],
    },
    fallback: c => [[`${c.name} — it's your turn.`]],
    clean: {
      hype: c => [[`${c.name}! Let's GO!`]],
      announcer: c => [[`Now throwing — ${c.name}.`]],
      sarcastic: c => [[`${c.name}. I guess.`]],
      smooth: c => [[`${c.name}, you're up.`]],
    },
    // Previously this fell through to the bare name, so clean + savage said only "Alice".
    // Clean mode is on by default, so that was most new users' first experience.
    cleanFallback: c => [[`${c.name}, you're up.`]],
  },

  bonusTurn: {
    commentary: false,
    byPersonality: {
      hype: c => [[`${c.name} — BONUS THROW! Let's go!`]],
      savage: c => [[`${c.name} — bonus throw. Don't waste it.`]],
      announcer: c => [[`And ${c.name} earns a bonus throw! The crowd goes wild!`]],
      // Named deliberately: the original said only "Oh, lucky you", which on a shared
      // screen left four people unsure whose bonus throw it was.
      sarcastic: c => [[`Oh, lucky you, ${c.name}. A bonus throw. Wow.`]],
      smooth: c => [[`Ooh, bonus throw for ${c.name}. Go ahead, ${term(c)}.`]],
    },
    fallback: c => [[`${c.name} — bonus throw!`]],
    cleanFallback: c => [[`${c.name} — bonus throw.`]],
  },

  // ── Commentary. All of this is silenced by "Names only". ─────────────────────
  zeroRoast: {
    commentary: true,
    byPersonality: {
      hype: () => [[`Zero?! Come ON! We need better than that!`, `Shake it off — next turn!`, `That wasn't it, but you got this!`]],
      savage: () => [[`Zero. Next.`, `Did you even try?`, `Yikes.`]],
      announcer: () => [[`A scoreless round! The commentators are at a loss for words.`, `Zero points! An unusual turn of events.`, `Difficult conditions out there.`]],
      sarcastic: () => [[`Zero. Outstanding.`, `A big fat zero. Inspiring.`, `Zero points. Truly a historic performance.`]],
      smooth: () => [[`Mmm, zero, but we keep it moving.`, `Shake it off. Next turn.`, `Everyone has off nights.`]],
    },
    fallback: () => [[`What the fuck was that?`, `Holy shit! Please, sit down. Who's next?`, `Who invited Helen Keller to play?`, `Damn!... That was trash.`, `Were you even facing the board?`]],
    clean: {
      hype: () => [[`Zero! Shake it off — next turn!`]],
      announcer: () => [[`A scoreless round. Difficult conditions out there.`]],
      sarcastic: () => [[`Zero. Outstanding.`]],
      smooth: () => [[`Mmm, zero. We keep it moving.`]],
    },
    cleanFallback: () => [[`No score that turn.`, `Zero. Next.`]],
  },

  timeout: {
    commentary: true,
    byPersonality: {
      hype: c => [
        [`${c.prevName} missed their turn! Unacceptable!`, `${c.prevName}! Where are you?! Get UP here!`, `${c.prevName} — you just gave away a free turn!`],
        [`Step your game up!`, `This is not the time to be slacking!`, `We need energy out here!`],
        ...(escalated(c) ? [[`This is getting ridiculous! Do better!`, `Again?! Come on ${c.prevName}!`, `Three times! THREE TIMES!`]] : []),
      ],
      savage: c => [
        [`${c.prevName} missed their turn. Pathetic.`, `${c.prevName}. Not even trying.`, `${c.prevName} timed out. Embarrassing.`],
        ...(escalated(c) ? [[`This is why nobody invites you to darts night.`, `At this rate, why are you even here?`, `You're making everyone else look good by comparison.`]] : []),
      ],
      announcer: c => [
        [`${c.prevName} has timed out! A costly mistake in tonight's competition!`, `${c.prevName} fails to respond in time! The judges are not pleased!`, `A timeout for ${c.prevName}! This could prove very costly!`],
        [`The crowd is stunned.`, `An awkward silence falls over the venue.`, `Nobody saw that coming.`],
        ...(escalated(c) ? [[`This could have serious implications for the standings!`, `The commentators are struggling to explain this one.`, `A pattern is emerging here, and it is not a good one.`]] : []),
      ],
      sarcastic: c => [
        [`${c.prevName} missed their turn. Shocking. Truly.`, `Oh wow. ${c.prevName} missed. Who could have predicted it.`, `${c.prevName} timed out. What a twist.`],
        ...(escalated(c) ? [[`At this point I'm not even surprised.`, `I've stopped expecting anything else.`, `This is just who they are now.`]] : []),
      ],
      smooth: c => [
        [`${c.prevName}, that's not a good look, ${term(c)}.`, `Come on ${c.prevName}, we needed you there.`, `${c.prevName}, you left that one on the table.`],
        ...(escalated(c) ? [[`Come on now. Pull it together.`, `Get it together, ${term(c)}.`, `We need better than that.`]] : []),
      ],
    },
    fallback: c => [
      [`${c.prevName} missed their turn.`, `Where the hell is ${c.prevName}?`, `${c.prevName} just wasted everyone's time.`],
      [`Be better.`, `Get your ass up here.`, `This ain't it.`],
      ...(escalated(c) ? [[`This is why nobody wants to play darts with you.`, `Three times. Sort it out.`, `Every single round with you.`]] : []),
    ],
    cleanFallback: c => [[`${c.prevName} missed their turn.`]],
  },

  hurryUp: {
    commentary: true,
    byPersonality: {
      hype: c => [repeat(c)
        ? [`${c.name}! I SAID let's GO! Move it!`, `${c.name}! Stop stalling and GET UP HERE!`, `${c.name}! MOVE! We don't have all day!`]
        : [`${c.name}! Hurry UP! We're all waiting!`, `${c.name}! Let's go, let's go, let's GO!`, `${c.name}! The clock is ticking!`]],
      savage: c => [repeat(c)
        ? [`${c.name}. I won't ask again.`, `${c.name}. Last warning.`, `${c.name}. Now.`]
        : [`${c.name}. Hurry up.`, `${c.name}. Walk up.`, `${c.name}. Let's go.`]],
      announcer: c => [repeat(c)
        ? [`${c.name}, please step up to the line immediately!`, `${c.name} is being warned by officials again!`, `The referee is losing patience with ${c.name}!`]
        : [`Officials are urging ${c.name} to take their position!`, `${c.name} has thirty seconds remaining!`, `The clock is running, ${c.name}!`]],
      sarcastic: c => [repeat(c)
        ? [`${c.name}. We're all just waiting here. No rush. Seriously.`, `Oh yes, take your time ${c.name}. It's not like anyone else is here.`, `${c.name}. Still waiting. Still here. Just us.`]
        : [`${c.name}. Any day now.`, `${c.name}. The darts aren't going to throw themselves.`, `${c.name}. We've aged considerably waiting for you.`]],
      smooth: c => [repeat(c)
        ? [`${c.name}. Let's go, ${term(c)}. Clock's moving.`, `Come on ${c.name}, time's running out, ${term(c)}.`, `${c.name}, we need you now, ${term(c)}.`]
        : [`${c.name}, whenever you're ready, ${term(c)}.`, `Take a breath and step up, ${c.name}.`, `${c.name}, the floor is yours, ${term(c)}.`]],
    },
    fallback: c => [repeat(c)
      ? [`${c.name}. Hurry the fuck up. This is why nobody wants to play darts with you.`, `${c.name}. I will not say it again. GET. UP. HERE.`, `${c.name}. Move your ass. NOW.`]
      : [`${c.name}. Hurry the fuck up. It's your turn.`, `${c.name}. Get up here. Right now.`, `${c.name}. Clock's running. Move it.`]],
    cleanFallback: c => [[`${c.name}, hurry up.`, `${c.name}, the clock is running.`]],
  },

  twentySecondWalkUp: {
    commentary: true,
    byPersonality: {
      hype: c => [[`${c.name}, twenty seconds! Let's MOVE!`]],
      savage: c => [[`${c.name}. Walk up.`]],
      announcer: c => [[`${c.name}, twenty seconds remaining!`]],
      sarcastic: c => [[`${c.name}, twenty seconds. Not that it seems to matter.`]],
      smooth: c => [[`${c.name}, about twenty seconds left, ${term(c)}.`]],
    },
    fallback: c => [[`${c.name}, walk up now.`]],
    cleanFallback: c => [[`${c.name}, twenty seconds.`]],
  },

  twentySecondThrow: {
    commentary: true,
    byPersonality: {
      hype: c => [[`${c.name}, twenty seconds! Let's MOVE!`]],
      savage: c => [[`${c.name}. Shoot.`]],
      announcer: c => [[`${c.name}, twenty seconds remaining in this turn!`]],
      sarcastic: c => [[`${c.name}, twenty seconds. Not that it seems to matter.`]],
      smooth: c => [[`${c.name}, about twenty seconds left, ${term(c)}.`]],
    },
    fallback: c => [[`${c.name}, you need to shoot.`]],
    cleanFallback: c => [[`${c.name}, twenty seconds.`]],
  },

  throwNudge: {
    commentary: true,
    byPersonality: {},
    fallback: c => [[`${c.name}, it's your turn`]],
    cleanFallback: c => [[`${c.name}, it's your turn`]],
  },

  win: {
    commentary: false,
    byPersonality: {
      hype: c => [[`${c.name} takes it! What a finish!`]],
      savage: c => [[`${c.name} wins. Everyone else, do better.`]],
      announcer: c => [[`And it's ${c.name}! A deserved victory tonight!`]],
      sarcastic: c => [[`${c.name} wins. Try to act surprised.`]],
      smooth: c => [[`${c.name} takes it. Smooth work, ${term(c)}.`]],
    },
    fallback: c => [[`${c.name} wins! Well played.`]],
    cleanFallback: c => [[`${c.name} wins! Well played.`]],
  },

  // ── The game clock. About the match, not any one player. ─────────────────────
  //
  // These were spoken with a bare speak() straight from GamePage, so they were the last
  // corner the narrator settings did not reach: "Names only" never silenced them and the
  // chosen personality never applied. `count` is the minutes remaining.
  gameTimeWarning: {
    commentary: true,
    byPersonality: {
      hype: c => [[`${c.count} minutes left! Let's GO!`]],
      savage: c => [[`${c.count} minutes. Move it along.`]],
      announcer: c => [[`${c.count} minutes remaining in this match!`]],
      sarcastic: c => [[`${c.count} minutes left. No rush, obviously.`]],
      smooth: c => [[`${c.count} minutes on the clock, ${term(c)}.`]],
    },
    fallback: c => [[`${c.count} minutes remaining in the game!`]],
    clean: {
      hype: c => [[`${c.count} minutes left! Let's go!`]],
      announcer: c => [[`${c.count} minutes remaining in this match.`]],
      sarcastic: c => [[`${c.count} minutes left. No rush.`]],
    },
    cleanFallback: c => [[`${c.count} minutes remaining.`]],
  },

  // Not commentary: the match ending is a state change, the same call as a win.
  gameOver: {
    commentary: false,
    byPersonality: {
      hype: () => [[`TIME! That's the game!`]],
      savage: () => [[`Time. Game over.`]],
      announcer: () => [[`And that is time! The match is over!`]],
      sarcastic: () => [[`Time's up. Riveting stuff.`]],
      smooth: c => [[`That's time, ${term(c)}. Game over.`]],
    },
    fallback: () => [[`Time is up! Game over!`]],
    clean: {
      hype: () => [[`Time! That's the game!`]],
      announcer: () => [[`And that is time. The match is over.`]],
    },
    cleanFallback: () => [[`Time's up. Game over.`]],
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
export function linesFor(
  event: NarratorEvent,
  personality: NarratorPersonality,
  opts: { cleanMode: boolean; quietNarrator: boolean },
  ctx: LineContext,
): string[][] {
  const def = EVENTS[event]
  if (!def) return []
  if (opts.quietNarrator && def.commentary) return []

  if (opts.cleanMode) {
    const clean = def.clean?.[personality] ?? def.cleanFallback
    return clean ? clean(ctx) : []
  }
  return (def.byPersonality[personality] ?? def.fallback)(ctx)
}

/** Whether an event is silenced by "Names only". Exposed so the UI copy can stay honest. */
export function isCommentary(event: NarratorEvent): boolean {
  return EVENTS[event]?.commentary ?? false
}

/**
 * Personality/event pairs with no clean-mode voice of their own, which therefore speak the
 * neutral fallback. Not a bug list — it is the worklist for anyone writing clean lines, and
 * the thing that was impossible to see when these were scattered across four files.
 */
export function missingCleanVariants(): { event: NarratorEvent; personality: NarratorPersonality }[] {
  const out: { event: NarratorEvent; personality: NarratorPersonality }[] = []
  for (const event of Object.keys(EVENTS) as NarratorEvent[]) {
    for (const personality of NARRATOR_PERSONALITIES) {
      if (!EVENTS[event].clean?.[personality]) out.push({ event, personality })
    }
  }
  return out
}
