<template>
  <div v-if="game" class="bj-page">
    <div class="bj-header">
      <button v-ripple class="btn btn-outline btn-sm" @click="goBack(router, '/')">← Back</button>
      <span class="bj-round display">ROUND {{ game.round }}</span>
      <button v-ripple class="btn btn-outline btn-sm" @click="quit">End</button>
    </div>

    <!-- DEALER -->
    <section class="dealer">
      <div class="seat-label">
        <span class="seat-name display">DEALER</span>
        <span v-if="showDealerTotal" class="seat-total" :class="{ bust: dealerBust }">
          {{ dealerValue.total }}{{ dealerValue.soft ? ' soft' : '' }}
        </span>
      </div>
      <div class="hand">
        <PlayingCard
          v-for="(card, i) in game.dealer" :key="i"
          :card="card"
          :width="66"
          :face-down="hideHole && i === 1"
        />
        <span v-if="!game.dealer.length" class="empty-hand">—</span>
      </div>
    </section>

    <p class="last-action">{{ game.lastAction }}</p>

    <!-- PLAYERS -->
    <section class="seats">
      <div
        v-for="(p, i) in game.players" :key="p.id"
        class="seat"
        :class="{ active: isTurn(i), out: p.bet <= 0 && game.phase !== 'betting' }"
        :style="{ borderLeftColor: p.color }"
      >
        <div class="seat-label">
          <span class="seat-name">{{ p.name }}</span>
          <span class="chips">{{ p.chips }} chips</span>
          <span v-if="p.hand.length" class="seat-total" :class="{ bust: p.status === 'bust' }">
            {{ value(p.hand).total }}{{ value(p.hand).soft ? ' soft' : '' }}
          </span>
        </div>

        <div v-if="p.hand.length" class="hand">
          <PlayingCard v-for="(card, ci) in p.hand" :key="ci" :card="card" :width="58" />
        </div>

        <!-- BETTING -->
        <div v-if="game.phase === 'betting'" class="bet-row">
          <button v-ripple class="bet-btn" :disabled="p.bet <= 0" @click="store.setBet(p.id, p.bet - STEP)">−</button>
          <span class="bet-amount" :class="{ placed: p.bet > 0 }">{{ p.bet }}</span>
          <button v-ripple class="bet-btn" :disabled="p.bet >= p.chips" @click="store.setBet(p.id, p.bet + STEP)">+</button>
          <button v-ripple class="btn btn-surface btn-sm" :disabled="p.chips <= 0" @click="store.setBet(p.id, p.chips)">All in</button>
        </div>

        <span v-else-if="p.outcome" class="outcome" :class="p.outcome">{{ OUTCOME_LABEL[p.outcome] }}</span>
        <span v-else-if="p.status === 'blackjack'" class="outcome blackjack">BLACKJACK</span>
        <span v-else-if="p.status === 'bust'" class="outcome bust">BUST</span>
        <span v-else-if="p.status === 'stood'" class="outcome">STANDS</span>
        <span v-else-if="p.bet > 0" class="bet-tag">bet {{ p.bet }}</span>
      </div>
    </section>

    <!-- CONTROLS -->
    <div class="controls">
      <template v-if="game.phase === 'betting'">
        <button v-ripple class="btn btn-gold btn-lg wide" :disabled="!anyBet" @click="store.deal()">
          {{ anyBet ? 'Deal' : 'Place a bet' }}
        </button>
      </template>

      <template v-else-if="game.phase === 'playing' && current">
        <span class="turn-of">{{ current.name }}'s turn</span>
        <div class="action-row">
          <button v-ripple class="btn btn-surface btn-lg" @click="store.stand()">Stand</button>
          <button v-ripple class="btn btn-gold btn-lg" @click="store.hit()">Hit</button>
        </div>
      </template>

      <template v-else-if="game.phase === 'settled'">
        <button v-ripple class="btn btn-gold btn-lg wide" @click="store.nextRound()">Next hand</button>
      </template>

      <template v-else-if="game.phase === 'game_over'">
        <span class="turn-of">Everyone is out of chips</span>
        <button v-ripple class="btn btn-spray btn-lg wide" @click="quit">Done</button>
      </template>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import PlayingCard from '../components/PlayingCard.vue'
import { useBlackjackStore } from '../stores/blackjack'
import { handValue, isBust, type Outcome, type PipCard } from '../lib/blackjack'
import { goBack } from '../router/goBack'

const router = useRouter()
const store = useBlackjackStore()

/** Chips per press on the bet stepper. */
const STEP = 5

const OUTCOME_LABEL: Record<Outcome, string> = {
  blackjack: 'BLACKJACK · pays 3:2',
  win: 'WIN',
  push: 'PUSH',
  lose: 'LOSE',
  bust: 'BUST',
}

const game = computed(() => store.game)
const current = computed(() => store.current())

const value = (hand: PipCard[]) => handValue(hand)

/**
 * The hole card stays down until the dealer plays, which is the whole tension of the game —
 * showing it during the players' turns would make every decision trivial.
 */
const hideHole = computed(() => game.value?.phase === 'betting' || game.value?.phase === 'playing')
const showDealerTotal = computed(() => !!game.value?.dealer.length && !hideHole.value)
const dealerValue = computed(() => handValue(game.value?.dealer ?? []))
const dealerBust = computed(() => isBust(game.value?.dealer ?? []))

const anyBet = computed(() => (game.value?.players ?? []).some(p => p.bet > 0))

function isTurn(i: number) {
  return game.value?.phase === 'playing' && game.value.currentPlayerIndex === i
}

function quit() {
  store.endGame()
  router.push('/')
}

onMounted(() => {
  if (!store.game) {
    store.load()
    // Nothing to resume — the table was never set, so send them to pick players.
    if (!store.game) router.replace('/blackjack/setup')
  }
})
</script>

<style scoped>
.bj-page {
  display: flex; flex-direction: column; gap: 10px;
  padding: 10px 12px 20px; min-height: 100%;
}

.bj-header { display: flex; align-items: center; justify-content: space-between; gap: 10px; }
.bj-round { font-size: 20px; letter-spacing: 0.1em; }

.dealer {
  border-radius: 14px; padding: 10px 12px;
  background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.1);
}

.seat-label { display: flex; align-items: baseline; gap: 10px; flex-wrap: wrap; }
.seat-name { font-size: 12px; font-weight: 800; letter-spacing: 0.12em; color: var(--text-muted); }
.seat-total { font-size: 15px; font-weight: 900; color: var(--gold); font-family: var(--font-display); }
.seat-total.bust { color: #ff6b6b; }
.chips { font-size: 12px; color: var(--text-muted); }

.hand { display: flex; gap: 6px; flex-wrap: wrap; margin-top: 8px; min-height: 40px; }
.empty-hand { color: var(--text-muted); opacity: 0.5; }

.last-action { margin: 0; font-size: 13px; color: var(--text-muted); text-align: center; min-height: 18px; }

.seats { display: flex; flex-direction: column; gap: 8px; }
.seat {
  border-radius: 12px; padding: 10px 12px; border-left: 4px solid transparent;
  background: rgba(255,255,255,0.04); border-top: 1px solid rgba(255,255,255,0.08);
  border-right: 1px solid rgba(255,255,255,0.08); border-bottom: 1px solid rgba(255,255,255,0.08);
}
/* The active seat has to be obvious across a table, not just to whoever holds the phone. */
.seat.active { background: rgba(255,200,87,0.12); border-color: var(--gold); }
.seat.out { opacity: 0.45; }

.bet-row { display: flex; align-items: center; gap: 8px; margin-top: 8px; }
.bet-btn {
  min-width: 44px; min-height: 44px; border-radius: 10px; cursor: pointer;
  background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.16);
  color: var(--text); font-size: 20px; font-weight: 900;
}
.bet-btn:disabled { opacity: 0.35; }
.bet-amount {
  min-width: 52px; text-align: center; font-family: var(--font-display);
  font-size: 20px; font-weight: 900; color: var(--text-muted);
}
.bet-amount.placed { color: var(--gold); }
.bet-tag { font-size: 12px; color: var(--text-muted); }

.outcome { display: inline-block; margin-top: 6px; font-size: 12px; font-weight: 900; letter-spacing: 0.1em; }
.outcome.win, .outcome.blackjack { color: var(--gold); }
.outcome.bust, .outcome.lose { color: #ff6b6b; }
.outcome.push { color: var(--text-muted); }

.controls { display: flex; flex-direction: column; gap: 8px; margin-top: auto; }
.turn-of { text-align: center; font-size: 13px; color: var(--text-muted); }
.action-row { display: flex; gap: 10px; }
.action-row .btn { flex: 1; min-height: 56px; }
.wide { width: 100%; min-height: 56px; }
</style>
