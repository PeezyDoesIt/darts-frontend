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
import { NARRATOR_PERSONALITIES, type NarratorMode, type NarratorPersonality } from '../types/index'

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
   * Commentary is everything except the functional announcements: whose turn it is, that
   * time is nearly up, and who won. "Names only" silences all of it.
   */
  commentary: boolean
  /**
   * What a non-commentary event says under "Names only".
   *
   * Without this, "Names only" only skipped the events marked as commentary and let the rest
   * speak their full personality line — so the most repeated line in the app, the walk-up,
   * still delivered "Okay. Okay okay okay. Peezy. You got this. Do you got this? You got
   * this." on every single turn. The setting was called Names only and said everything.
   */
  quiet?: Lines
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
    // Names only: the name, and nothing else. Eighty times a game, this is the whole point
    // of the setting.
    quiet: c => [[`${c.name}.`, `${c.name}, you're up.`]],
    // This is the most repeated line in the app — it fires on every single turn, so four
    // players over twenty rounds hear it eighty times. One variant each meant hearing the
    // identical sentence all eighty. These rotate.
    byPersonality: {
      farley: c => [[
        `Okay. Okay okay okay. ${c.name}. You got this. Do you got this? You got this.`,
        `${c.name}! Up! Go! I believe in you! ...I think!`,
        `It's ${c.name}! Everybody look at ${c.name}!`,
      ]],
      preacher: c => [[
        `${c.name}. ${c.name.toUpperCase()}. That's you. Get up here.`,
        `Up. Now. ${c.name}, that board has been waiting on you.`,
        `${c.name}! On your feet.`,
      ]],
      nature: c => [[
        `Here we observe ${c.name}, approaching the oche with practised confidence.`,
        `${c.name} steps forward. The others watch, and wait.`,
      ]],
      noir: c => [[
        `${c.name} steps up. The board's seen a hundred like him. It wasn't impressed then either.`,
        `${c.name}. The oche doesn't care who you are. It never did.`,
      ]],
      machine: c => [[
        `Player: ${c.name}. Turn: active. Proceed.`,
        `${c.name} is up. Awaiting input.`,
      ]],
      hype: c => [[
        `LET'S GO! ${c.name}, get up here — it's your time!`,
        `${c.name}! Step UP! Let's see it!`,
        `Here we GO — ${c.name} is on the oche!`,
        `${c.name}, this is your moment. TAKE IT!`,
        `Big turn coming up — ${c.name}, let's GO!`,
      ]],
      savage: c => [[
        `${c.name}. Get up there.`,
        `${c.name}. Go.`,
        `${c.name}. We're waiting.`,
        `Up. ${c.name}.`,
        `${c.name}. Try harder this time.`,
      ]],
      announcer: c => [[
        `Now stepping up to the oche — ${c.name}! The crowd falls silent.`,
        `And it's ${c.name} to the line. All eyes on the board.`,
        `${c.name} takes the oche. You could hear a pin drop in here.`,
        `Next to throw — ${c.name}. The tension is palpable.`,
        `${c.name} steps forward. This is what they came for.`,
      ]],
      sarcastic: c => [[
        `${c.name} — it's your turn. Try not to embarrass yourself.`,
        `${c.name}. Your moment. Such as it is.`,
        `It's ${c.name}. Brace yourselves.`,
        `${c.name}'s up. Expectations remain low.`,
        `Go on then, ${c.name}. We've got all night.`,
      ]],
      smooth: c => [[
        `Alright ${c.name}, it's your turn. Make it smooth.`,
        `${c.name}, you're up, ${term(c)}. Take your time.`,
        `Nice and easy, ${c.name}. Your throw.`,
        `Alright ${c.name}. Let's see something pretty.`,
        `${c.name}, ${term(c)}, the board's all yours.`,
      ]],
    },
    fallback: c => [[
      `${c.name} — it's your turn.`,
      `${c.name}, you're up.`,
      `Up next — ${c.name}.`,
    ]],
    clean: {
      farley: c => [[
        `Okay. Okay okay okay. ${c.name}. You got this. Do you got this? You got this.`,
        `${c.name}! Up! Go! I believe in you! ...I think!`,
        `It's ${c.name}! Everybody look at ${c.name}!`,
      ]],
      preacher: c => [[
        `${c.name}. ${c.name.toUpperCase()}. That's you. Get up here.`,
        `Up. Now. ${c.name}, that board has been waiting on you.`,
        `${c.name}! On your feet.`,
      ]],
      nature: c => [[
        `Here we observe ${c.name}, approaching the oche with practised confidence.`,
        `${c.name} steps forward. The others watch, and wait.`,
      ]],
      noir: c => [[
        `${c.name} steps up. The board's seen a hundred like him. It wasn't impressed then either.`,
        `${c.name}. The oche doesn't care who you are. It never did.`,
      ]],
      machine: c => [[
        `Player: ${c.name}. Turn: active. Proceed.`,
        `${c.name} is up. Awaiting input.`,
      ]],
      default: c => [[
        `${c.name} — it's your turn.`,
        `${c.name}, you're up.`,
        `Up next — ${c.name}.`,
      ]],
      hype: c => [[
        `${c.name}! Let's GO!`,
        `${c.name}, step UP!`,
        `Here we go — ${c.name}!`,
        `${c.name}, take it!`,
      ]],
      savage: c => [[
        `${c.name}. Get up there.`,
        `${c.name}. Go.`,
        `${c.name}. We're waiting.`,
        `Up. ${c.name}.`,
      ]],
      announcer: c => [[
        `Now throwing — ${c.name}.`,
        `${c.name} to the oche.`,
        `And it's ${c.name} to the line.`,
        `Next to throw — ${c.name}.`,
      ]],
      sarcastic: c => [[
        `${c.name}. I guess.`,
        `${c.name}'s turn. Brace yourselves.`,
        `Go on then, ${c.name}.`,
        `It's ${c.name}. Marvellous.`,
      ]],
      smooth: c => [[
        `Alright ${c.name}, make it smooth.`,
        `${c.name}, you're up, ${term(c)}.`,
        `Nice and easy, ${c.name}.`,
        `The board's all yours, ${c.name}.`,
      ]],
    },
    // Previously this fell through to the bare name, so clean + savage said only "Alice".
    // Clean mode is on by default, so that was most new users' first experience.
    cleanFallback: c => [[`${c.name}, you're up.`]],
  },

  bonusTurn: {
    commentary: false,
    quiet: c => [[`${c.name}, bonus throw.`]],
    byPersonality: {
      farley: c => [[
        `A BONUS?! For ${c.name}?! Somebody pinch me!`,
        `${c.name} gets another one! Don't blow it! ...Sorry. You won't blow it.`,
      ]],
      preacher: c => [[
        `${c.name} gets ANOTHER one. Do not waste it.`,
        `Bonus throw, ${c.name}. That is a gift. Act like it.`,
      ]],
      nature: c => [[
        `A rare second opportunity presents itself to ${c.name}.`,
        `${c.name} is granted another throw — an advantage seldom squandered.`,
      ]],
      noir: c => [[
        `${c.name} gets a bonus. Nothing in this room is free, but take it anyway.`,
        `Another throw for ${c.name}. Second chances are cheaper than they look.`,
      ]],
      machine: c => [[
        `${c.name}: bonus throw allocated.`,
        `Additional attempt granted. ${c.name}, proceed.`,
      ]],
      hype: c => [[
        `${c.name} — BONUS THROW! Let's go!`,
        `BONUS for ${c.name}! Make it count!`,
        `${c.name} earns another one! GO!`,
      ]],
      savage: c => [[
        `${c.name} — bonus throw. Don't waste it.`,
        `${c.name} gets another. Use it properly.`,
        `Bonus throw, ${c.name}. Try not to squander it.`,
      ]],
      announcer: c => [[
        `And ${c.name} earns a bonus throw! The crowd goes wild!`,
        `A bonus throw for ${c.name}! What an opportunity!`,
        `${c.name} has earned another dart! Remarkable!`,
      ]],
      // Named deliberately: the original said only "Oh, lucky you", which on a shared
      // screen left four people unsure whose bonus throw it was.
      sarcastic: c => [[
        `Oh, lucky you, ${c.name}. A bonus throw. Wow.`,
        `${c.name} gets a bonus. The universe is generous.`,
        `A bonus throw for ${c.name}. Don't let it go to your head.`,
      ]],
      smooth: c => [[
        `Ooh, bonus throw for ${c.name}. Go ahead, ${term(c)}.`,
        `${c.name} earned another one. Take it, ${term(c)}.`,
        `Bonus for ${c.name}. Make it pretty.`,
      ]],
    },
    fallback: c => [[`${c.name} — bonus throw!`, `Bonus throw for ${c.name}.`]],
    // The unfiltered lines here carry no profanity, so clean mode keeps the same voices
    // rather than flattening all six into one neutral sentence.
    clean: {
      farley: c => [[
        `A BONUS?! For ${c.name}?! Somebody pinch me!`,
        `${c.name} gets another one! Don't blow it! ...Sorry. You won't blow it.`,
      ]],
      preacher: c => [[
        `${c.name} gets ANOTHER one. Do not waste it.`,
        `Bonus throw, ${c.name}. That is a gift. Act like it.`,
      ]],
      nature: c => [[
        `A rare second opportunity presents itself to ${c.name}.`,
        `${c.name} is granted another throw — an advantage seldom squandered.`,
      ]],
      noir: c => [[
        `${c.name} gets a bonus. Nothing in this room is free, but take it anyway.`,
        `Another throw for ${c.name}. Second chances are cheaper than they look.`,
      ]],
      machine: c => [[
        `${c.name}: bonus throw allocated.`,
        `Additional attempt granted. ${c.name}, proceed.`,
      ]],
      default: c => [[`${c.name} — bonus throw.`, `Bonus throw for ${c.name}.`]],
      hype: c => [[`${c.name} — BONUS THROW! Let's go!`, `BONUS for ${c.name}! Make it count!`]],
      savage: c => [[
        `${c.name} — bonus throw. Don't waste it.`,
        `${c.name} gets another. Use it properly.`,
      ]],
      announcer: c => [[
        `And ${c.name} earns a bonus throw! The crowd is on its feet!`,
        `A bonus throw for ${c.name}! What an opportunity!`,
      ]],
      sarcastic: c => [[
        `Oh, lucky you, ${c.name}. A bonus throw. Wow.`,
        `${c.name} gets a bonus. The universe is generous.`,
      ]],
      smooth: c => [[
        `Ooh, bonus throw for ${c.name}. Go ahead, ${term(c)}.`,
        `${c.name} earned another one. Take it, ${term(c)}.`,
      ]],
    },
    cleanFallback: c => [[`${c.name} — bonus throw.`, `Bonus throw for ${c.name}.`]],
  },

  // ── Commentary. All of this is silenced by "Names only". ─────────────────────
  zeroRoast: {
    commentary: true,
    byPersonality: {
      farley: () => [[
        `OH, THAT'S GREAT. That's — no, that's great. It'll come back. Any minute now. ...Any minute.`,
        `Zero! ZERO! And you know what? I've done worse. Way worse. Don't ask.`,
        `Nothing! That's okay! That is okay. I'm saying it out loud so it's true.`,
      ]],
      preacher: () => [[
        `Zero. Three darts, and you came back with NOTHING. You want to explain that to me? Slowly?`,
        `ZERO. Say it with me. Zero.`,
        `That is what we call a wasted turn, and everybody saw it.`,
      ]],
      nature: () => [[
        `A miss. The pack senses weakness. In the wild, this is where the herd moves on.`,
        `Nothing. The board remains, indifferent, as it has for millennia.`,
      ]],
      noir: () => [[
        `Zero. The kind of number that follows a man home and waits on the porch.`,
        `Nothing scored. Somewhere, a dartboard is laughing.`,
      ]],
      machine: () => [[
        `Score recorded: zero. Outcome anticipated. Model unchanged.`,
        `Zero. Logged without comment.`,
      ]],
      hype: () => [[`Zero?! Come ON! We need better than that!`, `Shake it off — next turn!`, `That wasn't it, but you got this!`]],
      savage: () => [[`Zero. Next.`, `Did you even try?`, `Yikes.`]],
      announcer: () => [[`A scoreless round! The commentators are at a loss for words.`, `Zero points! An unusual turn of events.`, `Difficult conditions out there.`]],
      sarcastic: () => [[`Zero. Outstanding.`, `A big fat zero. Inspiring.`, `Zero points. Truly a historic performance.`]],
      smooth: () => [[`Mmm, zero, but we keep it moving.`, `Shake it off. Next turn.`, `Everyone has off nights.`]],
    },
    fallback: () => [[`What the fuck was that?`, `Holy shit! Please, sit down. Who's next?`, `Who invited Helen Keller to play?`, `Damn!... That was trash.`, `Were you even facing the board?`]],
    clean: {
      farley: () => [[
        `OH, THAT'S GREAT. That's — no, that's great. It'll come back. Any minute now. ...Any minute.`,
        `Zero! ZERO! And you know what? I've done worse. Way worse. Don't ask.`,
        `Nothing! That's okay! That is okay. I'm saying it out loud so it's true.`,
      ]],
      preacher: () => [[
        `Zero. Three darts, and nothing to show. Explain that to me.`,
        `ZERO. Say it with me. Zero.`,
      ]],
      nature: () => [[
        `A miss. The pack senses weakness. In the wild, this is where the herd moves on.`,
        `Nothing. The board remains, indifferent, as it has for millennia.`,
      ]],
      noir: () => [[
        `Zero. The kind of number that follows a man home and waits on the porch.`,
        `Nothing scored. Somewhere, a dartboard is laughing.`,
      ]],
      machine: () => [[
        `Score recorded: zero. Outcome anticipated. Model unchanged.`,
        `Zero. Logged without comment.`,
      ]],
      default: () => [[`No score that turn.`, `Zero. Next.`]],
      hype: () => [[`Zero! Shake it off — next turn!`, `That wasn't it, but you got this!`]],
      savage: () => [[`Zero. Next.`, `Did you even try?`, `Yikes.`]],
      announcer: () => [[`A scoreless round. Difficult conditions out there.`, `Zero points! An unusual turn of events.`]],
      sarcastic: () => [[`Zero. Outstanding.`, `A big fat zero. Inspiring.`, `Zero points. Truly historic.`]],
      smooth: () => [[`Mmm, zero. We keep it moving.`, `Everyone has off nights.`]],
    },
    cleanFallback: () => [[`No score that turn.`, `Zero. Next.`]],
  },

  timeout: {
    commentary: true,
    byPersonality: {
      farley: c => [
        [`${c.prevName}! You missed it! You MISSED it! ...It's fine. It's fine.`, `Gone! ${c.prevName}, it's gone! I can't watch.`],
        ...(escalated(c) ? [[
          `AGAIN?! ${c.prevName}! We talked about this!`,
          `That's twice! I'm not mad! I'm just — okay I'm a little mad.`,
        ]] : []),
      ],
      preacher: c => [
        [`${c.prevName}! You had a turn and you let it walk right past you!`,
        `Gone. ${c.prevName}, your turn is GONE.`,],
        ...(escalated(c) ? [[
          `Again, ${c.prevName}? AGAIN?`,
          `That is twice. Do not make it three.`,
        ]] : []),
      ],
      nature: c => [
        [`${c.prevName} has wandered from the group and missed the opportunity entirely.`,
        `The moment passes. ${c.prevName} was elsewhere.`,],
        ...(escalated(c) ? [[
          `A pattern emerges. ${c.prevName} is not adapting.`,
          `Repeated absence. The group has begun to compensate.`,
        ]] : []),
      ],
      noir: c => [
        [`${c.prevName} missed it. Turns are like buses in this town — you only notice them leaving.`,
        `${c.prevName}'s turn came and went. Nobody waited.`,],
        ...(escalated(c) ? [[
          `Twice now, ${c.prevName}. That stops being bad luck and starts being a habit.`,
          `Same story, second telling. ${c.prevName}.`,
        ]] : []),
      ],
      machine: c => [
        [`${c.prevName}: turn expired. No input received.`,
        `Timeout. ${c.prevName} did not respond.`,],
        ...(escalated(c) ? [[
          `${c.prevName}: repeated timeout. Pattern logged.`,
          `Second occurrence. ${c.prevName}.`,
        ]] : []),
      ],
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
    clean: {
      farley: c => [
        [`${c.prevName}! You missed it! You MISSED it! ...It's fine. It's fine.`, `Gone! ${c.prevName}, it's gone! I can't watch.`],
        ...(escalated(c) ? [[
          `AGAIN?! ${c.prevName}! We talked about this!`,
          `That's twice! I'm not mad! I'm just — okay I'm a little mad.`,
        ]] : []),
      ],
      preacher: c => [[
        `${c.prevName}! You had a turn and you let it walk right past you!`,
        `Gone. ${c.prevName}, your turn is GONE.`,
      ]],
      nature: c => [[
        `${c.prevName} has wandered from the group and missed the opportunity entirely.`,
        `The moment passes. ${c.prevName} was elsewhere.`,
      ]],
      noir: c => [[
        `${c.prevName} missed it. Turns are like buses in this town — you only notice them leaving.`,
        `${c.prevName}'s turn came and went. Nobody waited.`,
      ]],
      machine: c => [[
        `${c.prevName}: turn expired. No input received.`,
        `Timeout. ${c.prevName} did not respond.`,
      ]],
      // Two lines and an escalation, like every other voice here. This was one fixed
      // sentence: clean mode is on by default, so the plainest narrator was also the one
      // that repeated itself most.
      default: c => [
        [`${c.prevName} missed their turn.`, `${c.prevName} wasn't there for that one.`],
        ...(escalated(c) ? [[`That's happened a few times now.`, `${c.prevName} has missed several.`]] : []),
      ],
      hype: c => [
        [`${c.prevName} missed their turn! Step it up!`, `${c.prevName}! Where were you?!`],
        ...(escalated(c) ? [[`Again?! Come on ${c.prevName}!`, `Three times! Do better!`]] : []),
      ],
      savage: c => [
        [`${c.prevName} missed their turn. Not even trying.`, `${c.prevName} timed out. Embarrassing.`],
        ...(escalated(c) ? [[`At this rate, why are you even here?`, `Every round with you.`]] : []),
      ],
      announcer: c => [
        [`${c.prevName} has timed out! A costly mistake!`, `${c.prevName} fails to respond in time!`],
        ...(escalated(c) ? [[`A pattern is emerging, and not a good one.`]] : []),
      ],
      sarcastic: c => [
        [`${c.prevName} missed their turn. Shocking. Truly.`, `Oh wow. ${c.prevName} missed. Who could have predicted it.`],
        ...(escalated(c) ? [[`At this point I'm not even surprised.`, `This is just who they are now.`]] : []),
      ],
      smooth: c => [
        [`${c.prevName}, that's not a good look, ${term(c)}.`, `${c.prevName}, you left that one on the table.`],
        ...(escalated(c) ? [[`Get it together, ${term(c)}.`]] : []),
      ],
    },
    cleanFallback: c => [[`${c.prevName} missed their turn.`]],
  },

  hurryUp: {
    /*
     * Functional, not banter: the only warning that a turn is about to be lost, so it
     * survives Names only. Off still silences it — off means off.
     */
    commentary: false,
    quiet: c => [[`Hurry up, ${c.name}.`]],
    byPersonality: {
      farley: c => [[
        `${c.name}! Come on! COME ON! ...please.`,
        `We're all waiting, ${c.name}! Not in a mean way! In a supportive way!`,
      ]],
      preacher: c => [[
        `${c.name}! We are all standing here waiting on YOU!`,
        `Move, ${c.name}. Move now.`,
      ]],
      nature: c => [[
        `${c.name} lingers. The others grow restless.`,
        `Still ${c.name} hesitates. The window narrows.`,
      ]],
      noir: c => [[
        `${c.name}. The clock's running and it doesn't take requests.`,
        `Sometime today, ${c.name}. The night's not getting younger.`,
      ]],
      machine: c => [[
        `${c.name}: input overdue.`,
        `Still waiting. ${c.name}.`,
      ]],
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
    clean: {
      farley: c => [[
        `${c.name}! Come on! COME ON! ...please.`,
        `We're all waiting, ${c.name}! Not in a mean way! In a supportive way!`,
      ]],
      preacher: c => [[
        `${c.name}! We are all standing here waiting on YOU!`,
        `Move, ${c.name}. Move now.`,
      ]],
      nature: c => [[
        `${c.name} lingers. The others grow restless.`,
        `Still ${c.name} hesitates. The window narrows.`,
      ]],
      noir: c => [[
        `${c.name}. The clock's running and it doesn't take requests.`,
        `Sometime today, ${c.name}. The night's not getting younger.`,
      ]],
      machine: c => [[
        `${c.name}: input overdue.`,
        `Still waiting. ${c.name}.`,
      ]],
      default: c => [[`${c.name}, hurry up.`, `${c.name}, the clock is running.`]],
      hype: c => [repeat(c)
        ? [`${c.name}! I SAID let's GO!`, `${c.name}! Stop stalling!`]
        : [`${c.name}! Hurry UP! We're all waiting!`, `${c.name}! The clock is ticking!`]],
      savage: c => [repeat(c)
        ? [`${c.name}. I won't ask again.`, `${c.name}. Last warning.`, `${c.name}. Now.`]
        : [`${c.name}. Hurry up.`, `${c.name}. Walk up.`, `${c.name}. Let's go.`]],
      announcer: c => [repeat(c)
        ? [`${c.name} is being warned by officials again!`, `The referee is losing patience with ${c.name}!`]
        : [`Officials are urging ${c.name} to take their position!`, `The clock is running, ${c.name}!`]],
      sarcastic: c => [repeat(c)
        ? [`${c.name}. We're all just waiting here. No rush.`, `Still waiting on ${c.name}. Still here.`]
        : [`${c.name}. Any day now.`, `${c.name}. The darts aren't going to throw themselves.`]],
      smooth: c => [repeat(c)
        ? [`${c.name}, clock's moving, ${term(c)}.`, `Come on ${c.name}, we need you now.`]
        : [`${c.name}, whenever you're ready, ${term(c)}.`, `${c.name}, the floor is yours.`]],
    },
    cleanFallback: c => [[`${c.name}, hurry up.`, `${c.name}, the clock is running.`]],
  },

  twentySecondWalkUp: {
    commentary: true,
    byPersonality: {
      farley: c => [[
        `Twenty seconds, ${c.name}! GO! GO GO GO!`,
        `${c.name}! Twenty! That's not a lot! That's barely any!`,
      ]],
      preacher: c => [[
        `Twenty seconds, ${c.name}! Get UP there!`,
        `${c.name}. Twenty. Move.`,
      ]],
      nature: c => [[
        `Twenty seconds remain. ${c.name} must commit.`,
        `The window is closing on ${c.name}.`,
      ]],
      noir: c => [[
        `Twenty seconds, ${c.name}. That's all anyone gets.`,
        `Clock's at twenty, ${c.name}. It won't wait.`,
      ]],
      machine: c => [[
        `${c.name}: twenty seconds remaining.`,
        `Countdown: twenty. ${c.name}.`,
      ]],
      hype: c => [[
        `${c.name}, twenty seconds! Let's MOVE!`,
        `Twenty seconds, ${c.name} — get up there!`,
        `Clock's running, ${c.name}! MOVE!`,
      ]],
      savage: c => [[
        `${c.name}. Walk up.`,
        `Twenty seconds, ${c.name}.`,
        `${c.name}. Now.`,
      ]],
      announcer: c => [[
        `${c.name}, twenty seconds remaining!`,
        `Twenty seconds on the clock for ${c.name}.`,
        `The clock is against ${c.name} — twenty seconds.`,
      ]],
      sarcastic: c => [[
        `${c.name}, twenty seconds. Not that it seems to matter.`,
        `Twenty seconds, ${c.name}. No rush, obviously.`,
        `${c.name}, twenty seconds. Whenever suits.`,
      ]],
      smooth: c => [[
        `${c.name}, about twenty seconds left, ${term(c)}.`,
        `Twenty seconds, ${c.name}. Ease on up.`,
        `Clock's ticking, ${c.name}. Come on up, ${term(c)}.`,
      ]],
    },
    fallback: c => [[
      `${c.name}, walk up now.`,
      `${c.name}, twenty seconds.`,
    ]],
    clean: {
      farley: c => [[
        `Twenty seconds, ${c.name}! GO! GO GO GO!`,
        `${c.name}! Twenty! That's not a lot! That's barely any!`,
      ]],
      preacher: c => [[
        `Twenty seconds, ${c.name}! Get UP there!`,
        `${c.name}. Twenty. Move.`,
      ]],
      nature: c => [[
        `Twenty seconds remain. ${c.name} must commit.`,
        `The window is closing on ${c.name}.`,
      ]],
      noir: c => [[
        `Twenty seconds, ${c.name}. That's all anyone gets.`,
        `Clock's at twenty, ${c.name}. It won't wait.`,
      ]],
      machine: c => [[
        `${c.name}: twenty seconds remaining.`,
        `Countdown: twenty. ${c.name}.`,
      ]],
      default: c => [[`${c.name}, twenty seconds.`, `${c.name}, walk up now.`]],
      hype: c => [[
        `${c.name}, twenty seconds! Let's MOVE!`,
        `Clock's running, ${c.name}!`,
      ]],
      savage: c => [[`${c.name}. Walk up.`, `Twenty seconds, ${c.name}.`, `${c.name}. Now.`]],
      announcer: c => [[
        `${c.name}, twenty seconds remaining!`,
        `Twenty seconds on the clock for ${c.name}.`,
      ]],
      sarcastic: c => [[
        `${c.name}, twenty seconds. Not that it seems to matter.`,
        `Twenty seconds, ${c.name}. No rush, obviously.`,
      ]],
      smooth: c => [[
        `${c.name}, about twenty seconds left, ${term(c)}.`,
        `Twenty seconds, ${c.name}. Ease on up.`,
      ]],
    },
    cleanFallback: c => [[`${c.name}, twenty seconds.`, `${c.name}, walk up now.`]],
  },

  twentySecondThrow: {
    commentary: true,
    byPersonality: {
      farley: c => [[
        `THROW IT, ${c.name}! Throw it throw it throw it!`,
        `Twenty seconds! ${c.name}! Just — let it go! LET IT GO!`,
      ]],
      preacher: c => [[
        `Twenty seconds, ${c.name}. THROW it.`,
        `${c.name}! Let it go!`,
      ]],
      nature: c => [[
        `Twenty seconds. ${c.name} steadies, and must release.`,
        `The moment is upon ${c.name}.`,
      ]],
      noir: c => [[
        `Twenty seconds, ${c.name}. The dart won't throw itself. Nothing does.`,
        `Time's short, ${c.name}. It always was.`,
      ]],
      machine: c => [[
        `${c.name}: twenty seconds to release.`,
        `Release window closing. ${c.name}.`,
      ]],
      // Deliberately not the same words as twentySecondWalkUp: that one is "get to the
      // line", this one is "you're at the line, throw". They previously shared three
      // identical lines, which made the two moments indistinguishable.
      hype: c => [[
        `${c.name}, twenty seconds — THROW!`,
        `Twenty seconds, ${c.name}! Let it fly!`,
        `Clock's on you, ${c.name} — send it!`,
      ]],
      savage: c => [[
        `${c.name}. Shoot.`,
        `Twenty seconds. Throw, ${c.name}.`,
        `${c.name}. Any day now.`,
      ]],
      announcer: c => [[
        `${c.name}, twenty seconds remaining in this turn!`,
        `Twenty seconds left for ${c.name} to release.`,
        `The clock closes in on ${c.name} — twenty seconds.`,
      ]],
      sarcastic: c => [[
        `${c.name}, twenty seconds. Not that it seems to matter.`,
        `Twenty seconds, ${c.name}. Take your time. Really.`,
        `${c.name}, twenty seconds. The dart won't throw itself.`,
      ]],
      smooth: c => [[
        `${c.name}, about twenty seconds left, ${term(c)}.`,
        `Twenty seconds, ${c.name}. Let it go smooth.`,
        `Clock's easing down, ${c.name}. Send it, ${term(c)}.`,
      ]],
    },
    fallback: c => [[
      `${c.name}, you need to shoot.`,
      `${c.name}, twenty seconds to throw.`,
    ]],
    clean: {
      farley: c => [[
        `THROW IT, ${c.name}! Throw it throw it throw it!`,
        `Twenty seconds! ${c.name}! Just — let it go! LET IT GO!`,
      ]],
      preacher: c => [[
        `Twenty seconds, ${c.name}. THROW it.`,
        `${c.name}! Let it go!`,
      ]],
      nature: c => [[
        `Twenty seconds. ${c.name} steadies, and must release.`,
        `The moment is upon ${c.name}.`,
      ]],
      noir: c => [[
        `Twenty seconds, ${c.name}. The dart won't throw itself. Nothing does.`,
        `Time's short, ${c.name}. It always was.`,
      ]],
      machine: c => [[
        `${c.name}: twenty seconds to release.`,
        `Release window closing. ${c.name}.`,
      ]],
      default: c => [[`${c.name}, twenty seconds.`, `${c.name}, you need to throw.`]],
      hype: c => [[`${c.name}, twenty seconds — THROW!`, `Let it fly, ${c.name}!`]],
      savage: c => [[`${c.name}. Shoot.`, `Throw, ${c.name}.`, `${c.name}. Any day now.`]],
      announcer: c => [[
        `${c.name}, twenty seconds remaining in this turn!`,
        `Twenty seconds left for ${c.name} to release.`,
      ]],
      sarcastic: c => [[
        `${c.name}, twenty seconds. Not that it seems to matter.`,
        `${c.name}, the dart won't throw itself.`,
      ]],
      smooth: c => [[
        `${c.name}, about twenty seconds left, ${term(c)}.`,
        `Let it go smooth, ${c.name}.`,
      ]],
    },
    cleanFallback: c => [[`${c.name}, twenty seconds.`, `${c.name}, you need to throw.`]],
  },

  throwNudge: {
    commentary: true,
    byPersonality: {
      farley: c => [[
        `${c.name}! Still you! STILL YOU!`,
        `Buddy. ${c.name}. It's you. It's still you.`,
      ]],
      preacher: c => [[
        `${c.name}. STILL you. Throw.`,
        `We have not moved on, ${c.name}. Neither should you.`,
      ]],
      nature: c => [[
        `${c.name} remains at the oche, motionless.`,
        `Still ${c.name}. The board waits, as boards do.`,
      ]],
      noir: c => [[
        `Still you, ${c.name}. Nobody else is coming.`,
        `${c.name}. Any time you like. Or don't.`,
      ]],
      machine: c => [[
        `${c.name}: still active. Awaiting input.`,
        `No input. ${c.name} remains current.`,
      ]],
      hype: c => [[
        `${c.name}! You're up — let's go!`,
        `${c.name}! Still you! Let's GO!`,
        `Come on ${c.name}, we're waiting on you!`,
      ]],
      savage: c => [[
        `${c.name}. Throw.`,
        `${c.name}. Still you.`,
        `Today, ${c.name}.`,
      ]],
      announcer: c => [[
        `${c.name}, the board is waiting.`,
        `We're still waiting on ${c.name}.`,
        `The oche remains occupied — ${c.name}.`,
      ]],
      sarcastic: c => [[
        `${c.name}. Still your turn, by the way.`,
        `${c.name}. In case you'd forgotten.`,
        `Any time, ${c.name}. Genuinely.`,
      ]],
      smooth: c => [[
        `${c.name}, it's you, ${term(c)}.`,
        `Still you, ${c.name}. No rush.`,
        `We're on you, ${c.name}. Whenever you're ready.`,
      ]],
    },
    fallback: c => [[
      `${c.name}, it's your turn`,
      `${c.name}, still your turn`,
    ]],
    clean: {
      farley: c => [[
        `${c.name}! Still you! STILL YOU!`,
        `Buddy. ${c.name}. It's you. It's still you.`,
      ]],
      preacher: c => [[
        `${c.name}. STILL you. Throw.`,
        `We have not moved on, ${c.name}. Neither should you.`,
      ]],
      nature: c => [[
        `${c.name} remains at the oche, motionless.`,
        `Still ${c.name}. The board waits, as boards do.`,
      ]],
      noir: c => [[
        `Still you, ${c.name}. Nobody else is coming.`,
        `${c.name}. Any time you like. Or don't.`,
      ]],
      machine: c => [[
        `${c.name}: still active. Awaiting input.`,
        `No input. ${c.name} remains current.`,
      ]],
      default: c => [[`${c.name}, it's your turn`, `${c.name}, still your turn`]],
      hype: c => [[`${c.name}! You're up — let's go!`, `Come on ${c.name}!`]],
      savage: c => [[`${c.name}. Throw.`, `${c.name}. Still you.`, `Today, ${c.name}.`]],
      announcer: c => [[
        `${c.name}, the board is waiting.`,
        `We're still waiting on ${c.name}.`,
      ]],
      sarcastic: c => [[
        `${c.name}. Still your turn, by the way.`,
        `${c.name}. In case you'd forgotten.`,
      ]],
      smooth: c => [[
        `${c.name}, it's you, ${term(c)}.`,
        `Still you, ${c.name}. No rush.`,
      ]],
    },
    cleanFallback: c => [[`${c.name}, it's your turn`, `${c.name}, still your turn`]],
  },

  win: {
    commentary: false,
    quiet: c => [[`${c.name} wins.`]],
    byPersonality: {
      farley: c => [[
        `${c.name} WINS! Get over here! No — GET OVER HERE! I'm so proud I could break a table!`,
        `THAT'S ${c.name}! THAT'S MY — well, that's ${c.name}!`,
      ]],
      preacher: c => [[
        `${c.name} takes it — and there was NOTHING anybody here could do about it.`,
        `That is how it is done. ${c.name}. Say the name.`,
      ]],
      nature: c => [[
        `And so ${c.name} prevails — a rare thing, seldom witnessed twice in one season.`,
        `${c.name} stands victorious. The others disperse.`,
      ]],
      noir: c => [[
        `${c.name} wins. In this town that buys you a drink and nothing else.`,
        `It's ${c.name}. Somebody had to be.`,
      ]],
      machine: c => [[
        `${c.name} wins. Pre-game probability: low. Adjusting.`,
        `Result: ${c.name}. Recorded.`,
      ]],
      hype: c => [[
        `${c.name} takes it! What a finish!`,
        `${c.name} WINS! That's how it's done!`,
        `GET IN! ${c.name} takes the whole thing!`,
        `${c.name}! Champion! What a performance!`,
      ]],
      savage: c => [[
        `${c.name} wins. Everyone else, do better.`,
        `${c.name} wins. The rest of you were spectators.`,
        `${c.name}. Winner. Barely a contest.`,
        `That's ${c.name}. Try again sometime.`,
      ]],
      announcer: c => [[
        `And it's ${c.name}! A deserved victory tonight!`,
        `${c.name} takes it! What a way to close out the match!`,
        `Victory goes to ${c.name}! The crowd is on its feet!`,
        `And that's the match — ${c.name}, your winner!`,
      ]],
      sarcastic: c => [[
        `${c.name} wins. Try to act surprised.`,
        `${c.name} takes it. Nobody saw that coming. Nobody.`,
        `And ${c.name} wins. Alert the press.`,
        `${c.name}. Victorious. We're all thrilled.`,
      ]],
      smooth: c => [[
        `${c.name} takes it. Smooth work, ${term(c)}.`,
        `That's the game, ${c.name}. Beautiful.`,
        `${c.name} closes it out. Real nice, ${term(c)}.`,
        `And ${c.name} takes it home. Smooth.`,
      ]],
    },
    fallback: c => [[
      `${c.name} wins! Well played.`,
      `${c.name} takes it. Well played.`,
      `That's the game — ${c.name} wins.`,
    ]],
    clean: {
      farley: c => [[
        `${c.name} WINS! Get over here! No — GET OVER HERE! I'm so proud I could break a table!`,
        `THAT'S ${c.name}! THAT'S MY — well, that's ${c.name}!`,
      ]],
      preacher: c => [[
        `${c.name} takes it — and there was NOTHING anybody here could do about it.`,
        `That is how it is done. ${c.name}. Say the name.`,
      ]],
      nature: c => [[
        `And so ${c.name} prevails — a rare thing, seldom witnessed twice in one season.`,
        `${c.name} stands victorious. The others disperse.`,
      ]],
      noir: c => [[
        `${c.name} wins. In this town that buys you a drink and nothing else.`,
        `It's ${c.name}. Somebody had to be.`,
      ]],
      machine: c => [[
        `${c.name} wins. Pre-game probability: low. Adjusting.`,
        `Result: ${c.name}. Recorded.`,
      ]],
      default: c => [[
        `${c.name} wins! Well played.`,
        `That's the game — ${c.name} wins.`,
      ]],
      hype: c => [[
        `${c.name} takes it! What a finish!`,
        `${c.name} WINS! That's how it's done!`,
        `${c.name}! Champion!`,
      ]],
      savage: c => [[
        `${c.name} wins. Everyone else, do better.`,
        `${c.name}. Winner. Barely a contest.`,
        `That's ${c.name}. Try again sometime.`,
      ]],
      announcer: c => [[
        `And it's ${c.name}! A deserved victory tonight!`,
        `Victory goes to ${c.name}!`,
        `And that's the match — ${c.name}, your winner!`,
      ]],
      sarcastic: c => [[
        `${c.name} wins. Try to act surprised.`,
        `And ${c.name} wins. Alert the press.`,
        `${c.name}. Victorious. We're all thrilled.`,
      ]],
      smooth: c => [[
        `${c.name} takes it. Smooth work, ${term(c)}.`,
        `That's the game, ${c.name}. Beautiful.`,
        `And ${c.name} takes it home. Smooth.`,
      ]],
    },
    cleanFallback: c => [[
      `${c.name} wins! Well played.`,
      `That's the game — ${c.name} wins.`,
    ]],
  },

  // ── The game clock. About the match, not any one player. ─────────────────────
  //
  // These were spoken with a bare speak() straight from GamePage, so they were the last
  // corner the narrator settings did not reach: "Names only" never silenced them and the
  // chosen personality never applied. `count` is the minutes remaining.
  gameTimeWarning: {
    commentary: true,
    byPersonality: {
      farley: c => [[
        `${c.count} minutes! That's it! That's ALL we get!`,
        `${c.count} minutes, everybody! Make 'em count! Or don't! No pressure!`,
      ]],
      preacher: c => [[
        `${c.count} minutes! Do something with them!`,
        `${c.count} minutes left. That is not a lot.`,
      ]],
      nature: c => [[
        `${c.count} minutes remain. The season draws to its close.`,
        `Time thins. ${c.count} minutes.`,
      ]],
      noir: c => [[
        `${c.count} minutes. Then the lights go out on all of us.`,
        `${c.count} minutes left. Make them count, or don't.`,
      ]],
      machine: c => [[
        `${c.count} minutes remaining.`,
        `Time remaining: ${c.count} minutes.`,
      ]],
      hype: c => [[
        `${c.count} minutes left! Let's GO!`,
        `${c.count} minutes on the clock — pick it UP!`,
        `Only ${c.count} minutes! Everybody up!`,
      ]],
      savage: c => [[
        `${c.count} minutes. Move it along.`,
        `${c.count} minutes. Some of you should hurry.`,
        `${c.count} minutes left. Tick tock.`,
      ]],
      announcer: c => [[
        `${c.count} minutes remaining in this match!`,
        `We have ${c.count} minutes left on the clock!`,
        `${c.count} minutes to play — the pressure builds!`,
      ]],
      sarcastic: c => [[
        `${c.count} minutes left. No rush, obviously.`,
        `${c.count} minutes. Savour them.`,
        `Only ${c.count} minutes of this left.`,
      ]],
      smooth: c => [[
        `${c.count} minutes on the clock, ${term(c)}.`,
        `${c.count} minutes left. Keep it flowing.`,
        `We got ${c.count} minutes, ${term(c)}.`,
      ]],
    },
    fallback: c => [[
      `${c.count} minutes remaining in the game!`,
      `${c.count} minutes left.`,
    ]],
    clean: {
      farley: c => [[
        `${c.count} minutes! That's it! That's ALL we get!`,
        `${c.count} minutes, everybody! Make 'em count! Or don't! No pressure!`,
      ]],
      preacher: c => [[
        `${c.count} minutes! Do something with them!`,
        `${c.count} minutes left. That is not a lot.`,
      ]],
      nature: c => [[
        `${c.count} minutes remain. The season draws to its close.`,
        `Time thins. ${c.count} minutes.`,
      ]],
      noir: c => [[
        `${c.count} minutes. Then the lights go out on all of us.`,
        `${c.count} minutes left. Make them count, or don't.`,
      ]],
      machine: c => [[
        `${c.count} minutes remaining.`,
        `Time remaining: ${c.count} minutes.`,
      ]],
      default: c => [[`${c.count} minutes remaining.`, `${c.count} minutes left.`]],
      hype: c => [[`${c.count} minutes left! Let's go!`, `${c.count} minutes — pick it up!`]],
      savage: c => [[
        `${c.count} minutes. Move it along.`,
        `${c.count} minutes left. Tick tock.`,
      ]],
      announcer: c => [[
        `${c.count} minutes remaining in this match.`,
        `We have ${c.count} minutes left on the clock!`,
      ]],
      sarcastic: c => [[`${c.count} minutes left. No rush.`, `${c.count} minutes. Savour them.`]],
      smooth: c => [[
        `${c.count} minutes on the clock, ${term(c)}.`,
        `${c.count} minutes left. Keep it flowing.`,
      ]],
    },
    cleanFallback: c => [[`${c.count} minutes remaining.`, `${c.count} minutes left.`]],
  },

  // Not commentary: the match ending is a state change, the same call as a win.
  gameOver: {
    commentary: false,
    quiet: () => [[`Game over.`]],
    byPersonality: {
      farley: () => [[
        `THAT'S TIME! That's it! That's the whole thing!`,
        `Time! It's over! ...I need to sit down.`,
      ]],
      preacher: () => [[
        `That is TIME. It is over.`,
        `Clock's done. Everybody out.`,
      ]],
      nature: () => [[
        `And with that, the season ends.`,
        `Time. The table falls quiet once more.`,
      ]],
      noir: () => [[
        `Time's up. It always is, eventually.`,
        `That's the game. Nobody gets extra.`,
      ]],
      machine: () => [[
        `Time elapsed. Game terminated.`,
        `Clock: zero. Session complete.`,
      ]],
      hype: () => [[`TIME! That's the game!`, `THAT'S TIME! What a match!`, `Clock's done — that's the GAME!`]],
      savage: () => [[`Time. Game over.`, `Time. That's it.`, `Clock's out. Done.`]],
      announcer: () => [[
        `And that is time! The match is over!`,
        `Time is called! What a contest this has been!`,
        `The clock runs out — and that is your match!`,
      ]],
      sarcastic: () => [[
        `Time's up. Riveting stuff.`,
        `And time. What a journey that was.`,
        `Time. I'll treasure this.`,
      ]],
      smooth: c => [[
        `That's time, ${term(c)}. Game over.`,
        `Clock's done, ${term(c)}. That's the game.`,
        `And that's time. Good game, ${term(c)}.`,
      ]],
    },
    fallback: () => [[`Time is up! Game over!`, `That's time — game over.`]],
    clean: {
      farley: () => [[
        `THAT'S TIME! That's it! That's the whole thing!`,
        `Time! It's over! ...I need to sit down.`,
      ]],
      preacher: () => [[
        `That is TIME. It is over.`,
        `Clock's done. Everybody out.`,
      ]],
      nature: () => [[
        `And with that, the season ends.`,
        `Time. The table falls quiet once more.`,
      ]],
      noir: () => [[
        `Time's up. It always is, eventually.`,
        `That's the game. Nobody gets extra.`,
      ]],
      machine: () => [[
        `Time elapsed. Game terminated.`,
        `Clock: zero. Session complete.`,
      ]],
      default: () => [[`Time's up. Game over.`, `That's time — game over.`]],
      hype: () => [[`Time! That's the game!`, `THAT'S TIME! What a match!`]],
      savage: () => [[`Time. Game over.`, `Time. That's it.`, `Clock's out. Done.`]],
      announcer: () => [[
        `And that is time. The match is over.`,
        `Time is called! What a contest this has been!`,
      ]],
      sarcastic: () => [[`Time's up. Riveting stuff.`, `And time. What a journey that was.`]],
      smooth: c => [[
        `That's time, ${term(c)}. Game over.`,
        `Clock's done, ${term(c)}. That's the game.`,
      ]],
    },
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
export function linesFor(
  event: NarratorEvent,
  personality: NarratorPersonality,
  opts: { cleanMode: boolean; mode: NarratorMode },
  ctx: LineContext,
): string[][] {
  const def = EVENTS[event]
  if (!def) return []

  // Off means off. There is no event important enough to speak over it.
  if (opts.mode === 'off') return []

  if (opts.mode === 'names') {
    if (def.commentary) return []
    // Falls through to the full line only for an event with no quiet form written, which is
    // better than silence for something functional like who just won.
    if (def.quiet) return def.quiet(ctx as Parameters<Lines>[0])
  }

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
