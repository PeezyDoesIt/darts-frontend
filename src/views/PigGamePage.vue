<template>
  <div v-if="game" class="game-page">
    <div class="drip-bar" />

    <header class="gp-header">
      <button v-ripple class="btn btn-outline btn-sm" @click="quit">← Quit</button>
      <div class="gp-title-wrap">
        <h1 class="gp-title display">PIG</h1>
        <span class="gp-target">to {{ game.target }}</span>
      </div>
      <button v-ripple class="btn btn-outline btn-sm" @click="showRules = true">Rules</button>
    </header>

    <div class="gp-body">
      <div class="scoreboard">
        <div
          v-for="(p, i) in game.players"
          :key="p.id"
          class="score-chip"
          :class="{ active: i === game.currentPlayerIndex }"
          :style="{ borderColor: i === game.currentPlayerIndex ? p.color : 'transparent' }"
        >
          <span class="sc-name">{{ p.name }}</span>
          <span class="sc-score display" :style="{ color: p.color }">{{ p.score }}</span>
        </div>
      </div>

      <div class="turn-banner" :style="{ borderColor: currentPlayer.color }">
        <span class="tb-name" :style="{ color: currentPlayer.color }">{{ currentPlayer.name }}</span>
        <span class="tb-turn">turn total <strong>{{ game.turnScore }}</strong></span>
      </div>

      <div class="dice-area">
        <DiceFace v-if="game.die !== null" :face="game.die" :size="96" />
        <div v-else class="die-placeholder">🎲</div>

        <p v-if="game.phase === 'busted'" class="bust-msg display">PIGGED!</p>
        <p v-else-if="game.lastAction" class="last-action">{{ game.lastAction }}</p>

        <p class="risk-hint">
          {{ game.phase === 'busted'
            ? 'A 1 wipes the turn total.'
            : `Bank ${game.turnScore} or push your luck.` }}
        </p>
      </div>
    </div>

    <footer class="gp-footer">
      <template v-if="game.phase === 'busted'">
        <button v-ripple class="btn btn-spray btn-lg wide" @click="pig.endTurn()">Pass the die →</button>
      </template>
      <template v-else>
        <button v-ripple class="btn btn-spray btn-lg" @click="rollWithSound">Roll</button>
        <button
          v-ripple
          class="btn btn-outline btn-lg"
          :disabled="game.turnScore === 0"
          @click="bank"
        >Bank {{ game.turnScore }}</button>
      </template>
    </footer>

    <div v-if="game.phase === 'game_over'" class="overlay">
      <div class="win-card glass-panel">
        <span class="win-label">WINNER</span>
        <h2 class="win-name display" :style="{ color: winner?.color }">{{ winner?.name }}</h2>
        <p class="win-score display">{{ winner?.score }}</p>
        <button v-ripple class="btn btn-spray btn-lg wide" @click="finish">Done</button>
      </div>
    </div>

    <div v-if="showRules" class="overlay" @click.self="showRules = false">
      <div class="rules-card glass-panel">
        <h2 class="rules-title display">PIG</h2>
        <ul class="rules-list"><li v-for="(r, i) in PIG_RULES" :key="i">{{ r }}</li></ul>
        <button v-ripple class="btn btn-spray wide" @click="showRules = false">Got it</button>
      </div>
    </div>
  </div>

  <div v-else class="empty-state">
    <p>No game in progress.</p>
    <button v-ripple class="btn btn-spray btn-lg" @click="router.replace('/dice/pig/setup')">Set one up</button>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import DiceFace from '../components/DiceFace.vue'
import { usePigStore, PIG_RULES } from '../stores/pig'
import { usePlayersStore } from '../stores/players'
import { recordGameResult } from '../api/gameResults'
import { playTurnResultSound, playStartChime, unlockAudio } from '../composables/useSounds'
import { goBack } from '../router/goBack'

const router = useRouter()
const pig = usePigStore()
const playersStore = usePlayersStore()
const game = computed(() => pig.game)
const showRules = ref(false)

const currentPlayer = computed(() => game.value!.players[game.value!.currentPlayerIndex]!)
const winner = computed(() => game.value?.players.find(p => p.id === game.value?.winnerId))

function rollWithSound() {
  unlockAudio()
  pig.rollDie()
  playTurnResultSound(game.value?.phase === 'busted')
}

function bank() {
  unlockAudio()
  const won = pig.bank()
  if (won) playStartChime()
  else playTurnResultSound(false)
}

function finish() {
  const g = game.value
  if (g && g.winnerId) {
    g.players.forEach(p => {
      const stored = playersStore.players.find(sp => sp.id === p.id)
      if (!stored) return
      playersStore.updatePlayer(p.id, {
        wins: stored.wins + (p.id === g.winnerId ? 1 : 0),
        gamesPlayed: stored.gamesPlayed + 1,
      })
    })
    void recordGameResult({
      clientGameId: g.id,
      gameType: 'pig',
      winnerId: g.winnerId,
      playerIds: g.players.map(p => p.id),
      startedAt: g.startedAt ?? null,
      finishedAt: new Date().toISOString(),
      finalScores: Object.fromEntries(g.players.map(p => [p.id, { score: p.score }])),
    })
  }
  pig.endGame()
  router.replace('/')
}

function quit() { pig.endGame(); goBack(router, '/') }
</script>

<style scoped>
.game-page { display: flex; flex-direction: column; width: 100vw; height: 100dvh; overflow: hidden; background: #0a0a0a; }
.gp-header {
  display: flex; align-items: center; justify-content: space-between; gap: 8px;
  padding: 12px 14px; padding-top: calc(12px + env(safe-area-inset-top));
  border-bottom: 1px solid rgba(255,255,255,0.08); background: rgba(0,0,0,0.6);
  backdrop-filter: blur(20px); -webkit-backdrop-filter: blur(20px); flex-shrink: 0;
}
.gp-title-wrap { display: flex; flex-direction: column; align-items: center; }
.gp-title {
  font-size: 22px; letter-spacing: 0.12em; margin: 0;
  background: linear-gradient(135deg, var(--pink), var(--orange));
  -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text;
}
.gp-target { font-size: 10px; color: var(--text-muted); letter-spacing: 0.1em; }

.gp-body {
  flex: 1; min-height: 0; overflow-y: auto; -webkit-overflow-scrolling: touch;
  overscroll-behavior: contain; padding: 14px; display: flex; flex-direction: column; gap: 14px;
}
.scoreboard { display: flex; flex-wrap: wrap; gap: 8px; }
.score-chip {
  flex: 1 1 auto; min-width: 92px; display: flex; flex-direction: column; align-items: center;
  gap: 2px; padding: 8px 10px; border-radius: 10px; border: 2px solid transparent;
  background: rgba(255,255,255,0.04);
}
.score-chip.active { background: rgba(255,255,255,0.09); }
.sc-name { font-size: 11px; font-weight: 600; color: var(--text-muted); overflow-wrap: anywhere; }
.sc-score { font-size: 20px; }

.turn-banner {
  display: flex; align-items: baseline; justify-content: space-between; gap: 10px;
  padding: 10px 14px; border-radius: 10px; border-left: 4px solid; background: rgba(255,255,255,0.05);
}
.tb-name { font-size: 16px; font-weight: 800; overflow-wrap: anywhere; }
.tb-turn { font-size: 13px; color: var(--text-muted); }
.tb-turn strong { color: var(--gold); font-size: 17px; }

.dice-area { display: flex; flex-direction: column; align-items: center; gap: 14px; padding: 18px 0; }
.die-placeholder { font-size: 82px; opacity: 0.25; line-height: 1; }
.bust-msg { font-size: 34px; color: var(--pink); letter-spacing: 0.08em; margin: 0; }
.last-action { font-size: 18px; color: var(--gold); font-weight: 800; margin: 0; }
.risk-hint { font-size: 13px; color: var(--text-muted); margin: 0; text-align: center; }

.gp-footer {
  flex-shrink: 0; display: flex; gap: 10px; padding: 12px 14px;
  padding-bottom: calc(12px + env(safe-area-inset-bottom));
  border-top: 1px solid rgba(255,255,255,0.08); background: rgba(0,0,0,0.6);
  backdrop-filter: blur(20px); -webkit-backdrop-filter: blur(20px);
}
.gp-footer .btn { flex: 1; min-height: 56px; }
.gp-footer .btn:disabled { opacity: 0.4; }
.wide { width: 100%; }

.overlay {
  position: fixed; inset: 0; z-index: 50; display: flex; align-items: center;
  justify-content: center; padding: 24px; background: rgba(0,0,0,0.82);
  backdrop-filter: blur(6px); -webkit-backdrop-filter: blur(6px);
}
.win-card, .rules-card {
  width: 100%; max-width: 420px; max-height: 82dvh; overflow-y: auto;
  display: flex; flex-direction: column; align-items: center; gap: 12px;
  padding: 26px 22px; border-radius: 16px; text-align: center;
}
.win-label { font-size: 11px; letter-spacing: 0.2em; color: var(--text-muted); }
.win-name { font-size: 32px; margin: 0; overflow-wrap: anywhere; }
.win-score { font-size: 44px; color: var(--gold); margin: 0; }
.rules-title { font-size: 24px; margin: 0; color: var(--gold); }
.rules-list {
  margin: 0; padding-left: 18px; display: flex; flex-direction: column; gap: 8px;
  color: var(--text); font-size: 13.5px; line-height: 1.5; text-align: left;
}
.empty-state {
  height: 100dvh; display: flex; flex-direction: column; align-items: center;
  justify-content: center; gap: 16px; color: var(--text-muted);
}
</style>
