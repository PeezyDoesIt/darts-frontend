/**
 * Never Have I Ever — the deck.
 *
 * Three tiers, and they stack: turning on Late gives you Bar + Late. `bar` is the default and
 * the only one on at the start, so a card from a hotter tier cannot appear in the wrong room
 * by accident — the room opts in, rather than opting out after something has already been read
 * aloud. That is the whole reason the tiers exist rather than one shuffled pile.
 *
 * A prompt is stored without its "Never have I ever" opener; the screen supplies that. It keeps
 * the file readable, keeps the opener consistent, and means a house that wants to reword the
 * opener changes one string rather than a hundred and fifty.
 *
 * Ids are stable and never reused. Hiding a card writes its id to the player's own list, so a
 * renumbering would silently un-hide things people deliberately got rid of.
 */

export type NhieTier = 'bar' | 'late' | 'filthy'

export interface NhiePrompt {
  id: string
  tier: NhieTier
  text: string
}

export const TIER_LABELS: Record<NhieTier, string> = {
  bar: 'BAR',
  late: 'LATE',
  filthy: 'FILTHY',
}

export const TIER_BLURBS: Record<NhieTier, string> = {
  bar: 'Embarrassing, funny, drunk-you. Safe in any room.',
  late: 'Exes, regrets, bad decisions. Warmer.',
  filthy: 'The hot one. Off by default.',
}

/** Tier order, coldest first. The picker and the stacking logic both read this. */
export const TIERS: NhieTier[] = ['bar', 'late', 'filthy']

export const PROMPTS: NhiePrompt[] = [
  // ── BAR ──────────────────────────────────────────────────────────────────────────────────
  { id: 'b01', tier: 'bar', text: 'been thrown out of a bar' },
  { id: 'b02', tier: 'bar', text: 'fallen asleep somewhere I definitely should not have' },
  { id: 'b03', tier: 'bar', text: 'texted the wrong person something I could not take back' },
  { id: 'b04', tier: 'bar', text: 'pretended to know a song I had never heard' },
  { id: 'b05', tier: 'bar', text: 'lied about my age to get in somewhere' },
  { id: 'b06', tier: 'bar', text: 'thrown up in a moving vehicle' },
  { id: 'b07', tier: 'bar', text: 'walked into a glass door in public' },
  { id: 'b08', tier: 'bar', text: 'called a teacher or a boss "mum" or "dad"' },
  { id: 'b09', tier: 'bar', text: 'gone to work still drunk' },
  { id: 'b10', tier: 'bar', text: 'sung karaoke completely sober' },
  { id: 'b11', tier: 'bar', text: 'lost a phone on a night out and never got it back' },
  { id: 'b12', tier: 'bar', text: 'been in a group chat I was clearly added to by accident' },
  { id: 'b13', tier: 'bar', text: 'cried at an advert' },
  { id: 'b14', tier: 'bar', text: 'pretended to be on the phone to avoid someone' },
  { id: 'b15', tier: 'bar', text: 'eaten food off the floor and told nobody' },
  { id: 'b16', tier: 'bar', text: 'gone a full week without doing laundry and improvised' },
  { id: 'b17', tier: 'bar', text: 'started a rumour that turned out to be true' },
  { id: 'b18', tier: 'bar', text: 'been the reason a group left early' },
  { id: 'b19', tier: 'bar', text: 'googled my own name to see what came up' },
  { id: 'b20', tier: 'bar', text: 'blamed a fart on a dog' },
  { id: 'b21', tier: 'bar', text: 'ghosted a friend rather than have one awkward conversation' },
  { id: 'b22', tier: 'bar', text: 'pretended to have read a book I have not read' },
  { id: 'b23', tier: 'bar', text: 'taken something from a hotel that was not free' },
  { id: 'b24', tier: 'bar', text: 'been recognised somewhere I did not want to be recognised' },
  { id: 'b25', tier: 'bar', text: 'lost an argument and kept arguing anyway' },
  { id: 'b26', tier: 'bar', text: 'sent a voice note I immediately regretted' },
  { id: 'b27', tier: 'bar', text: 'been on a night out that cost more than my rent that week' },
  { id: 'b28', tier: 'bar', text: 'faked an illness to get out of something' },
  { id: 'b29', tier: 'bar', text: 'forgotten someone’s name mid-introduction' },
  { id: 'b30', tier: 'bar', text: 'genuinely believed I could win a fight I could not win' },
  { id: 'b31', tier: 'bar', text: 'sworn in front of someone’s grandparent' },
  { id: 'b32', tier: 'bar', text: 'been the last one awake and gone through someone’s kitchen' },
  { id: 'b33', tier: 'bar', text: 'told a taxi driver my entire life story' },
  { id: 'b34', tier: 'bar', text: 'broken something at a party and said nothing' },
  { id: 'b35', tier: 'bar', text: 'been in a photo I have asked someone to delete' },
  { id: 'b36', tier: 'bar', text: 'pretended to like a gift I hated' },
  { id: 'b37', tier: 'bar', text: 'gone to a party where I knew nobody and stayed anyway' },
  { id: 'b38', tier: 'bar', text: 'had a haircut so bad I wore a hat for a week' },
  { id: 'b39', tier: 'bar', text: 'lied on a CV' },
  { id: 'b40', tier: 'bar', text: 'been beaten at a game by a child' },
  { id: 'b41', tier: 'bar', text: 'eaten an entire takeaway meant for two' },
  { id: 'b42', tier: 'bar', text: 'been asked to leave a shop' },
  { id: 'b43', tier: 'bar', text: 'made a scene and then had to walk past those people again' },
  { id: 'b44', tier: 'bar', text: 'used someone else’s streaming account without asking' },
  { id: 'b45', tier: 'bar', text: 'been so hungover I considered going to a hospital' },
  { id: 'b46', tier: 'bar', text: 'kept a library book for over a year' },
  { id: 'b47', tier: 'bar', text: 'argued passionately about something I knew nothing about' },
  { id: 'b48', tier: 'bar', text: 'fallen over in front of a queue of people' },
  { id: 'b49', tier: 'bar', text: 'left a party without saying goodbye to anyone' },
  { id: 'b50', tier: 'bar', text: 'been the person everyone else had to look after' },

  // ── LATE ─────────────────────────────────────────────────────────────────────────────────
  { id: 'l01', tier: 'late', text: 'kissed someone whose name I did not know' },
  { id: 'l02', tier: 'late', text: 'gone back to an ex knowing exactly how it would end' },
  { id: 'l03', tier: 'late', text: 'been someone’s worst decision' },
  { id: 'l04', tier: 'late', text: 'checked an ex’s profile in the last month' },
  { id: 'l05', tier: 'late', text: 'kissed someone in this room' },
  { id: 'l06', tier: 'late', text: 'lied about why a relationship ended' },
  { id: 'l07', tier: 'late', text: 'had a crush on a friend’s partner' },
  { id: 'l08', tier: 'late', text: 'stayed in something months longer than I wanted to' },
  { id: 'l09', tier: 'late', text: 'been dumped somewhere public' },
  { id: 'l10', tier: 'late', text: 'sent a message at 3am I would not have sent at 3pm' },
  { id: 'l11', tier: 'late', text: 'dated two people close enough together to be awkward' },
  { id: 'l12', tier: 'late', text: 'told someone I loved them and not meant it' },
  { id: 'l13', tier: 'late', text: 'been told I was a rebound' },
  { id: 'l14', tier: 'late', text: 'gone on a date purely for the free meal' },
  { id: 'l15', tier: 'late', text: 'kept someone’s hoodie on purpose' },
  { id: 'l16', tier: 'late', text: 'pretended a night out was casual when it absolutely was not' },
  { id: 'l17', tier: 'late', text: 'flirted my way out of trouble' },
  { id: 'l18', tier: 'late', text: 'had a situationship I could not explain to my friends' },
  { id: 'l19', tier: 'late', text: 'said "we should keep in touch" and meant the opposite' },
  { id: 'l20', tier: 'late', text: 'been jealous of someone I had no right to be jealous of' },
  { id: 'l21', tier: 'late', text: 'left a date early with a fake excuse' },
  { id: 'l22', tier: 'late', text: 'been in love with someone who had no idea' },
  { id: 'l23', tier: 'late', text: 'gone through a partner’s phone' },
  { id: 'l24', tier: 'late', text: 'kissed someone to make somebody else jealous' },
  { id: 'l25', tier: 'late', text: 'lied about how many people I have been with' },
  { id: 'l26', tier: 'late', text: 'had a one-night thing turn into something real' },
  { id: 'l27', tier: 'late', text: 'been the other person and known it' },
  { id: 'l28', tier: 'late', text: 'still have photos of an ex on my phone right now' },
  { id: 'l29', tier: 'late', text: 'sent a message and immediately deleted the app' },
  { id: 'l30', tier: 'late', text: 'been caught looking' },
  { id: 'l31', tier: 'late', text: 'agreed to a second date I had no intention of going on' },
  { id: 'l32', tier: 'late', text: 'stayed friends with an ex purely out of curiosity' },
  { id: 'l33', tier: 'late', text: 'had a type so obvious my friends can name it' },
  { id: 'l34', tier: 'late', text: 'been rejected and asked why' },
  { id: 'l35', tier: 'late', text: 'kissed someone on a dare' },
  { id: 'l36', tier: 'late', text: 'fancied someone entirely because of how they looked in a photo' },
  { id: 'l37', tier: 'late', text: 'let a friendship die because I wanted more' },
  { id: 'l38', tier: 'late', text: 'lied to a partner about where I had been' },
  { id: 'l39', tier: 'late', text: 'been someone’s first' },
  { id: 'l40', tier: 'late', text: 'said yes to something I did not want, to avoid the conversation' },
  { id: 'l41', tier: 'late', text: 'rehearsed a text before sending it' },
  { id: 'l42', tier: 'late', text: 'been in a relationship nobody else approved of' },
  { id: 'l43', tier: 'late', text: 'kept a secret from a partner that I still keep' },
  { id: 'l44', tier: 'late', text: 'had a crush on someone here and never said' },
  { id: 'l45', tier: 'late', text: 'ended things over a message' },
  { id: 'l46', tier: 'late', text: 'gone home with someone because it was easier than going home alone' },
  { id: 'l47', tier: 'late', text: 'been told I was too much' },
  { id: 'l48', tier: 'late', text: 'been told I was not enough' },
  { id: 'l49', tier: 'late', text: 'looked up someone I had one conversation with' },
  { id: 'l50', tier: 'late', text: 'wanted to text someone tonight and not done it yet' },

  // ── FILTHY ───────────────────────────────────────────────────────────────────────────────
  { id: 'f01', tier: 'filthy', text: 'had sex somewhere I could have been caught' },
  { id: 'f02', tier: 'filthy', text: 'faked it' },
  { id: 'f03', tier: 'filthy', text: 'slept with someone in this room' },
  { id: 'f04', tier: 'filthy', text: 'been caught in the act' },
  { id: 'f05', tier: 'filthy', text: 'had a threesome' },
  { id: 'f06', tier: 'filthy', text: 'been turned down mid-way' },
  { id: 'f07', tier: 'filthy', text: 'sent a photo I would not want shown to this table' },
  { id: 'f08', tier: 'filthy', text: 'had sex in a place I still cannot walk past' },
  { id: 'f09', tier: 'filthy', text: 'slept with someone whose name I got wrong' },
  { id: 'f10', tier: 'filthy', text: 'been the loudest neighbour on the street' },
  { id: 'f11', tier: 'filthy', text: 'used a safe word' },
  { id: 'f12', tier: 'filthy', text: 'been tied up' },
  { id: 'f13', tier: 'filthy', text: 'done it in a car park' },
  { id: 'f14', tier: 'filthy', text: 'lied about finishing' },
  { id: 'f15', tier: 'filthy', text: 'slept with a friend and never told the group' },
  { id: 'f16', tier: 'filthy', text: 'hooked up with someone at a wedding' },
  { id: 'f17', tier: 'filthy', text: 'had a hookup interrupted by a phone call I answered' },
  { id: 'f18', tier: 'filthy', text: 'been someone’s secret' },
  { id: 'f19', tier: 'filthy', text: 'had sex on a first date and no regrets' },
  { id: 'f20', tier: 'filthy', text: 'been walked in on by someone related to me' },
  { id: 'f21', tier: 'filthy', text: 'kept a toy somewhere a guest could find it' },
  { id: 'f22', tier: 'filthy', text: 'agreed to something in bed I had absolutely no idea about' },
  { id: 'f23', tier: 'filthy', text: 'had a hookup I have never told a single person about' },
  { id: 'f24', tier: 'filthy', text: 'been asked to leave straight afterwards' },
  { id: 'f25', tier: 'filthy', text: 'done it somewhere with a lock I did not trust' },
  { id: 'f26', tier: 'filthy', text: 'slept with someone to get back at somebody else' },
  { id: 'f27', tier: 'filthy', text: 'made a noise I still think about' },
  { id: 'f28', tier: 'filthy', text: 'had a hookup ruined by laughing' },
  { id: 'f29', tier: 'filthy', text: 'been someone’s worst ever' },
  { id: 'f30', tier: 'filthy', text: 'been told I was someone’s best ever' },
  { id: 'f31', tier: 'filthy', text: 'sexted at work' },
  { id: 'f32', tier: 'filthy', text: 'had a fantasy about someone at this table' },
  { id: 'f33', tier: 'filthy', text: 'kept someone around purely for the sex' },
  { id: 'f34', tier: 'filthy', text: 'been kept around purely for the sex' },
  { id: 'f35', tier: 'filthy', text: 'done it in a room with other people in it' },
  { id: 'f36', tier: 'filthy', text: 'lied about being into something to keep someone happy' },
  { id: 'f37', tier: 'filthy', text: 'left mid-hookup and not come back' },
  { id: 'f38', tier: 'filthy', text: 'had a scar or a bruise I had to explain badly' },
  { id: 'f39', tier: 'filthy', text: 'been recorded' },
  { id: 'f40', tier: 'filthy', text: 'hooked up with a colleague' },
  { id: 'f41', tier: 'filthy', text: 'had sex on a holiday I would not have had at home' },
  { id: 'f42', tier: 'filthy', text: 'slept with two people in one day' },
  { id: 'f43', tier: 'filthy', text: 'been the reason someone had to change their sheets urgently' },
  { id: 'f44', tier: 'filthy', text: 'had a dry spell longer than a year' },
  { id: 'f45', tier: 'filthy', text: 'been propositioned by someone spectacularly out of my league' },
  { id: 'f46', tier: 'filthy', text: 'said the wrong name' },
  { id: 'f47', tier: 'filthy', text: 'had a hookup based entirely on one photograph' },
  { id: 'f48', tier: 'filthy', text: 'done something on a dare that stopped being a dare' },
  { id: 'f49', tier: 'filthy', text: 'kept the receipts' },
  { id: 'f50', tier: 'filthy', text: 'thought about someone else the entire time' },
]

/** Every prompt allowed by a set of enabled tiers, minus anything this device has hidden. */
export function deckFor(tiers: Set<NhieTier>, hidden: Set<string>): NhiePrompt[] {
  return PROMPTS.filter(p => tiers.has(p.tier) && !hidden.has(p.id))
}
