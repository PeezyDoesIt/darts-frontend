import { describe, expect, it } from 'vitest'
import {
  dayLabel, groupByDay, playerLine, recordedNames, type HistoryGame,
} from '@/lib/gameHistory'

/** Fixed "now" — relative labels are exactly what breaks when the clock is real. */
const NOW = new Date('2026-08-11T21:00:00')

const game = (over: Partial<HistoryGame> = {}): HistoryGame => ({
  id: 'g1',
  gameType: 'cricket',
  winnerId: 'p1',
  playerIds: ['p1', 'p2'],
  finishedAt: '2026-08-11T20:00:00',
  roundCount: 7,
  ...over,
})

const NAMES: Record<string, string> = { p1: 'Peezy', p2: 'Sam', p3: 'Jo' }
const nameOf = (id: string) => NAMES[id] ?? null

describe('dayLabel', () => {
  it('calls today Tonight', () => {
    expect(dayLabel(new Date('2026-08-11T20:00:00'), NOW)).toBe('Tonight')
  })

  it('counts a game earlier today as Tonight, not by elapsed hours', () => {
    // 09:00 is twelve hours earlier but the same evening's session.
    expect(dayLabel(new Date('2026-08-11T09:00:00'), NOW)).toBe('Tonight')
  })

  it('calls the previous calendar day Yesterday even if it was only hours ago', () => {
    // 23:30 yesterday is 21.5 hours before "now" — under a day, but not today.
    expect(dayLabel(new Date('2026-08-10T23:30:00'), NOW)).toBe('Yesterday')
  })

  it('names the weekday within the last week', () => {
    expect(dayLabel(new Date('2026-08-08T20:00:00'), NOW)).toMatch(/day$/)
  })

  it('falls back to a date once it is more than a week old', () => {
    expect(dayLabel(new Date('2026-07-20T20:00:00'), NOW)).not.toMatch(/day$/)
  })
})

describe('groupByDay', () => {
  it('groups games under the day they finished', () => {
    const days = groupByDay([
      game({ id: 'a', finishedAt: '2026-08-11T20:00:00' }),
      game({ id: 'b', finishedAt: '2026-08-11T18:00:00' }),
      game({ id: 'c', finishedAt: '2026-08-10T20:00:00' }),
    ], NOW)

    expect(days).toHaveLength(2)
    expect(days[0]!.label).toBe('Tonight')
    expect(days[0]!.games.map(g => g.id)).toEqual(['a', 'b'])
    expect(days[1]!.label).toBe('Yesterday')
  })

  it('keeps the newest day first', () => {
    const days = groupByDay([
      game({ id: 'old', finishedAt: '2026-08-01T20:00:00' }),
      game({ id: 'new', finishedAt: '2026-08-11T20:00:00' }),
    ], NOW)

    expect(days[0]!.games[0]!.id).toBe('new')
  })

  it('preserves the order games arrive in within a day', () => {
    // The API already sorts newest first; regrouping must not shuffle that.
    const days = groupByDay([
      game({ id: '1', finishedAt: '2026-08-11T22:00:00' }),
      game({ id: '2', finishedAt: '2026-08-11T21:00:00' }),
      game({ id: '3', finishedAt: '2026-08-11T20:00:00' }),
    ], NOW)

    expect(days[0]!.games.map(g => g.id)).toEqual(['1', '2', '3'])
  })

  it('files a late-evening game under that evening, not the next day', () => {
    // Grouping on the UTC date would move a 23:00 game to tomorrow for anyone west of UTC.
    const days = groupByDay([game({ finishedAt: '2026-08-11T23:30:00' })], NOW)

    expect(days[0]!.label).toBe('Tonight')
  })

  it('drops a game with an unreadable timestamp rather than the whole screen', () => {
    const days = groupByDay([
      game({ id: 'bad', finishedAt: 'not a date' }),
      game({ id: 'good' }),
    ], NOW)

    expect(days).toHaveLength(1)
    expect(days[0]!.games.map(g => g.id)).toEqual(['good'])
  })

  it('returns nothing for no games', () => {
    expect(groupByDay([], NOW)).toEqual([])
  })
})

describe('playerLine', () => {
  it('puts the winner first', () => {
    expect(playerLine(game(), nameOf)).toBe('Peezy beat Sam')
  })

  it('lists everyone else after the winner', () => {
    expect(playerLine(game({ playerIds: ['p1', 'p2', 'p3'] }), nameOf)).toBe('Peezy beat Sam, Jo')
  })

  it('names a solo game without inventing an opponent', () => {
    expect(playerLine(game({ playerIds: ['p1'] }), nameOf)).toBe('Peezy')
  })

  it('skips players who are no longer on the roster', () => {
    // LRC guests never existed in players, and anyone can be deleted later.
    expect(playerLine(game({ playerIds: ['p1', 'ghost'] }), nameOf)).toBe('Peezy')
  })

  it('does not credit the losers when the winner cannot be named', () => {
    // This asserted 'Sam' — the losers alone, which is exactly what a solo win by Sam looks
    // like. Every game the computer seats won rendered that way, so a loss read as a win.
    expect(playerLine(game({ winnerId: 'ghost', playerIds: ['ghost', 'p2'] }), nameOf))
      .toBe('Someone beat Sam')
  })
})

/**
 * A computer seat is never on the roster, so its id could not be named — and playerLine
 * dropped what it could not name. A game the computers won came out as the bare name of the
 * human who lost, which is exactly what a solo win looks like. A loss read as a win.
 */
describe('games the computer won', () => {
  const botGame = (over: Partial<HistoryGame> = {}): HistoryGame => game({
    gameType: 'spades',
    winnerId: 'bot-1',
    playerIds: ['p1', 'bot-1', 'bot-2', 'bot-3'],
    ...over,
  })

  it('no longer reads identically to a win', () => {
    const lost = playerLine(botGame(), nameOf)
    const won = playerLine(game({ winnerId: 'p1', playerIds: ['p1'] }), nameOf)

    expect(lost).not.toBe(won)
  })

  it('names the computer when the game recorded who was playing', () => {
    const withNames = botGame({
      finalScores: { names: { p1: 'Peezy', 'bot-1': 'Ada', 'bot-2': 'Bishop', 'bot-3': 'Cleo' } },
    })
    const resolve = (id: string) => NAMES[id] ?? recordedNames(withNames)[id] ?? null

    expect(playerLine(withNames, resolve)).toBe('Ada beat Peezy, Bishop, Cleo')
  })

  it('says someone won rather than crediting the loser, on games recorded before names', () => {
    // Rows written before finalScores carried names have nothing to resolve a bot id with.
    expect(playerLine(botGame(), nameOf)).toBe('Someone beat Peezy')
  })

  it('prefers the roster, so renaming a player shows through in old games', () => {
    const withNames = game({
      finalScores: { names: { p1: 'Old Name', p2: 'Sam' } },
    })
    const resolve = (id: string) => NAMES[id] ?? recordedNames(withNames)[id] ?? null

    expect(playerLine(withNames, resolve)).toBe('Peezy beat Sam')
  })

  it('falls back to recorded names for a player since deleted', () => {
    const withNames = game({
      winnerId: 'p1',
      playerIds: ['p1', 'gone'],
      finalScores: { names: { p1: 'Peezy', gone: 'Departed' } },
    })
    const resolve = (id: string) => NAMES[id] ?? recordedNames(withNames)[id] ?? null

    expect(playerLine(withNames, resolve)).toBe('Peezy beat Departed')
  })
})

describe('recordedNames', () => {
  it('reads the names a game was recorded with', () => {
    expect(recordedNames(game({ finalScores: { names: { a: 'Ada' } } }))).toEqual({ a: 'Ada' })
  })

  it('is empty for a game recorded before names were kept', () => {
    expect(recordedNames(game({ finalScores: { teams: [] } }))).toEqual({})
    expect(recordedNames(game())).toEqual({})
  })

  it('ignores a blob of the wrong shape rather than throwing', () => {
    expect(recordedNames(game({ finalScores: 'nonsense' }))).toEqual({})
    expect(recordedNames(game({ finalScores: { names: 'nonsense' } }))).toEqual({})
    expect(recordedNames(game({ finalScores: null }))).toEqual({})
  })

  it('drops entries that are not usable names', () => {
    const names = recordedNames(game({ finalScores: { names: { a: 'Ada', b: 42, c: '', d: '  ' } } }))

    expect(names).toEqual({ a: 'Ada' })
  })
})
