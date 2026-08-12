import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it } from 'vitest'
import { useBlackjackStore } from '@/stores/blackjack'
import type { PipCard } from '@/lib/blackjack'
import type { Player } from '@/types/index'

/**
 * Chip accounting, which the rule tests cannot reach.
 *
 * `payoutMultiplier` is pure and was always right, but it returns *stake-inclusive*
 * multiples — 2 for a win, 1 for a push. That only balances if the stake has already left
 * the player's stack. It had not: winners were paid twice and losers risked nothing, and
 * every rule test still passed because none of them touch a chip. This is the seam.
 */

const player = (id: string, name: string): Player => ({
  id, name, color: '#fff', avatarUrl: null,
} as Player)

const c = (rank: number, suit: PipCard['suit'] = 'spades'): PipCard => ({ kind: 'pip', suit, rank })

/**
 * Stacks the shoe so the next deal is exactly the hands given.
 *
 * Two things to respect. Cards are drawn with `pop()`, so the sequence has to be reversed;
 * and `draw` rebuilds the shoe once it falls to RESHUFFLE_AT, so a shoe of only the stacked
 * cards would be thrown away and replaced with a random one before the first card came out.
 * Hence the filler underneath.
 */
function stackShoe(store: ReturnType<typeof useBlackjackStore>, playerHands: PipCard[][], dealer: PipCard[]) {
  const g = store.game!
  // Deal order is one card to each player, then the dealer, twice over.
  const order: PipCard[] = []
  for (let i = 0; i < 2; i++) {
    for (const hand of playerHands) order.push(hand[i]!)
    order.push(dealer[i]!)
  }
  // Anything the dealer draws afterwards comes next.
  order.push(...dealer.slice(2))

  // Kept well above RESHUFFLE_AT so the stack survives to be dealt. Twos, so an unintended
  // draw is obvious in a failure rather than looking like a plausible card.
  const filler: PipCard[] = Array.from({ length: 40 }, () => c(2, 'clubs'))
  g.shoe = [...filler, ...order.reverse()]
}

describe('blackjack chip accounting', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    localStorage.clear()
  })

  it('takes the stake off the stack when the cards come out', () => {
    const store = useBlackjackStore()
    store.startGame([player('a', 'Ann')], 100)
    store.setBet('a', 10)
    stackShoe(store, [[c(10), c(7)]], [c(10), c(8)])
    store.deal()
    // 100 minus the stake, before anything is settled.
    expect(store.game!.players[0]!.chips).toBe(90)
  })

  it('leaves a loser down exactly the stake', () => {
    const store = useBlackjackStore()
    store.startGame([player('a', 'Ann')], 100)
    store.setBet('a', 10)
    stackShoe(store, [[c(10), c(7)]], [c(10), c(8)])  // 17 against 18
    store.deal()
    store.stand()
    expect(store.game!.players[0]!.outcome).toBe('lose')
    expect(store.game!.players[0]!.chips).toBe(90)
  })

  it('leaves a winner up exactly the stake, not double', () => {
    const store = useBlackjackStore()
    store.startGame([player('a', 'Ann')], 100)
    store.setBet('a', 10)
    stackShoe(store, [[c(10), c(9)]], [c(10), c(8)])  // 19 against 18
    store.deal()
    store.stand()
    expect(store.game!.players[0]!.outcome).toBe('win')
    expect(store.game!.players[0]!.chips).toBe(110)
  })

  it('returns the stake untouched on a push', () => {
    const store = useBlackjackStore()
    store.startGame([player('a', 'Ann')], 100)
    store.setBet('a', 10)
    stackShoe(store, [[c(10), c(8)]], [c(10), c(8)])
    store.deal()
    store.stand()
    expect(store.game!.players[0]!.outcome).toBe('push')
    expect(store.game!.players[0]!.chips).toBe(100)
  })

  it('pays blackjack three to two', () => {
    const store = useBlackjackStore()
    store.startGame([player('a', 'Ann')], 100)
    store.setBet('a', 10)
    stackShoe(store, [[c(14), c(13)]], [c(10), c(8)])
    store.deal()
    // Blackjack acts for itself — there is nobody left to play, so the round settles.
    expect(store.game!.players[0]!.outcome).toBe('blackjack')
    expect(store.game!.players[0]!.chips).toBe(115)
  })

  it('takes the stake from a busted player', () => {
    const store = useBlackjackStore()
    store.startGame([player('a', 'Ann')], 100)
    store.setBet('a', 10)
    stackShoe(store, [[c(10), c(9)]], [c(10), c(8), c(10)])
    store.deal()
    store.hit()   // draws the dealer's third card off the top: 10, busting on 29
    expect(store.game!.players[0]!.status).toBe('bust')
    expect(store.game!.players[0]!.chips).toBe(90)
  })

  it('never lets a bet exceed the stack', () => {
    const store = useBlackjackStore()
    store.startGame([player('a', 'Ann')], 20)
    store.setBet('a', 500)
    expect(store.game!.players[0]!.bet).toBe(20)
  })

  it('conserves chips across a round — the table neither prints nor destroys them', () => {
    const store = useBlackjackStore()
    store.startGame([player('a', 'Ann'), player('b', 'Bob')], 100)
    store.setBet('a', 10)
    store.setBet('b', 10)
    // Ann pushes, Bob pushes: nobody is up or down, so the total must be exactly as it began.
    stackShoe(store, [[c(10), c(8)], [c(10), c(8)]], [c(10), c(8)])
    store.deal()
    store.stand()
    store.stand()
    const total = store.game!.players.reduce((n, p) => n + p.chips, 0)
    expect(total).toBe(200)
  })
})
