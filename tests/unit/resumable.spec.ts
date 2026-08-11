import { describe, expect, it } from 'vitest'
import { resumableGames } from '@/lib/resumable'

/** A reader over a plain object, so no test touches a real localStorage. */
const reader = (store: Record<string, unknown>) => (key: string) =>
  key in store ? JSON.stringify(store[key]) : null

const twoPlayers = [{ id: 'a' }, { id: 'b' }]

describe('resumableGames', () => {
  it('finds nothing when nothing is saved', () => {
    expect(resumableGames(() => null)).toEqual([])
  })

  it('offers a darts game back while it is being played', () => {
    const found = resumableGames(reader({
      darts_active_game: { status: 'playing', round: 3, players: twoPlayers },
    }))

    expect(found).toHaveLength(1)
    expect(found[0]).toMatchObject({ title: 'Darts', route: '/game' })
    expect(found[0]!.detail).toContain('2 players')
    expect(found[0]!.detail).toContain('round 3')
  })

  it('offers darts back between turns too', () => {
    const found = resumableGames(reader({
      darts_active_game: { status: 'between_turns', round: 1, players: twoPlayers },
    }))

    expect(found).toHaveLength(1)
  })

  it('does not offer a finished darts game — the win screen still owes it a result', () => {
    const found = resumableGames(reader({
      darts_active_game: { status: 'finished', round: 9, players: twoPlayers },
    }))

    expect(found).toEqual([])
  })

  it('covers the five games that had no way back at all', () => {
    // Only darts and LRC ever had a redirect; these were reachable by URL and nothing else.
    const found = resumableGames(reader({
      yahtzee_active_game: { status: 'playing', players: twoPlayers },
      spades_active_game: { phase: 'playing', handNumber: 4 },
      farkle_active_game: { phase: 'rolled', target: 10000, players: twoPlayers },
      scc_active_game: { phase: 'idle', round: 2, players: twoPlayers },
      pig_active_game: { phase: 'idle', target: 100, players: twoPlayers },
    }))

    expect(found.map(g => g.title)).toEqual([
      'Yahtzee', 'Spades', 'Farkle', 'Ship Captain Crew', 'Pig',
    ])
  })

  it('drops each game once it is over', () => {
    const over = resumableGames(reader({
      lrc_active_game: { phase: 'game_over', players: twoPlayers },
      spades_active_game: { phase: 'game_over', handNumber: 12 },
      farkle_active_game: { phase: 'game_over', players: twoPlayers },
      yahtzee_active_game: { status: 'finished', players: twoPlayers },
    }))

    expect(over).toEqual([])
  })

  it('lists several at once, so no game hides another', () => {
    const found = resumableGames(reader({
      darts_active_game: { status: 'playing', round: 2, players: twoPlayers },
      lrc_active_game: { phase: 'rolling', round: 5, players: twoPlayers },
      spades_active_game: { phase: 'bidding', handNumber: 1 },
    }))

    expect(found.map(g => g.title)).toEqual(['Darts', 'Left Right Center', 'Spades'])
    expect(found.map(g => g.route)).toEqual(['/game', '/lrc', '/spades'])
  })

  it('survives a corrupt save rather than taking the home screen down', () => {
    const found = resumableGames(key =>
      key === 'darts_active_game' ? '{ not json' : null)

    expect(found).toEqual([])
  })

  it('survives a save that is valid JSON but the wrong shape', () => {
    const found = resumableGames(key => (key === 'lrc_active_game' ? '"a string"' : null))

    expect(found).toEqual([])
  })

  it('counts a single player without pluralising', () => {
    const found = resumableGames(reader({
      pig_active_game: { phase: 'idle', target: 100, players: [{ id: 'a' }] },
    }))

    expect(found[0]!.detail).toContain('1 player')
    expect(found[0]!.detail).not.toContain('1 players')
  })
})
