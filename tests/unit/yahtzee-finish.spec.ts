import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it } from 'vitest'
import { useYahtzeeStore, emptyScorecard, type YahtzeeScorecard } from '@/stores/yahtzee'
import type { Player } from '@/types/index'

/**
 * A Yahtzee game whose scorecards are all full but whose status is still 'playing' is
 * unwinnable: no category is scoreable, the roll button reads DONE and is disabled, and
 * no winner is ever declared. Reported from a real game and reproduced in a browser —
 * 0 scoreable rows, roll button disabled, no finish overlay.
 *
 * finishIfComplete() enforces "all cards full ⇒ finished" as an invariant, including on
 * load so an already-stuck game recovers rather than staying dead.
 */
const SAVE_KEY = 'yahtzee_active_game'

const player = (id: string, name: string): Player => ({
  id, name, color: '#fff', avatarUrl: null, playerBackground: null, playerBackgroundSize: null,
  playerBackgroundPosition: null, playerBackgroundFill: null, targetLabelColor: null,
  cricketTargetDisplay: null, diceTheme: null, pinned: false, wins: 0, gamesPlayed: 0,
  createdAt: new Date(0).toISOString(),
})

function fullCard(chance: number): YahtzeeScorecard {
  return { aces: 3, twos: 6, threes: 9, fours: 12, fives: 15, sixes: 18, threeOfAKind: 20,
    fourOfAKind: 24, fullHouse: 25, smallStraight: 30, largeStraight: 40, yahtzee: 50,
    chance, yahtzeeBonusCount: 0 }
}

function saveGame(cards: YahtzeeScorecard[], status: 'playing' | 'finished' = 'playing') {
  const players = cards.map((_, i) => player(`p${i + 1}`, `P${i + 1}`))
  localStorage.setItem(SAVE_KEY, JSON.stringify({
    id: 'g1', startedAt: new Date(0).toISOString(), players,
    playerStates: players.map((p, i) => ({ player: p, scorecard: cards[i] })),
    currentPlayerIndex: 0, dice: [6, 6, 6, 6, 6], held: [false, false, false, false, false],
    rollCount: 3, diceMode: 'electronic', status, winnerId: null,
  }))
}

const freshStore = () => { setActivePinia(createPinia()); return useYahtzeeStore() }

describe('yahtzee — a complete game must finish', () => {
  beforeEach(() => localStorage.clear())

  it('recovers a game left complete-but-unfinished, on load', () => {
    saveGame([fullCard(22), fullCard(5)])

    const store = freshStore()

    expect(store.game?.status).toBe('finished')
    expect(store.game?.winnerId).toBe('p1')
  })

  it('picks the winner by highest total, not by turn order', () => {
    // second player scores higher
    saveGame([fullCard(5), fullCard(30)])

    const store = freshStore()

    expect(store.game?.winnerId).toBe('p2')
  })

  it('leaves an in-progress game alone', () => {
    const partial = { ...fullCard(22), chance: null } as YahtzeeScorecard
    saveGame([fullCard(22), partial])

    const store = freshStore()

    expect(store.game?.status).toBe('playing')
    expect(store.game?.winnerId).toBeNull()
  })

  it('persists the recovery, so it survives a reload', () => {
    saveGame([fullCard(22), fullCard(5)])

    freshStore()

    const saved = JSON.parse(localStorage.getItem(SAVE_KEY)!)
    expect(saved.status).toBe('finished')
    expect(saved.winnerId).toBe('p1')
  })

  it('finishes when the last category is scored during play', () => {
    const nearlyDone = { ...fullCard(22), chance: null } as YahtzeeScorecard
    saveGame([fullCard(22), nearlyDone])
    const store = freshStore()
    expect(store.game?.status).toBe('playing')

    // second player fills their final category
    store.game!.currentPlayerIndex = 1
    store.scoreCategory('chance')

    expect(store.game?.status).toBe('finished')
  })

  it('is idempotent — re-running does not change a finished game', () => {
    saveGame([fullCard(22), fullCard(5)])
    const store = freshStore()
    const winner = store.game?.winnerId

    expect(store.finishIfComplete()).toBe(false)
    expect(store.game?.winnerId).toBe(winner)
  })

  it('starting a new game is unaffected', () => {
    const store = freshStore()
    store.startGame([player('a', 'A'), player('b', 'B')], 'electronic')

    expect(store.game?.status).toBe('playing')
    expect(store.game?.playerStates[0]!.scorecard).toEqual(emptyScorecard())
  })
})
