<template>
  <div class="lrc-page">
    <div class="drip-bar" />

    <!-- Header -->
    <div class="lrc-header">
      <button v-ripple class="quit-btn" @click="handleQuit">✕ Quit</button>
      <div class="header-center">
        <span class="round-label">ROUND {{ game?.round ?? 1 }}</span>
      </div>
      <div class="pot-display">
        <span class="pot-label">POT</span>
        <span class="pot-count">{{ game?.centerPot ?? 0 }}</span>
      </div>
    </div>

    <!-- Game area -->
    <div v-if="game" class="game-area">

      <!-- Table felt -->
      <div class="table-felt">
        <div class="center-pot">
          <div class="center-label">CENTER</div>
          <div class="center-count">{{ game.centerPot }}</div>
          <div class="center-chips">
            <span
              v-for="n in Math.min(game.centerPot, 5)"
              :key="n"
              class="center-chip-dot"
            />
            <span v-if="game.centerPot > 5" class="center-chip-extra">+{{ game.centerPot - 5 }}</span>
          </div>
        </div>
      </div>

      <!-- Player seats -->
      <div
        v-for="(player, si) in displayPlayers"
        :key="player.id"
        class="seat"
        :class="{
          'seat-current': si === 0,
          'seat-out': player.chips === 0,
        }"
        :style="getSeatStyle(si, displayPlayers.length)"
      >
        <div
          class="seat-avatar"
          :class="{ 'seat-avatar-current': si === 0 }"
          :style="{
            width: si === 0 ? '72px' : '52px',
            height: si === 0 ? '72px' : '52px',
            background: isPhoto(player.avatarUrl) ? 'transparent' : player.color,
            boxShadow: si === 0 ? `0 0 0 3px ${player.color}, 0 0 18px ${player.color}88` : 'none',
            opacity: player.chips === 0 ? 0.4 : 1,
          }"
        >
          <img v-if="isPhoto(player.avatarUrl)" :src="player.avatarUrl!" class="seat-avatar-img" />
          <span v-else class="seat-avatar-emoji" :style="{ fontSize: si === 0 ? '30px' : '22px' }">{{ player.avatarUrl ?? '?' }}</span>
        </div>
        <div class="seat-name" :class="{ 'seat-name-current': si === 0 }">{{ player.name }}</div>
        <div v-if="player.chips === 0" class="seat-out-label">OUT</div>
        <div v-else class="seat-chips">
          <span
            v-for="n in Math.min(player.chips, 6)"
            :key="n"
            class="chip-dot"
            :class="si === 0 ? 'chip-dot-current' : 'chip-dot-other'"
          />
          <span v-if="player.chips > 6" class="chip-extra" :class="si === 0 ? 'chip-dot-current' : 'chip-dot-other'">+{{ player.chips - 6 }}</span>
        </div>
      </div>

      <!-- Turn indicator -->
      <div
        v-if="game.phase === 'idle' || game.phase === 'rolling'"
        class="turn-indicator"
      >
        {{ currentPlayer?.name }}'s Turn
      </div>

      <!-- Dice row -->
      <div
        v-if="game.phase === 'rolling' || game.phase === 'result'"
        class="dice-row"
      >
        <div
          v-for="(face, i) in game.diceResults"
          :key="i"
          class="die"
          :class="[`die-${game.diceStyle}`, game.phase === 'rolling' ? 'die-rolling' : '']"
          :style="game.phase === 'rolling' ? { animationDelay: `${i * 120}ms` } : {}"
        >
          <span class="die-face" :class="`die-face-${face}-${game.diceStyle}`">{{ face }}</span>
        </div>
      </div>

      <!-- Action result text -->
      <div v-if="game.phase === 'result'" class="action-result">
        {{ game.lastAction }}
      </div>

      <!-- Roll button -->
      <div class="btn-area">
        <div v-if="game.phase === 'idle'" class="roll-wrap">
          <div class="roll-player-name">{{ currentPlayer?.name }}</div>
          <button v-ripple class="roll-btn" @click="lrcStore.rollDice()">ROLL</button>
        </div>
        <button
          v-else-if="game.phase === 'result'"
          v-ripple
          class="next-btn"
          @click="lrcStore.nextTurn()"
        >
          NEXT TURN →
        </button>
      </div>

    </div>

    <!-- Winner overlay -->
    <Transition name="winner-fade">
      <div v-if="game?.phase === 'game_over'" class="winner-overlay">
        <div class="winner-panel">
          <div class="winner-trophy">🏆</div>
          <div
            class="winner-avatar"
            :style="{
              background: isPhoto(winner?.avatarUrl) ? 'transparent' : (winner?.color ?? '#fff'),
            }"
          >
            <img v-if="isPhoto(winner?.avatarUrl)" :src="winner!.avatarUrl!" class="winner-avatar-img" />
            <span v-else class="winner-avatar-emoji">{{ winner?.avatarUrl ?? '?' }}</span>
          </div>
          <div class="winner-label">WINNER!</div>
          <div class="winner-name">{{ winner?.name }}</div>
          <div class="winner-pot">Takes the pot: {{ game?.centerPot }} chips</div>
          <div class="winner-btns">
            <button v-ripple class="btn btn-spray winner-btn" @click="router.push('/lrc/setup')">Play Again</button>
            <button v-ripple class="btn btn-outline winner-btn" @click="router.push('/')">Home</button>
          </div>
        </div>
      </div>
    </Transition>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useLRCStore } from '../stores/lrc'
import { usePlayersStore } from '../stores/players'

const router = useRouter()
const lrcStore = useLRCStore()
const playersStore = usePlayersStore()

const game = computed(() => lrcStore.game)

onMounted(() => {
  if (!lrcStore.game) {
    router.push('/lrc/setup')
  }
})

const SEAT_POS: Record<number, Array<[number, number]>> = {
  3:  [[50,85],[9,20],[91,20]],
  4:  [[50,85],[6,44],[50,7],[94,44]],
  5:  [[50,85],[7,62],[13,18],[87,18],[93,62]],
  6:  [[50,85],[6,58],[9,20],[50,7],[91,20],[94,58]],
  7:  [[50,85],[8,66],[4,36],[18,8],[82,8],[96,36],[92,66]],
  8:  [[50,85],[18,76],[4,46],[14,14],[50,4],[86,14],[96,46],[82,76]],
}

function getSeatStyle(i: number, total: number) {
  const pos = SEAT_POS[total] ?? SEAT_POS[8]!
  const [x, y] = pos[i] ?? [50, 50]
  return { left: `${x}%`, top: `${y}%`, transform: 'translate(-50%, -50%)' }
}

const displayPlayers = computed(() => {
  if (!lrcStore.game) return []
  const { players, currentPlayerIndex: ci } = lrcStore.game
  return [...players.slice(ci), ...players.slice(0, ci)]
})

const currentPlayer = computed(() => {
  if (!lrcStore.game) return null
  return lrcStore.game.players[lrcStore.game.currentPlayerIndex] ?? null
})

const winner = computed(() => {
  if (!lrcStore.game?.winnerId) return null
  return lrcStore.game.players.find(p => p.id === lrcStore.game!.winnerId) ?? null
})

function isPhoto(url: string | null | undefined): boolean {
  return !!(url?.startsWith('data:') || url?.startsWith('http'))
}

function handleQuit() {
  if (confirm('Quit game?')) {
    lrcStore.endGame()
    router.push('/')
  }
}

// Update stats when game is over — watch once
const statsUpdated = ref(false)
watch(
  () => lrcStore.game?.phase,
  (phase) => {
    if (phase !== 'game_over' || statsUpdated.value) return
    statsUpdated.value = true
    const g = lrcStore.game
    if (!g) return
    g.players.forEach(p => {
      if (p.isGuest) return
      const stored = playersStore.players.find(sp => sp.id === p.id)
      if (!stored) return
      if (p.id === g.winnerId) {
        playersStore.updatePlayer(p.id, {
          wins: stored.wins + 1,
          gamesPlayed: stored.gamesPlayed + 1,
        })
      } else {
        playersStore.updatePlayer(p.id, {
          gamesPlayed: stored.gamesPlayed + 1,
        })
      }
    })
  }
)
</script>

<style scoped>
.lrc-page {
  width: 100vw;
  height: 100dvh;
  background: #08080f;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  position: relative;
}

.drip-bar {
  width: 100%;
  height: 4px;
  background: linear-gradient(90deg, var(--pink) 0%, var(--purple) 50%, var(--blue) 100%);
  flex-shrink: 0;
}

/* Header */
.lrc-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 16px;
  border-bottom: 1px solid rgba(255,255,255,0.07);
  flex-shrink: 0;
  height: 48px;
  gap: 12px;
}
.quit-btn {
  background: rgba(255,255,255,0.06);
  border: 1px solid rgba(255,255,255,0.12);
  border-radius: 8px;
  color: rgba(255,255,255,0.55);
  font-size: 13px;
  font-weight: 700;
  padding: 6px 12px;
  cursor: pointer;
  transition: all 0.15s;
  position: relative;
  overflow: hidden;
}
.quit-btn:hover { color: #fff; border-color: rgba(255,255,255,0.3); }
.header-center { flex: 1; text-align: center; }
.round-label {
  font-size: 12px;
  font-weight: 800;
  letter-spacing: 0.15em;
  text-transform: uppercase;
  color: rgba(255,255,255,0.45);
  font-family: var(--font-display);
}
.pot-display {
  display: flex;
  align-items: center;
  gap: 6px;
  background: rgba(255,215,0,0.08);
  border: 1px solid rgba(255,215,0,0.2);
  border-radius: 8px;
  padding: 4px 12px;
}
.pot-label {
  font-size: 10px;
  font-weight: 800;
  letter-spacing: 0.12em;
  color: rgba(255,215,0,0.6);
}
.pot-count {
  font-size: 18px;
  font-weight: 900;
  font-family: var(--font-display);
  color: #ffd700;
}

/* Game area */
.game-area {
  flex: 1;
  position: relative;
  overflow: hidden;
}

/* Table felt */
.table-felt {
  position: absolute;
  left: 8%;
  top: 6%;
  width: 84%;
  height: 55%;
  border-radius: 50%;
  background: radial-gradient(ellipse, #1a5f2a 0%, #0f3d1a 60%, #0a2e14 100%);
  box-shadow: 0 0 60px rgba(0,0,0,0.7), inset 0 0 40px rgba(0,0,0,0.4), 0 0 0 6px rgba(255,255,255,0.06);
  display: flex;
  align-items: center;
  justify-content: center;
}
.table-felt::after {
  content: '';
  position: absolute;
  inset: 12px;
  border-radius: 50%;
  border: 2px solid rgba(255,255,255,0.07);
  pointer-events: none;
}

/* Center pot */
.center-pot {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
}
.center-label {
  font-size: 10px;
  font-weight: 900;
  letter-spacing: 0.2em;
  color: rgba(255,215,0,0.6);
  text-transform: uppercase;
}
.center-count {
  font-size: 32px;
  font-weight: 900;
  font-family: var(--font-display);
  color: #ffd700;
  line-height: 1;
  text-shadow: 0 0 20px rgba(255,215,0,0.5);
}
.center-chips {
  display: flex;
  align-items: center;
  gap: 4px;
  flex-wrap: wrap;
  justify-content: center;
  max-width: 80px;
}
.center-chip-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #ffd700;
  box-shadow: 0 0 6px rgba(255,215,0,0.6);
}
.center-chip-extra {
  font-size: 10px;
  font-weight: 800;
  color: #ffd700;
}

/* Seat */
.seat {
  position: absolute;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  pointer-events: none;
}
.seat-avatar {
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  flex-shrink: 0;
  transition: opacity 0.3s;
}
.seat-avatar-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}
.seat-avatar-emoji {
  line-height: 1;
}
.seat-name {
  font-size: 11px;
  font-weight: 700;
  color: rgba(255,255,255,0.7);
  white-space: nowrap;
  max-width: 80px;
  overflow: hidden;
  text-overflow: ellipsis;
  text-align: center;
}
.seat-name-current {
  font-size: 13px;
  font-weight: 900;
  color: #fff;
}
.seat-out-label {
  font-size: 9px;
  font-weight: 900;
  letter-spacing: 0.1em;
  color: rgba(255,255,255,0.3);
}
.seat-chips {
  display: flex;
  flex-wrap: wrap;
  gap: 3px;
  justify-content: center;
  max-width: 56px;
}
.chip-dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
}
.chip-dot-current {
  background: #ffd700;
  box-shadow: 0 0 6px rgba(255,215,0,0.7);
}
.chip-dot-other {
  background: #c8a84b;
  box-shadow: 0 0 3px rgba(200,168,75,0.4);
}
.chip-extra {
  font-size: 9px;
  font-weight: 800;
}

/* Turn indicator */
.turn-indicator {
  position: absolute;
  top: 61%;
  left: 50%;
  transform: translateX(-50%);
  font-size: 14px;
  font-weight: 800;
  letter-spacing: 0.08em;
  color: rgba(255,255,255,0.55);
  font-family: var(--font-display);
  white-space: nowrap;
  text-align: center;
}

/* Dice row */
.dice-row {
  position: absolute;
  top: 64%;
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  gap: 12px;
  align-items: center;
}

.die {
  width: 76px;
  height: 76px;
  border-radius: 14px;
  display: flex;
  align-items: center;
  justify-content: center;
}

/* Neon style */
.die-neon {
  background: linear-gradient(145deg, #1e2060, #0d0d2e);
  border: 2px solid rgba(255,255,255,0.15);
  box-shadow: 4px 4px 12px rgba(0,0,0,0.7), inset 1px 1px 0 rgba(255,255,255,0.08);
}
.die-face-L-neon { color: #00d4ff; text-shadow: 0 0 14px #00d4ff; }
.die-face-R-neon { color: #ff2d78; text-shadow: 0 0 14px #ff2d78; }
.die-face-C-neon { color: #ffd700; text-shadow: 0 0 14px #ffd700; }
.die-face-●-neon { color: rgba(255,255,255,0.9); font-size: 28px !important; }

/* Casino style */
.die-casino {
  background: #f8f4e8;
  border: 2px solid #222;
  box-shadow: 3px 3px 6px rgba(0,0,0,0.5);
}
.die-face-L-casino { color: #111; }
.die-face-R-casino { color: #111; }
.die-face-C-casino { color: #cc0000; }
.die-face-●-casino { color: #111; font-size: 28px !important; }

/* Retro style */
.die-retro {
  background: linear-gradient(145deg, #d4b896, #c9a87c);
  border: 2px solid #7a4e2d;
  box-shadow: 3px 3px 8px rgba(0,0,0,0.5);
}
.die-face-L-retro { color: #2c1810; }
.die-face-R-retro { color: #2c1810; }
.die-face-C-retro { color: #8b1a1a; }
.die-face-●-retro { color: #2c1810; font-size: 28px !important; }

/* Wood style */
.die-wood {
  background: linear-gradient(145deg, #9b6b3a, #6b4226);
  border: 2px solid #3d1f0a;
  box-shadow: 4px 4px 12px rgba(0,0,0,0.6), 0 0 10px rgba(180,100,30,0.25);
}
.die-face-L-wood { color: #ffe4b5; }
.die-face-R-wood { color: #ffe4b5; }
.die-face-C-wood { color: #ff9944; }
.die-face-●-wood { color: #ffe4b5; font-size: 28px !important; }

.die-face {
  font-size: 32px;
  font-weight: 900;
  font-family: var(--font-display);
  line-height: 1;
  user-select: none;
}

/* Rolling animation */
.die-rolling {
  animation: tumble 1.1s ease-in-out forwards;
}
@keyframes tumble {
  0%   { transform: rotate(0deg) scale(1) translateY(0); }
  25%  { transform: rotate(-30deg) scale(0.85) translateY(-6px); }
  50%  { transform: rotate(40deg) scale(1.1) translateY(-10px); }
  75%  { transform: rotate(-15deg) scale(0.95) translateY(-3px); }
  100% { transform: rotate(0deg) scale(1) translateY(0); }
}

/* Action result */
.action-result {
  position: absolute;
  top: 57%;
  left: 50%;
  transform: translateX(-50%);
  font-size: 13px;
  font-weight: 700;
  color: rgba(255,255,255,0.7);
  white-space: nowrap;
  text-align: center;
  max-width: 90vw;
  overflow: hidden;
  text-overflow: ellipsis;
}

/* Button area */
.btn-area {
  position: absolute;
  bottom: 4%;
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
}
.roll-wrap {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
}
.roll-player-name {
  font-size: 12px;
  font-weight: 700;
  color: rgba(255,255,255,0.45);
  letter-spacing: 0.06em;
  text-align: center;
}
.roll-btn {
  height: 60px;
  min-width: 200px;
  font-size: 22px;
  font-weight: 900;
  font-family: var(--font-display);
  letter-spacing: 0.15em;
  border: none;
  border-radius: 14px;
  cursor: pointer;
  background: linear-gradient(135deg, var(--pink) 0%, var(--purple) 100%);
  color: #fff;
  box-shadow: 0 0 28px rgba(255,45,120,0.4), 0 4px 16px rgba(0,0,0,0.5);
  transition: all 0.15s;
  position: relative;
  overflow: hidden;
}
.roll-btn:hover {
  box-shadow: 0 0 48px rgba(255,45,120,0.6), 0 4px 20px rgba(0,0,0,0.5);
  transform: translateY(-1px);
}
.next-btn {
  height: 60px;
  min-width: 200px;
  font-size: 22px;
  font-weight: 900;
  font-family: var(--font-display);
  letter-spacing: 0.1em;
  border: 2px solid rgba(255,255,255,0.3);
  border-radius: 14px;
  cursor: pointer;
  background: rgba(255,255,255,0.08);
  color: #fff;
  box-shadow: 0 4px 16px rgba(0,0,0,0.4);
  transition: all 0.15s;
  position: relative;
  overflow: hidden;
}
.next-btn:hover {
  background: rgba(255,255,255,0.14);
  border-color: rgba(255,255,255,0.5);
}

/* Winner overlay */
.winner-overlay {
  position: fixed;
  inset: 0;
  z-index: 500;
  background: rgba(0,0,0,0.85);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
}
.winner-panel {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
  background: #111;
  border: 1px solid rgba(255,215,0,0.3);
  border-radius: 20px;
  padding: 40px 48px;
  max-width: 360px;
  width: 100%;
  box-shadow: 0 0 60px rgba(255,215,0,0.15);
}
.winner-trophy {
  font-size: 64px;
  line-height: 1;
}
.winner-avatar {
  width: 100px;
  height: 100px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  box-shadow: 0 0 0 4px rgba(255,215,0,0.5), 0 0 30px rgba(255,215,0,0.3);
}
.winner-avatar-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}
.winner-avatar-emoji {
  font-size: 44px;
  line-height: 1;
}
.winner-label {
  font-size: 36px;
  font-weight: 900;
  font-family: var(--font-display);
  letter-spacing: 0.15em;
  color: #ffd700;
  text-shadow: 0 0 30px rgba(255,215,0,0.6);
}
.winner-name {
  font-size: 28px;
  font-weight: 900;
  color: #fff;
  text-align: center;
}
.winner-pot {
  font-size: 14px;
  color: rgba(255,255,255,0.5);
  font-weight: 600;
}
.winner-btns {
  display: flex;
  gap: 12px;
  margin-top: 8px;
}
.winner-btn {
  font-size: 15px;
  padding: 12px 24px;
  position: relative;
  overflow: hidden;
}

.winner-fade-enter-active, .winner-fade-leave-active { transition: opacity 0.35s; }
.winner-fade-enter-from, .winner-fade-leave-to { opacity: 0; }
</style>
