export type DiceTheme =
  | 'default' | 'casino' | 'neon' | 'metallic' | 'wooden' | 'vintage'
  | 'deepsea' | 'oilslick' | 'aurora' | 'toxic'
  | 'magma' | 'flamingo' | 'candy' | 'synthwave' | 'nebula' | 'storm' | 'cyber' | 'coffee'
  | 'crystal' | 'fire'
  | 'rosegold' | 'arctic' | 'gold' | 'midnight' | 'lavender' | 'slate'
  | 'silver' | 'copper' | 'sapphire' | 'citrus' | 'sunset' | 'mint' | 'peach' | 'walnut'

export const GRADIENT_DIE_THEMES = new Set<DiceTheme>([
  'deepsea','oilslick','aurora','toxic',
  'magma','flamingo','candy','synthwave','nebula','storm','cyber','coffee',
  'crystal','fire',
  'rosegold','arctic','gold','midnight','lavender','slate',
  'silver','copper','sapphire','citrus','sunset','mint','peach','walnut',
])

/**
 * Face colour for the themes that are a flat colour rather than a gradient.
 *
 * These live here rather than only inside YahtzeeGamePage's dieFaceFill switch so a picker
 * can show what it is offering. Six themes previously all drew the same white swatch, which
 * is true of Casino and of nothing else — Neon is nearly black and Wooden is brown.
 *
 * `default` is absent on purpose: it tints with the current player's colour, so a caller has
 * to supply that rather than read a constant.
 */
export const DIE_SOLID_FACES: Record<string, string> = {
  casino:   '#ffffff',
  neon:     '#080808',
  metallic: '#888898',
  wooden:   '#a0742e',
  vintage:  '#f0e8d0',
}

export const DIE_GRADIENTS: Record<string, string> = {
  deepsea:   'linear-gradient(135deg, #001a33 0%, #006666 60%, #00aa88 100%)',
  oilslick:  'linear-gradient(135deg, #200040 0%, #001a4d 33%, #004040 66%, #001200 100%)',
  aurora:    'linear-gradient(135deg, #003322 0%, #00aa66 60%, #44ffcc 100%)',
  toxic:     'linear-gradient(135deg, #143300 0%, #44cc00 60%, #aaff00 100%)',
  magma:     'linear-gradient(135deg, #1a0500 0%, #8b2500 50%, #ff4500 100%)',
  flamingo:  'linear-gradient(135deg, #12000a 0%, #880044 50%, #ee4488 100%)',
  candy:     'linear-gradient(135deg, #220020 0%, #880055 50%, #cc00cc 100%)',
  synthwave: 'linear-gradient(135deg, #0d0020 0%, #5500bb 40%, #cc00ff 70%, #ff0066 100%)',
  nebula:    'linear-gradient(135deg, #0a0030 0%, #440099 50%, #9933dd 100%)',
  storm:     'linear-gradient(135deg, #050520 0%, #1a1a99 50%, #3355ff 100%)',
  cyber:     'linear-gradient(135deg, #001428 0%, #0088dd 60%, #00ffcc 100%)',
  coffee:    'linear-gradient(135deg, #1c0a00 0%, #4a2200 50%, #7a4010 100%)',
  crystal:   'linear-gradient(135deg, #0a1f3a 0%, #0066aa 50%, #44ccff 80%, #aaeeff 100%)',
  fire:      'linear-gradient(135deg, #1a0000 0%, #cc2200 35%, #ff6600 70%, #ffcc00 100%)',
  rosegold:  'linear-gradient(135deg, #2a0a12 0%, #7a2535 40%, #c07060 70%, #e8a888 100%)',
  arctic:    'linear-gradient(135deg, #d8f0ff 0%, #a0d4ff 30%, #68b8ff 65%, #3399ee 100%)',
  gold:      'linear-gradient(135deg, #150e00 0%, #604000 35%, #b87c00 65%, #f0c800 85%, #ffe066 100%)',
  midnight:  'linear-gradient(135deg, #000003 0%, #08002a 40%, #180055 70%, #2c0088 100%)',
  lavender:  'linear-gradient(135deg, #120018 0%, #440088 50%, #8844cc 78%, #cc88ff 100%)',
  slate:     'linear-gradient(135deg, #080810 0%, #181828 40%, #28324a 68%, #384860 100%)',
  silver:    'linear-gradient(135deg, #909090 0%, #d8d8d8 30%, #f4f4f4 55%, #c8c8c8 75%, #e8e8e8 100%)',
  copper:    'linear-gradient(135deg, #1a0800 0%, #7a3010 40%, #c06030 68%, #e09060 100%)',
  sapphire:  'linear-gradient(135deg, #000820 0%, #0033aa 45%, #1166ff 75%, #4499ff 100%)',
  citrus:    'linear-gradient(135deg, #1a1a00 0%, #888800 40%, #ddcc00 70%, #ffee00 100%)',
  sunset:    'linear-gradient(135deg, #0a0015 0%, #660033 30%, #cc3300 60%, #ff8800 85%, #ffcc44 100%)',
  mint:      'linear-gradient(135deg, #001a10 0%, #008855 45%, #44ddaa 75%, #aaffd8 100%)',
  peach:     'linear-gradient(135deg, #1a0800 0%, #883310 40%, #dd7744 70%, #ffbb88 100%)',
  walnut:    'linear-gradient(135deg, #0a0400 0%, #3d1a00 35%, #6b3a10 65%, #9a6030 100%)',
}

export type Player = {
  id: string
  name: string
  /**
   * What to render right now: an emoji, a data URL while signed out, or a signed URL from
   * Storage. A signed URL expires, so this is display state — `avatarPath` is the durable
   * reference to the actual image.
   */
  avatarUrl: string | null
  /** Path in the private avatars bucket, once the photo has been uploaded. */
  avatarPath?: string | null
  color: string
  playerBackground: string | null
  playerBackgroundSize: 'cover' | 'contain' | null
  playerBackgroundPosition: 'top' | 'center' | 'bottom' | null
  playerBackgroundFill: 'black' | 'blur' | null
  /**
   * Per-screen overrides for the two places a player's background is actually seen.
   *
   * `playerBackground` above stays the default and is what both fall back to, so setting
   * only it behaves exactly as before. These exist because the walk-up screen and the throw
   * screen are read at different distances and for different reasons — one is "you are up
   * next", the other is the board you are aiming at — and one image rarely suits both.
   *
   * No size or position siblings on purpose: the ones on playerBackground have never been
   * written as anything but null, so adding six more dead columns would be inventing
   * settings nothing sets.
   */
  throwBackground: string | null
  walkupBackground: string | null
  targetLabelColor: string | null
  cricketTargetDisplay: 'show' | 'hide' | null  // null = use game setting
  diceTheme: DiceTheme | null  // null = same as 'default'
  pinned: boolean
  wins: number
  gamesPlayed: number
  createdAt: string
  /** Last local mutation, ISO. Mirrors the DB's updated_at, which was already written on
   *  every upsert but never read back — leaving sync with no basis to compare versions. */
  updatedAt?: string | null
}

export const DICE_THEMES: { value: DiceTheme; label: string; icon: string; group: string }[] = [
  // Classics & Neutrals
  { value: 'casino',    label: 'Casino',    icon: '🎰', group: '' },
  { value: 'vintage',   label: 'Vintage',   icon: '📜', group: '' },
  { value: 'silver',    label: 'Silver',    icon: '🪙', group: '' },
  { value: 'slate',     label: 'Slate',     icon: '🔲', group: '' },
  { value: 'coffee',    label: 'Coffee',    icon: '☕', group: '' },
  { value: 'walnut',    label: 'Walnut',    icon: '🪵', group: '' },
  // Pastels & Soft
  { value: 'arctic',    label: 'Arctic',    icon: '🧊', group: '' },
  { value: 'rosegold',  label: 'Rose Gold', icon: '🌸', group: '' },
  { value: 'lavender',  label: 'Lavender',  icon: '💜', group: '' },
  { value: 'candy',     label: 'Candy',     icon: '🍬', group: '' },
  { value: 'peach',     label: 'Peach',     icon: '🍑', group: '' },
  // Darks & Purples
  { value: 'midnight',  label: 'Midnight',  icon: '🌑', group: '' },
  { value: 'nebula',    label: 'Nebula',    icon: '🔮', group: '' },
  { value: 'synthwave', label: 'Synthwave', icon: '🌆', group: '' },
  { value: 'oilslick',  label: 'Oil Slick', icon: '🫧', group: '' },
  // Blues & Greens
  { value: 'sapphire',  label: 'Sapphire',  icon: '💙', group: '' },
  { value: 'deepsea',   label: 'Deep Sea',  icon: '🌊', group: '' },
  { value: 'crystal',   label: 'Crystal',   icon: '💎', group: '' },
  { value: 'storm',     label: 'Storm',     icon: '⛈️', group: '' },
  { value: 'cyber',     label: 'Cyber',     icon: '🤖', group: '' },
  { value: 'mint',      label: 'Mint',      icon: '🌱', group: '' },
  { value: 'aurora',    label: 'Aurora',    icon: '🌿', group: '' },
  { value: 'toxic',     label: 'Toxic',     icon: '☢️', group: '' },
  { value: 'citrus',    label: 'Citrus',    icon: '🍋', group: '' },
  // Reds & Warm
  { value: 'magma',     label: 'Magma',     icon: '🌋', group: '' },
  { value: 'fire',      label: 'Fire',      icon: '🔥', group: '' },
  { value: 'sunset',    label: 'Sunset',    icon: '🌅', group: '' },
  { value: 'flamingo',  label: 'Flamingo',  icon: '🦩', group: '' },
  { value: 'copper',    label: 'Copper',    icon: '🔶', group: '' },
  { value: 'gold',      label: 'Gold',      icon: '🥇', group: '' },
  // Special
  { value: 'neon',      label: 'Neon',      icon: '⚡', group: '' },
  { value: 'metallic',  label: 'Metallic',  icon: '🔩', group: '' },
  { value: 'wooden',    label: 'Wooden',    icon: '🪵', group: '' },
  { value: 'default',   label: 'Default',   icon: '🎲', group: '' },
]

export const TARGET_LABEL_COLORS = [
  { label: 'Auto',   value: null },
  { label: 'Black',  value: '#000000' },
  { label: 'White',  value: '#ffffff' },
  { label: 'Pink',   value: '#ff2d78' },
  { label: 'Red',    value: '#ef4444' },
  { label: 'Orange', value: '#ff7700' },
  { label: 'Yellow', value: '#ffdd00' },
  { label: 'Green',  value: '#00ff88' },
  { label: 'Cyan',   value: '#00d4ff' },
  { label: 'Blue',   value: '#3b82f6' },
  { label: 'Purple', value: '#a855f7' },
] as const


export const PLAYER_THEMES = [
  { label: 'None',         value: null },
  { label: 'Obsidian',     value: 'linear-gradient(160deg, #050505 0%, #111111 40%, #222222 75%, #333344 100%)' },
  { label: 'Titanium',     value: 'linear-gradient(160deg, #0a0c10 0%, #1e2430 40%, #3a4455 70%, #8090a8 100%)' },
  { label: 'Deep Sea',     value: 'linear-gradient(160deg, #000508 0%, #001a33 40%, #006666 75%, #00ccaa 100%)' },
  { label: 'Oil Slick',    value: 'linear-gradient(135deg, #08000f 0%, #3d0066 22%, #001a4d 44%, #004040 66%, #00440a 88%, #0f0f00 100%)' },
  { label: 'Aurora',       value: 'linear-gradient(160deg, #000d08 0%, #003322 35%, #00aa66 60%, #44ffcc 80%, #88aaff 100%)' },
  { label: 'Emerald',      value: 'linear-gradient(160deg, #000d04 0%, #003d15 45%, #00a550 80%, #00ff88 100%)' },
  { label: 'Toxic',        value: 'linear-gradient(160deg, #040800 0%, #143300 40%, #44cc00 72%, #ccff00 100%)' },
  // Reds / Oranges
  { label: 'Blood',        value: 'linear-gradient(160deg, #0a0000 0%, #3d0000 50%, #dc143c 100%)' },
  { label: 'Magma',        value: 'linear-gradient(160deg, #1a0500 0%, #8b2500 40%, #ff4500 75%, #ffa500 100%)' },
  { label: 'Coral',        value: 'linear-gradient(160deg, #0f0500 0%, #4a1500 40%, #cc4422 72%, #ff7755 100%)' },
  // Pinks
  { label: 'Flamingo',     value: 'linear-gradient(160deg, #12000a 0%, #4a0025 38%, #cc2266 65%, #ff5599 82%, #ff88bb 100%)' },
  // Purples
  { label: 'Candy',        value: 'linear-gradient(160deg, #1a0014 0%, #660055 35%, #cc00cc 65%, #ff66ff 100%)' },
  { label: 'Synthwave',    value: 'linear-gradient(160deg, #0d0020 0%, #330066 35%, #cc00ff 65%, #ff0066 100%)' },
  { label: 'Nebula',       value: 'linear-gradient(160deg, #020008 0%, #0a0030 35%, #3a0088 65%, #8833cc 82%, #cc66ff 100%)' },
  // Blues
  { label: 'Storm',        value: 'linear-gradient(160deg, #050510 0%, #0a0a40 40%, #1a1aaa 75%, #4466ff 100%)' },
  { label: 'Cyber',        value: 'linear-gradient(160deg, #000d14 0%, #001428 40%, #00aaff 70%, #00ffcc 100%)' },
  // Dark / Neutral
  { label: 'Coffee',       value: 'linear-gradient(160deg, #050200 0%, #1c0a00 40%, #4a2200 70%, #8b5a2b 100%)' },
] as const

/**
 * Narrator voice. Declared here rather than inside the settings store so the line module
 * and anything else can reference it — it was previously a local type, which is part of
 * why the narrator lines ended up duplicated across views instead of shared.
 */
export type NarratorPersonality =
  | 'default' | 'hype' | 'savage' | 'announcer' | 'sarcastic' | 'smooth'

export const NARRATOR_PERSONALITIES: NarratorPersonality[] = [
  'default', 'hype', 'savage', 'announcer', 'sarcastic', 'smooth',
]

export type GameType =
  | 'cricket'
  | 'cutThroat'
  | 'speedCricket'
  | '301'
  | '501'
  | '701'
  | '1001'
  | 'aroundTheClock'
  | 'killer'
  | 'halveit'
  | 'baseball'
  | 'horse'
  | 'suddenDeath'
  | 'farkle'
  | 'shipCaptainCrew'
  | 'pig'
  | 'spades'
  | 'blackjack'

export const GAME_TYPE_LABELS: Record<GameType, string> = {
  cricket: 'Cricket',
  cutThroat: 'Cut Throat Cricket',
  speedCricket: 'Speed Cricket',
  aroundTheClock: 'Around the Clock',
  killer: 'Killer',
  halveit: 'Halve-It',
  baseball: 'Baseball',
  horse: 'Horse',
  suddenDeath: 'Sudden Death',
  farkle: 'Farkle',
  shipCaptainCrew: 'Ship Captain Crew',
  pig: 'Pig',
  spades: 'Spades',
  blackjack: 'Blackjack',
  '301': '301',
  '501': '501',
  '701': '701',
  '1001': '1001',
}

export const GAME_TYPE_ORDER: GameType[] = [
  'cricket', 'speedCricket', 'aroundTheClock', 'killer', 'horse', '301', '501', '701', '1001',
]

export const CRICKET_TARGETS = [20, 19, 18, 17, 16, 15, 'bull'] as const
export type CricketTarget = (typeof CRICKET_TARGETS)[number]

export type CricketMarks = Record<CricketTarget, number> // 0-3
export type CricketPlayerScore = {
  marks: CricketMarks
  points: number
  wildMarks?: Record<string, number>  // wild mode: marks per number (keyed by String(target))
}

export type OhOnePlayerScore = {
  remaining: number
  history: number[]
}

export type SimplePlayerScore = {
  total: number
  history: number[]
  completedNums?: number[]  // ATC any-order mode: which numbers (1-20) are done
}

export type KillerPlayerScore = {
  /** The number this player owns, 1-20 and unique across the table. */
  number: number
  lives: number
  /** Until this is true, hits on other numbers do nothing. */
  isKiller: boolean
  /** Lives taken by this player per turn, for the turn readout. */
  history: number[]
}

export type HorsePlayerScore = {
  letters: number   // 0–5; at 5 the player is eliminated
  history: number[]
}

export type SuddenDeathPlayerScore = {
  total: number
  history: number[]
}

export type Bobs27PlayerScore = {
  score: number
  history: { hits: number; delta: number }[]
  busted: boolean
}

export const HORSE_LETTERS = ['H', 'O', 'R', 'S', 'E'] as const

export type PlayerScore =
  | { kind: 'cricket'; data: CricketPlayerScore }
  | { kind: 'ohOne'; data: OhOnePlayerScore }
  | { kind: 'simple'; data: SimplePlayerScore }
  | { kind: 'horse'; data: HorsePlayerScore }
  | { kind: 'killer'; data: KillerPlayerScore }
  | { kind: 'suddenDeath'; data: SuddenDeathPlayerScore }
  | { kind: 'bobs27'; data: Bobs27PlayerScore }

export type ActiveGame = {
  id: string
  gameType: GameType
  timerDuration: number
  throwTimerDuration: number
  closedTargetDisplay: 'show' | 'hide'
  bustEliminates: boolean
  cricketPlayToCompletion: boolean
  cricketHatTrickBonus: boolean
  cricketRoundLimit: number | null
  gameThemeSize: 'cover' | 'contain' | null
  gameThemePosition: 'top' | 'center' | 'bottom' | null
  gameThemeFill: 'black' | 'blur' | null
  bonusTurnActive: boolean
  /**
   * Increments every time a turn begins. Entry components key off this to get a clean
   * instance per turn — player and round alone do not identify a turn, because a hat-trick
   * bonus sends the same player again in the same round.
   */
  turnSeq: number
  skipWalkup: boolean
  cricketFinishOrder: string[]
  gameTheme: string | null
  players: Player[]
  currentPlayerIndex: number
  round: number
  scores: Record<string, PlayerScore>
  status: 'playing' | 'between_turns' | 'finished'
  winnerId: string | null
  startedAt: string
  gameDuration: number | null   // minutes, null = no game timer
  gameStartedAt: number | null  // Date.now() timestamp when game was created
  horseSetterIndex: number      // index of the current setter in HORSE
  killerLives: number           // starting lives per player in KILLER
  killerRequireDouble: boolean  // KILLER house rule: only doubles count
  wildEnabled: boolean
  wildTargets: number[]          // current 6 non-bull numbers in wild cricket
  wildLockedNums: number[]       // numbers locked by at least one mark (never reshuffled)
}

export const PLAYER_COLORS = [
  { label: 'Pink',        value: '#ff2d78' },
  { label: 'Red',         value: '#ef4444' },
  { label: 'Orange',      value: '#f97316' },
  { label: 'Amber',       value: '#f59e0b' },
  { label: 'Gold',        value: '#eab308' },
  { label: 'Lime',        value: '#84cc16' },
  { label: 'Green',       value: '#22c55e' },
  { label: 'Emerald',     value: '#10b981' },
  { label: 'Teal',        value: '#14b8a6' },
  { label: 'Cyan',        value: '#06b6d4' },
  { label: 'Blue',        value: '#3b82f6' },
  { label: 'Indigo',      value: '#6366f1' },
  { label: 'Purple',      value: '#a855f7' },
  { label: 'Violet',      value: '#bf5fff' },
  { label: 'Fuchsia',     value: '#d946ef' },
  { label: 'Rose',        value: '#f43f5e' },
  { label: 'White',       value: '#f0f0f0' },
  { label: 'Silver',      value: '#94a3b8' },
  { label: 'Steel',       value: '#7090a8' },
  { label: 'Toxic',       value: '#aaff00' },
  { label: 'Coffee',      value: '#9a5c2e' },
] as const

export const PRESET_AVATARS = [
  '🦖', '🐨', '🐼', '🦍', '🦏', '🦛',
  '🐸', '🦉',
  '🦨', '🫎',
  '👹', '🧚',
  '💋', '🌹', '🌺', '🌮', '🍄', '🔫', '💎', '🔮', '🪬', '☠️', '🏴‍☠️', '⚔️', '☃️', '💸', '☣️', '🫠', '🥸', '🇧🇦', '🇲🇽',
]
