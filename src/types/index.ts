export type Player = {
  id: string
  name: string
  avatarUrl: string | null
  color: string
  playerBackground: string | null
  wins: number
  gamesPlayed: number
  createdAt: string
}

export const PLAYER_THEMES = [
  { label: 'None',       value: null },
  // Reds
  { label: 'Blood',      value: 'linear-gradient(160deg, #0a0000 0%, #3d0000 50%, #dc143c 100%)' },
  { label: 'Fire',       value: 'linear-gradient(160deg, #1a0000 0%, #8b0000 50%, #ff2d00 100%)' },
  // Oranges / warm
  { label: 'Magma',      value: 'linear-gradient(160deg, #1a0500 0%, #8b2500 40%, #ff4500 75%, #ffa500 100%)' },
  { label: 'Bronze',     value: 'linear-gradient(160deg, #100800 0%, #4a2800 45%, #cd7f32 80%, #e8a050 100%)' },
  // Pinks
  { label: 'Pink',       value: 'linear-gradient(160deg, #1a0010 0%, #660033 50%, #ff2d78 100%)' },
  { label: 'Rose',       value: 'linear-gradient(160deg, #140008 0%, #550022 40%, #cc0055 70%, #ff66aa 100%)' },
  // Purples
  { label: 'Candy',      value: 'linear-gradient(160deg, #1a0014 0%, #660055 35%, #cc00cc 65%, #ff66ff 100%)' },
  { label: 'Synthwave',  value: 'linear-gradient(160deg, #0d0020 0%, #330066 35%, #cc00ff 65%, #ff0066 100%)' },
  { label: 'Galaxy',     value: 'linear-gradient(160deg, #05001a 0%, #2d0066 50%, #bf5fff 100%)' },
  // Blues
  { label: 'Storm',      value: 'linear-gradient(160deg, #050510 0%, #0a0a40 40%, #1a1aaa 75%, #4466ff 100%)' },
  { label: 'Midnight',   value: 'linear-gradient(160deg, #000008 0%, #050520 40%, #0a0a60 75%, #1a1aaa 100%)' },
  { label: 'Cyber',      value: 'linear-gradient(160deg, #000d14 0%, #001428 40%, #00aaff 70%, #00ffcc 100%)' },
  { label: 'Deep Sea',   value: 'linear-gradient(160deg, #000508 0%, #001a33 40%, #006666 75%, #00ccaa 100%)' },
  // Greens
  { label: 'Emerald',    value: 'linear-gradient(160deg, #000d04 0%, #003d15 45%, #00a550 80%, #00ff88 100%)' },
  { label: 'Aurora',     value: 'linear-gradient(160deg, #000d08 0%, #003322 35%, #00aa66 60%, #44ffcc 80%, #88aaff 100%)' },
  // Dark
  { label: 'Obsidian',   value: 'linear-gradient(160deg, #050505 0%, #111111 40%, #222222 75%, #333344 100%)' },
] as const

export type GameType =
  | 'cricket'
  | 'cutThroat'
  | '301'
  | '501'
  | '701'
  | '1001'
  | 'aroundTheClock'
  | 'shanghai'
  | 'killer'
  | 'halveit'
  | 'baseball'

export const GAME_TYPE_LABELS: Record<GameType, string> = {
  cricket: 'Cricket',
  cutThroat: 'Cut Throat Cricket',
  '301': '301',
  '501': '501',
  '701': '701',
  '1001': '1001',
  aroundTheClock: 'Around the Clock',
  shanghai: 'Shanghai',
  killer: 'Killer',
  halveit: 'Halve-It',
  baseball: 'Baseball',
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

export type PlayerScore =
  | { kind: 'cricket'; data: CricketPlayerScore }
  | { kind: 'ohOne'; data: OhOnePlayerScore }
  | { kind: 'simple'; data: SimplePlayerScore }

export type ActiveGame = {
  id: string
  gameType: GameType
  timerDuration: number
  throwTimerDuration: number
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
] as const

export const PRESET_AVATARS = [
  '🦁', '🐯', '🐻', '🦊', '🐺', '🦅', '🦈',
  '🐸', '🦋', '🐊', '🦍', '🦧', '🦏', '🦛', '🦒',
  '🐘', '🦉', '🦚', '🐓', '🦇', '🕷️', '🐻‍❄️',
  '🦭', '🐬', '🦖',
  '🐳', '🦑', '🐡', '🦦', '🦥', '🦨', '🦡', '🦫', '🐿️', '🦔', '🐧', '🦆', '🫎', '🪼',
  '🦄', '🐉', '🐲', '🐦‍🔥', '🧌', '🧜', '👹', '👺',
  '🎱', '🫠',
]
