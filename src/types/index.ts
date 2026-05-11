export type Player = {
  id: string
  name: string
  avatarUrl: string | null
  color: string
  playerBackground: string | null
  targetLabelColor: string | null
  cricketTargetDisplay: 'show' | 'hide' | 'fade' | 'strike' | null  // null = use game setting
  pinned: boolean
  wins: number
  gamesPlayed: number
  createdAt: string
}

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
  { label: 'Graphite',     value: 'linear-gradient(160deg, #0a0a08 0%, #1a1a16 40%, #2e2e28 70%, #444440 100%)' },
  { label: 'Gunmetal',     value: 'linear-gradient(160deg, #050608 0%, #0e1018 40%, #1c2030 70%, #2a3040 100%)' },
  { label: 'Titanium',     value: 'linear-gradient(160deg, #0a0c10 0%, #1e2430 40%, #3a4455 70%, #8090a8 100%)' },
  { label: 'Chrome',       value: 'linear-gradient(160deg, #0c0c0e 0%, #242428 40%, #484850 70%, #a0a0b0 100%)' },
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
  { label: 'Rose',         value: 'linear-gradient(160deg, #140008 0%, #550022 40%, #cc0055 70%, #ff66aa 100%)' },
  { label: 'Flamingo',     value: 'linear-gradient(160deg, #12000a 0%, #4a0025 38%, #cc2266 65%, #ff5599 82%, #ff88bb 100%)' },
  { label: 'Blush',        value: 'linear-gradient(160deg, #0f0008 0%, #3d0022 40%, #882255 72%, #cc6699 88%, #ffaabb 100%)' },
  { label: 'Neon Rose',    value: 'linear-gradient(160deg, #0a0008 0%, #330022 40%, #880055 68%, #ff0088 85%, #ff44cc 100%)' },
  // Purples
  { label: 'Candy',        value: 'linear-gradient(160deg, #1a0014 0%, #660055 35%, #cc00cc 65%, #ff66ff 100%)' },
  { label: 'Synthwave',    value: 'linear-gradient(160deg, #0d0020 0%, #330066 35%, #cc00ff 65%, #ff0066 100%)' },
  { label: 'Galaxy',       value: 'linear-gradient(160deg, #05001a 0%, #2d0066 50%, #bf5fff 100%)' },
  { label: 'Nebula',       value: 'linear-gradient(160deg, #020008 0%, #0a0030 35%, #3a0088 65%, #8833cc 82%, #cc66ff 100%)' },
  { label: 'Astral',       value: 'linear-gradient(160deg, #030008 0%, #0d0040 35%, #2200aa 65%, #5533ff 82%, #88aaff 100%)' },
  // Blues
  { label: 'Storm',        value: 'linear-gradient(160deg, #050510 0%, #0a0a40 40%, #1a1aaa 75%, #4466ff 100%)' },
  { label: 'Cyber',        value: 'linear-gradient(160deg, #000d14 0%, #001428 40%, #00aaff 70%, #00ffcc 100%)' },
  // Dark / Neutral
  { label: 'Coffee',       value: 'linear-gradient(160deg, #050200 0%, #1c0a00 40%, #4a2200 70%, #8b5a2b 100%)' },
  { label: 'Bronze',       value: 'linear-gradient(160deg, #100800 0%, #4a2800 45%, #cd7f32 80%, #e8a050 100%)' },
] as const

export type GameType =
  | 'cricket'
  | 'cutThroat'
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

export const GAME_TYPE_LABELS: Record<GameType, string> = {
  cricket: 'Cricket',
  cutThroat: 'Cut Throat Cricket',
  '301': '301',
  '501': '501',
  '701': '701',
  '1001': '1001',
  aroundTheClock: 'Around the Clock',
  killer: 'Killer',
  halveit: 'Halve-It',
  baseball: 'Baseball',
  horse: 'Horse',
  suddenDeath: 'Sudden Death',
}

export const CRICKET_TARGETS = [20, 19, 18, 17, 16, 15, 'bull'] as const
export type CricketTarget = (typeof CRICKET_TARGETS)[number]

export type CricketMarks = Record<CricketTarget, number> // 0-3
export type CricketPlayerScore = {
  marks: CricketMarks
  points: number
}

export type OhOnePlayerScore = {
  remaining: number
  history: number[]
}

export type SimplePlayerScore = {
  total: number
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

export const HORSE_LETTERS = ['H', 'O', 'R', 'S', 'E'] as const

export type PlayerScore =
  | { kind: 'cricket'; data: CricketPlayerScore }
  | { kind: 'ohOne'; data: OhOnePlayerScore }
  | { kind: 'simple'; data: SimplePlayerScore }
  | { kind: 'horse'; data: HorsePlayerScore }
  | { kind: 'suddenDeath'; data: SuddenDeathPlayerScore }

export type ActiveGame = {
  id: string
  gameType: GameType
  timerDuration: number
  throwTimerDuration: number
  closedTargetDisplay: 'show' | 'hide' | 'fade' | 'strike'
  bustEliminates: boolean
  gameTheme: string | null
  players: Player[]
  currentPlayerIndex: number
  round: number
  scores: Record<string, PlayerScore>
  status: 'playing' | 'between_turns' | 'finished'
  winnerId: string | null
  startedAt: string
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
  '🦁', '🐯', '🐻', '🐼', '🐻‍❄️', '🐨', '🦊', '🦍', '🦏', '🦛', '🦣', '🦬', '🫏', '🦈', '🐬', '🐡',
  '🐸', '🦉', '🐓',
  '🦨', '🫎', '🦖', '🦕',
  '👹', '👺', '🧚',
  '🫠', '🥸', '💋', '🔮', '🪬', '🌹', '🪻', '🪷', '🌺', '🌸', '🌮', '🍄', '🔫', '💎', '☠️', '🏴‍☠️', '⚔️', '☃️', '💸', '🚩', '☣️', '🇧🇦', '🇲🇽', '✡️',
]
